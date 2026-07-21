import { prepareSourceDisable, loadCatalog, saveCatalog } from "../../../scripts/newsroom/catalog";
import { loadAutomationPolicy } from "../../../scripts/newsroom/automation-config";
import { applyHumanDecision } from "../../../scripts/newsroom/decision-actions";
import {
  loadDecisions,
  loadPitches,
  saveDecisions,
  savePitches,
} from "../../../scripts/newsroom/decision-store";
import { executeDailyPipeline } from "../../../scripts/newsroom/daily-pipeline";
import { checkSourceHealth, runtimeAfterHealth } from "../../../scripts/newsroom/health";
import type { HumanAction } from "../../../scripts/newsroom/orchestrator-schema";
import { createPitch } from "../../../scripts/newsroom/pitch";
import {
  loadQuarantine,
  saveQuarantine,
  updateQuarantine,
} from "../../../scripts/newsroom/quarantine";
import { loadInbox, saveInbox, updateInboxEntry } from "../../../scripts/newsroom/review-inbox";
import { emptyCircuit, loadCircuits, saveCircuits } from "../../../scripts/newsroom/retry-circuit";
import { buildCleanupPlan } from "../../../scripts/newsroom/retention";
import { finishRun, loadRuns, saveRuns } from "../../../scripts/newsroom/run-store";
import {
  loadRuntime,
  replaceRuntime,
  runtimeFor,
  saveRuntime,
} from "../../../scripts/newsroom/runtime";
import { loadClusters, loadEvidencePackages } from "../../../scripts/newsroom/story-store";
import {
  loadTranslations,
  reviewTranslation,
  saveTranslations,
} from "../../../scripts/newsroom/translation";
import type { AdminAction } from "./contracts";
import { storageAdapter } from "../../../scripts/newsroom/storage/runtime";
import { reportEvent } from "../observability";
import {
  applyRadarHumanAction,
  radarHumanActions,
  type RadarHumanAction,
} from "../../../scripts/scientific-radar/actions";
import { reviewGraphRelation } from "../../../scripts/scientific-graph/review";
import { reviewDuplicateCandidate } from "../../../scripts/entity-resolution/review";

function required(value: string | undefined, label: string): string {
  if (!value?.trim()) throw new Error(`${label} é obrigatório.`);
  return value.trim();
}

function auditSummary(value: unknown): unknown {
  if (!value || typeof value !== "object") return { result: typeof value };
  const record = value as Record<string, unknown>;
  return {
    id: typeof record.id === "string" ? record.id : undefined,
    status:
      typeof record.status === "string"
        ? record.status
        : typeof record.state === "string"
          ? record.state
          : undefined,
    sourceId: typeof record.sourceId === "string" ? record.sourceId : undefined,
  };
}

