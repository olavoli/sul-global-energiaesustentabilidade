import type { EntityMemory } from "../scientific-memory/contracts";
import { hash } from "../scientific-memory/identity";
import type { StorageAdapter } from "../newsroom/storage/contracts";
import { storageAdapter } from "../newsroom/storage/runtime";
import { auditTrend } from "./audit";
import { trendChecksum } from "./checksum";
import type { TrendSignal } from "./contracts";
import { trendPolicy } from "./policy";
import { buildTrendSignal } from "./signal";
import { loadTrendState, saveTrendState } from "./store";

export interface TrendPlan {
  mode: "rebuild" | "incremental";
  dryRun: boolean;
  changed: boolean;
  signals: TrendSignal[];
  processed: number;
  affected: number;
  eligible: number;
  insufficient: number;
  checksum: string;
  durationMs: number;
}
export async function planTrends(
  memories: EntityMemory[],
  input: {
    mode?: "rebuild" | "incremental";
    apply?: boolean;
    actor?: string;
    adapter?: StorageAdapter;
  } = {},
): Promise<TrendPlan> {
  const started = performance.now();
  const mode = input.mode ?? "incremental";
  const adapter = input.adapter ?? storageAdapter();
  const current = await loadTrendState(adapter);
  const totalsByType = new Map<string, number>();
  for (const memory of memories)
    totalsByType.set(memory.type, (totalsByType.get(memory.type) ?? 0) + memory.articleCount);
  const existing = new Map(current.signals.map((signal) => [signal.entityId, signal]));
  const directlyChanged = memories.filter((memory) => {
    const signal = existing.get(memory.canonicalId);
    return (
      !signal ||
      signal.calculatedAt !== memory.updatedAt ||
      signal.policyVersion !== trendPolicy.version
    );
  });
  const affectedTypes = new Set(directlyChanged.map(({ type }) => type));
  const changed =
    mode === "rebuild" ? memories : memories.filter(({ type }) => affectedTypes.has(type));
  const replacements = new Map(
    changed.map((memory) => [
      memory.canonicalId,
      buildTrendSignal(memory, totalsByType.get(memory.type) ?? 0),
    ]),
  );
  const signals = memories
    .map(
      (memory) =>
        replacements.get(memory.canonicalId) ??
        existing.get(memory.canonicalId) ??
        buildTrendSignal(memory, totalsByType.get(memory.type) ?? 0),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  const checksum = trendChecksum(signals);
  const completedAt =
    signals
      .map(({ calculatedAt }) => calculatedAt)
      .sort()
      .at(-1) ?? new Date(0).toISOString();
  const changedState =
    mode === "rebuild" || changed.length > 0 || checksum !== current.metadata.checksum;
  if (input.apply && changedState) {
    const actor = input.actor?.trim();
    if (!actor) throw new Error("Ator é obrigatório para aplicar sinais.");
    const runId = `trend-run-${hash(`${mode}:${checksum}`).slice(0, 16)}`;
    await auditTrend(adapter, {
      action: "trend.run.started",
      actor,
      at: completedAt,
      entityId: runId,
    });
    await auditTrend(adapter, {
      action: "trend.policy.loaded",
      actor,
      at: completedAt,
      entityId: `policy-${trendPolicy.version}`,
      after: { policyVersion: trendPolicy.version },
    });
    await saveTrendState({
      signals,
      checksum,
      policy: trendPolicy as unknown as Record<string, unknown>,
      adapter,
      run: {
        id: runId,
        mode,
        dryRun: false,
        signals: signals.length,
        checksum,
        startedAt: completedAt,
        completedAt,
      },
    });
    for (const signal of replacements.values())
      await auditTrend(adapter, {
        action: existing.has(signal.entityId) ? "trend.signal.updated" : "trend.signal.created",
        actor,
        at: completedAt,
        entityId: signal.id,
        after: { status: signal.status, confidence: signal.confidence, checksum },
      });
    if (mode === "rebuild")
      await auditTrend(adapter, {
        action: "trend.rebuilt",
        actor,
        at: completedAt,
        entityId: runId,
        after: { checksum },
      });
    await auditTrend(adapter, {
      action: "trend.run.completed",
      actor,
      at: completedAt,
      entityId: runId,
      after: { checksum, signals: signals.length },
    });
  }
  return {
    mode,
    dryRun: !input.apply,
    changed: changedState,
    signals,
    processed: memories.length,
    affected: changed.length,
    eligible: signals.filter(({ status }) => status !== "insufficient-data").length,
    insufficient: signals.filter(({ status }) => status === "insufficient-data").length,
    checksum,
    durationMs: Number((performance.now() - started).toFixed(2)),
  };
}
