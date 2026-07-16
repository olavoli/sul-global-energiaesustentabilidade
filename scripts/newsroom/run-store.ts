import { createHash } from "node:crypto";
import { resolve } from "node:path";

import { loadDocument, saveDocument } from "./atomic-store";
import {
  newsroomRunSchema,
  runDocumentSchema,
  stageNames,
  type NewsroomRun,
  type RunMode,
  type StageName,
  type StageResult,
} from "./automation-schema";

const RUNS_PATH = resolve("newsroom/runs/index.json");

export function createRun(input: {
  runType?: NewsroomRun["runType"];
  mode: RunMode;
  environment: string;
  actor: string;
  now: Date;
  configurationVersion: string;
  policyVersion: string;
  sourceIds?: string[];
  recoveryOfRunId?: string;
}): NewsroomRun {
  const startedAt = input.now.toISOString();
  const id = `run-${createHash("sha256")
    .update(`${input.runType ?? "manual"}|${input.mode}|${startedAt}|${input.actor}`)
    .digest("hex")
    .slice(0, 16)}`;
  return newsroomRunSchema.parse({
    id,
    runType: input.runType ?? "manual",
    mode: input.mode,
    environment: input.environment,
    startedAt,
    status: "pending",
    actor: input.actor,
    dryRun: input.mode !== "apply" && input.mode !== "recovery",
    configurationVersion: input.configurationVersion,
    policyVersion: input.policyVersion,
    sourceIds: input.sourceIds ?? [],
    stages: [],
    itemsFetched: 0,
    itemsAccepted: 0,
    itemsRejected: 0,
    duplicates: 0,
    quarantined: 0,
    clustersCreated: 0,
    clustersUpdated: 0,
    translationsQueued: 0,
    decisionsCreated: 0,
    decisionsUpdated: 0,
    humanReviewsPending: 0,
    errors: [],
    warnings: [],
    durationMs: 0,
    recoveryOfRunId: input.recoveryOfRunId,
    checkpoints: [],
  });
}

export function emptyStage(name: StageName): StageResult {
  return {
    name,
    status: "pending",
    durationMs: 0,
    input: {},
    output: {},
    warnings: [],
    errors: [],
    retryStrategy: ["source-health", "collection"].includes(name)
      ? "Somente falhas transitÃ³rias; no mÃ¡ximo dois retries."
      : "Sem retry automÃ¡tico.",
    interruptionPolicy: ["daily-report", "notification", "cleanup", "lock-release"].includes(name)
      ? "Continuar com aviso quando seguro."
      : "Interromper preservando checkpoint anterior.",
  };
}

export function initializeStages(run: NewsroomRun): NewsroomRun {
  return { ...run, stages: stageNames.map(emptyStage) };
}

export function updateStage(run: NewsroomRun, stage: StageResult, checkpoint = false): NewsroomRun {
  const stages = run.stages.map((candidate) => (candidate.name === stage.name ? stage : candidate));
  return newsroomRunSchema.parse({
    ...run,
    stages,
    currentStage: stage.status === "running" ? stage.name : undefined,
    checkpoints:
      checkpoint && stage.finishedAt
        ? [
            ...run.checkpoints.filter(({ stage: name }) => name !== stage.name),
            { stage: stage.name, at: stage.finishedAt },
          ]
        : run.checkpoints,
  });
}

export async function loadRuns(): Promise<NewsroomRun[]> {
  return (await loadDocument(RUNS_PATH, runDocumentSchema, { version: 1, runs: [] })).runs;
}

export async function saveRuns(runs: NewsroomRun[]): Promise<void> {
  await saveDocument(RUNS_PATH, runDocumentSchema, { version: 1, runs });
}

export function upsertRun(runs: NewsroomRun[], run: NewsroomRun): NewsroomRun[] {
  const index = runs.findIndex(({ id }) => id === run.id);
  return index < 0 ? [...runs, run] : runs.map((entry) => (entry.id === run.id ? run : entry));
}

export function finishRun(
  run: NewsroomRun,
  status: NewsroomRun["status"],
  now = new Date(),
  stopReason?: string,
): NewsroomRun {
  return newsroomRunSchema.parse({
    ...run,
    status,
    finishedAt: now.toISOString(),
    currentStage: undefined,
    durationMs: Math.max(0, now.valueOf() - new Date(run.startedAt).valueOf()),
    stopReason,
  });
}

export function resumableStage(run: NewsroomRun): StageName | undefined {
  const complete = new Set(run.checkpoints.map(({ stage }) => stage));
  return stageNames.find((stage) => !complete.has(stage));
}