async function performAdminAction(input: AdminAction): Promise<unknown> {
  const now = new Date().toISOString();
  if (input.action.startsWith("entity-resolution:")) {
    const status = input.action.slice(18) as "accepted" | "ignored";
    if (!["accepted", "ignored"].includes(status))
      throw new Error("Ação de identidade não permitida.");
    return reviewDuplicateCandidate({
      id: required(input.id, "Possível duplicata"),
      status,
      actor: input.actor,
      note: required(input.note, "Nota"),
      now: new Date(now),
    });
  }
  if (input.action.startsWith("graph:")) {
    const status = input.action.slice(6) as "accepted" | "rejected" | "needs-context";
    if (!["accepted", "rejected", "needs-context"].includes(status))
      throw new Error("Ação de grafo não permitida.");
    return reviewGraphRelation({
      relationId: required(input.id, "Relação"),
      status,
      actor: input.actor,
      note: required(input.note, "Nota"),
      now: new Date(now),
    });
  }
  if (input.action.startsWith("radar:")) {
    if (!radarHumanActions.includes(input.action as RadarHumanAction))
      throw new Error("Ação do Radar Científico não permitida.");
    return applyRadarHumanAction({
      action: input.action as RadarHumanAction,
      id: required(input.id, "Publicação"),
      actor: input.actor,
      note: required(input.note, "Nota"),
      confirmed: input.values.confirmed === "true",
      now: new Date(now),
    });
  }
  if (input.action.startsWith("inbox:")) {
    const entries = await loadInbox();
    const index = entries.findIndex(({ id }) => id === input.id);
    if (index < 0) throw new Error("Entrada não encontrada.");
    const status = input.action.slice(6) as "opened" | "deferred" | "resolved" | "dismissed";
    entries[index] = updateInboxEntry(entries[index], status, input.actor, input.note, now);
    await saveInbox(entries);
    return entries[index];
  }
  if (input.action.startsWith("decision:")) {
    const decisions = await loadDecisions();
    const index = decisions.findIndex(({ id }) => id === input.id);
    if (index < 0) throw new Error("Decisão não encontrada.");
    const action = input.action.slice(9) as HumanAction;
    decisions[index] = applyHumanDecision(
      decisions[index],
      action,
      input.actor,
      required(input.note, "Nota"),
      now,
    );
    await saveDecisions(decisions, decisions[index].policyVersion);
    return decisions[index];
  }
  if (input.action.startsWith("translation:")) {
    const entries = await loadTranslations();
    const index = entries.findIndex(({ id }) => id === input.id);
    if (index < 0) throw new Error("Tradução não encontrada.");
    const decision = input.action.slice(12) as "approve" | "reject" | "retry";
    entries[index] = reviewTranslation(
      entries[index],
      decision,
      input.actor,
      required(input.note, "Nota"),
      now,
    );
    await saveTranslations(entries);
    return entries[index];
  }
  if (input.action === "source:disable") {
    const catalog = await loadCatalog();
    const next = prepareSourceDisable(required(input.id, "Fonte"), catalog);
    await saveCatalog(next);
    return { sourceId: input.id, active: false };
  }
  if (input.action === "source:health") {
    const sourceId = required(input.id, "Fonte");
    const catalog = await loadCatalog();
    const source = catalog.find(({ id }) => id === sourceId);
    if (!source) throw new Error("Fonte não encontrada.");
    const runtimes = await loadRuntime();
    const health = await checkSourceHealth(source, runtimeFor(sourceId, runtimes));
    await saveRuntime(
      replaceRuntime(runtimes, runtimeAfterHealth(runtimeFor(sourceId, runtimes), health)),
    );
    return health;
  }
  if (input.action === "circuit:reset") {
    const sourceId = required(input.id, "Fonte");
    const circuits = await loadCircuits();
    const previous = circuits.find(({ sourceId: value }) => value === sourceId);
    const reset = {
      ...emptyCircuit(sourceId),
      history: [
        ...(previous?.history ?? []),
        {
          action: "circuit-reset",
          at: now,
          actor: input.actor,
          notes: required(input.note, "Nota"),
        },
      ],
    };
    await saveCircuits([...circuits.filter(({ sourceId: value }) => value !== sourceId), reset]);
    return reset;
  }
  if (input.action.startsWith("quarantine:")) {
    const entries = await loadQuarantine();
    const operation = input.action.endsWith("retry") ? "retry" : "discard";
    const next = updateQuarantine(entries, required(input.id, "Entrada"), operation);
    await saveQuarantine(next);
    return next.find(({ id }) => id === input.id);
  }
  if (input.action === "run:cleanup") {
    const [runs, inbox, decisions] = await Promise.all([loadRuns(), loadInbox(), loadDecisions()]);
    const policy = await loadAutomationPolicy();
    return buildCleanupPlan(runs, inbox, decisions, {
      now: new Date(),
      runsDays: policy.retention.runsDays,
      resolvedInboxDays: policy.retention.resolvedInboxDays,
    });
  }
  if (input.action === "run:cancel") {
    const runs = await loadRuns();
    const index = runs.findIndex(({ id }) => id === input.id);
    if (index < 0) throw new Error("Execução não encontrada.");
    runs[index] = finishRun(runs[index], "cancelled", new Date(), required(input.note, "Nota"));
    await saveRuns(runs);
    return runs[index];
  }
  if (input.action.startsWith("pipeline:")) {
    const mode = input.action.slice(9);
    if (!["validate-only", "process-existing", "report-only", "dry-run"].includes(mode))
      throw new Error("Apply completo está bloqueado na interface.");
    return executeDailyPipeline({
      mode: mode as "validate-only" | "process-existing" | "report-only" | "dry-run",
      actor: input.actor,
      apply: false,
      environment: "editorial-console",
    });
  }
  if (input.action === "pitch:create") {
    const decision = (await loadDecisions()).find(({ id }) => id === input.id);
    if (!decision) throw new Error("Decisão não encontrada.");
    const [clusters, packages, translations, pitches] = await Promise.all([
      loadClusters(),
      loadEvidencePackages(),
      loadTranslations(),
      loadPitches(),
    ]);
    const cluster = clusters.find(({ id }) => id === decision.clusterId);
    const evidence = packages.find(({ clusterId }) => clusterId === decision.clusterId);
    if (!cluster || !evidence) throw new Error("Cluster ou evidência ausente.");
    const pitch = createPitch(decision, cluster, evidence, translations, input.actor, now);
    if (pitches.some(({ id }) => id === pitch.id)) throw new Error("Pauta já existe.");
    await savePitches([...pitches, pitch]);
    return pitch;
  }
  throw new Error("Ação não permitida pela Central Editorial.");
}

export async function executeAdminAction(input: AdminAction): Promise<unknown> {
  const startedAt = new Date().toISOString();
  const adapter = storageAdapter();
  const lockKey = `admin/${input.action.split(":")[0]}/${input.id ?? "global"}`;
  const owner = `${input.actor}:${input.requestId ?? crypto.randomUUID()}`;
  let locked = false;
  try {
    await adapter.acquireLock({
      key: lockKey,
      owner,
      runId: input.requestId ?? owner,
      acquiredAt: startedAt,
      heartbeatAt: startedAt,
      expiresAt: new Date(Date.parse(startedAt) + 30_000).toISOString(),
    });
    locked = true;
    reportEvent("admin.lock.acquired", {
      action: input.action,
      requestId: input.requestId,
      storageDriver: adapter.driver,
    });
    const result = await performAdminAction(input);
    await adapter.appendAudit({
      id: crypto.randomUUID(),
      timestamp: startedAt,
      actor: input.actor,
      action: input.action,
      entity: input.action.split(":")[0],
      entityId: input.id ?? "global",
      reason: input.note || undefined,
      origin: "editorial-console",
      requestId: input.requestId,
      success: true,
      version: input.expectedVersion ?? 0,
      after: auditSummary(result),
    });
    return result;
  } catch (error) {
    await adapter.appendAudit({
      id: crypto.randomUUID(),
      timestamp: startedAt,
      actor: input.actor,
      action: input.action,
      entity: input.action.split(":")[0],
      entityId: input.id ?? "global",
      reason: input.note || undefined,
      origin: "editorial-console",
      requestId: input.requestId,
      success: false,
      version: input.expectedVersion ?? 0,
      after: { error: error instanceof Error ? error.name : "Error" },
    });
    throw error;
  } finally {
    if (locked) {
      await adapter.releaseLock(lockKey, owner);
      reportEvent("admin.lock.released", {
        action: input.action,
        requestId: input.requestId,
        storageDriver: adapter.driver,
      });
    }
  }
}
