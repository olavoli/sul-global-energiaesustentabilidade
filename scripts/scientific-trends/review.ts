import type { StorageAdapter } from "../newsroom/storage/contracts";
import { storageAdapter } from "../newsroom/storage/runtime";
import { auditTrend } from "./audit";
import { trendChecksum } from "./checksum";
import { loadTrendState, saveTrendState } from "./store";
import { trendPolicy } from "./policy";
import { hash } from "../scientific-memory/identity";

const actions = ["reviewed", "more-data-requested", "archived", "watched"] as const;
export async function reviewTrend(input: {
  id: string;
  action: (typeof actions)[number];
  actor: string;
  note: string;
  now: Date;
  adapter?: StorageAdapter;
}) {
  if (!actions.includes(input.action)) throw new Error("Ação de revisão inválida.");
  if (!input.actor.trim() || !input.note.trim()) throw new Error("Ator e nota são obrigatórios.");
  const adapter = input.adapter ?? storageAdapter();
  const state = await loadTrendState(adapter);
  const index = state.signals.findIndex(({ id }) => id === input.id);
  if (index < 0) throw new Error("Sinal não encontrado.");
  const signals = structuredClone(state.signals);
  signals[index].history.push({
    action: input.action,
    actor: input.actor.trim(),
    note: input.note.trim(),
    at: input.now.toISOString(),
  });
  const checksum = trendChecksum(signals);
  const at = input.now.toISOString();
  await saveTrendState({
    signals,
    checksum,
    policy: trendPolicy as unknown as Record<string, unknown>,
    adapter,
    run: {
      id: `trend-run-${hash(`review:${input.id}:${at}`).slice(0, 16)}`,
      mode: "incremental",
      dryRun: false,
      signals: signals.length,
      checksum,
      startedAt: at,
      completedAt: at,
    },
  });
  await auditTrend(adapter, {
    action: "trend.signal.reviewed",
    actor: input.actor,
    at,
    entityId: input.id,
    after: { action: input.action },
  });
  return signals[index];
}
