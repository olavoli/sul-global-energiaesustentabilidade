import { z } from "zod";

export const runTypes = ["manual", "scheduled", "recovery", "validation"] as const;
export const runStatuses = [
  "pending",
  "running",
  "completed",
  "completed-with-warnings",
  "failed",
  "cancelled",
  "interrupted",
  "skipped",
] as const;
export const runModes = [
  "dry-run",
  "apply",
  "validate-only",
  "collect-only",
  "process-existing",
  "report-only",
  "recovery",
] as const;
export const stageNames = [
  "environment-check",
  "configuration-check",
  "lock-acquisition",
  "source-health",
  "collection",
  "normalization",
  "deduplication",
  "classification",
  "scoring",
  "clustering",
  "evidence-packages",
  "translation-queue",
  "orchestration",
  "daily-report",
  "notification",
  "cleanup",
  "lock-release",
] as const;

export const stageResultSchema = z.object({
  name: z.enum(stageNames),
  status: z.enum(["pending", "running", "completed", "skipped", "failed", "interrupted"]),
  startedAt: z.iso.datetime().optional(),
  finishedAt: z.iso.datetime().optional(),
  durationMs: z.number().nonnegative(),
  input: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  output: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  warnings: z.array(z.string()),
  errors: z.array(z.string()),
  retryStrategy: z.string(),
  interruptionPolicy: z.string(),
});

export const newsroomRunSchema = z.object({
  id: z.string().regex(/^run-[a-f0-9]{16}$/),
  runType: z.enum(runTypes),
  mode: z.enum(runModes),
  environment: z.string().min(1),
  startedAt: z.iso.datetime(),
  finishedAt: z.iso.datetime().optional(),
  status: z.enum(runStatuses),
  actor: z.string().min(1),
  dryRun: z.boolean(),
  configurationVersion: z.string().min(1),
  policyVersion: z.string().min(1),
  sourceIds: z.array(z.string()),
  stages: z.array(stageResultSchema),
  currentStage: z.enum(stageNames).optional(),
  itemsFetched: z.number().int().nonnegative(),
  itemsAccepted: z.number().int().nonnegative(),
  itemsRejected: z.number().int().nonnegative(),
  duplicates: z.number().int().nonnegative(),
  quarantined: z.number().int().nonnegative(),
  clustersCreated: z.number().int().nonnegative(),
  clustersUpdated: z.number().int().nonnegative(),
  translationsQueued: z.number().int().nonnegative(),
  decisionsCreated: z.number().int().nonnegative(),
  decisionsUpdated: z.number().int().nonnegative(),
  humanReviewsPending: z.number().int().nonnegative(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  durationMs: z.number().nonnegative(),
  recoveryOfRunId: z.string().optional(),
  stopReason: z.string().optional(),
  checkpoints: z.array(z.object({ stage: z.enum(stageNames), at: z.iso.datetime() })),
});

export const runDocumentSchema = z.object({
  version: z.literal(1),
  runs: z.array(newsroomRunSchema),
});

export const lockSchema = z.object({
  owner: z.string().min(1),
  runId: z.string().min(1),
  pid: z.number().int().positive(),
  acquiredAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  heartbeatAt: z.iso.datetime().optional(),
});

export const circuitSchema = z.object({
  sourceId: z.string().min(1),
  state: z.enum(["closed", "open", "half-open"]),
  consecutiveFailures: z.number().int().nonnegative(),
  openedAt: z.iso.datetime().optional(),
  retryAt: z.iso.datetime().optional(),
  lastFailure: z.string().optional(),
  securityViolation: z.boolean(),
  halfOpenAttempts: z.number().int().nonnegative(),
  history: z.array(
    z.object({ action: z.string(), at: z.iso.datetime(), actor: z.string(), notes: z.string() }),
  ),
});
export const circuitDocumentSchema = z.object({
  version: z.literal(1),
  circuits: z.array(circuitSchema),
});

export const dailyReportSchema = z.object({
  version: z.literal(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  runId: z.string(),
  generatedAt: z.iso.datetime(),
  sourcesChecked: z.number().int().nonnegative(),
  sourcesHealthy: z.number().int().nonnegative(),
  sourcesDegraded: z.number().int().nonnegative(),
  itemsCollected: z.number().int().nonnegative(),
  newItems: z.number().int().nonnegative(),
  duplicates: z.number().int().nonnegative(),
  quarantined: z.number().int().nonnegative(),
  clusters: z.number().int().nonnegative(),
  priorities: z.number().int().nonnegative(),
  reviews: z.number().int().nonnegative(),
  monitoring: z.number().int().nonnegative(),
  translationsPending: z.number().int().nonnegative(),
  highRisks: z.number().int().nonnegative(),
  blockers: z.record(z.string(), z.number().int().nonnegative()),
  coverage: z.record(z.string(), z.number().int().nonnegative()),
  gaps: z.array(z.string()),
  failures: z.array(z.string()),
  recommendedActions: z.array(z.string()),
  internalIds: z.array(z.string()),
  summary: z.string(),
});

export const inboxStatuses = [
  "unread",
  "opened",
  "deferred",
  "action-required",
  "resolved",
  "dismissed",
] as const;
export const inboxEntrySchema = z.object({
  id: z.string().regex(/^inbox-[a-f0-9]{16}$/),
  clusterId: z.string(),
  decisionId: z.string(),
  recommendation: z.string(),
  risk: z.string(),
  readiness: z.string(),
  sources: z.array(z.string()),
  urls: z.array(z.url()),
  topics: z.array(z.string()),
  publishedAt: z.iso.datetime(),
  translation: z.string(),
  blockers: z.array(z.string()),
  nextAction: z.string(),
  priority: z.number(),
  status: z.enum(inboxStatuses),
  humanStatus: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  history: z.array(
    z.object({ action: z.string(), at: z.iso.datetime(), actor: z.string(), notes: z.string() }),
  ),
});
export const inboxDocumentSchema = z.object({
  version: z.literal(1),
  entries: z.array(inboxEntrySchema),
});

export type NewsroomRun = z.infer<typeof newsroomRunSchema>;
export type StageResult = z.infer<typeof stageResultSchema>;
export type RunMode = (typeof runModes)[number];
export type StageName = (typeof stageNames)[number];
export type DailyNewsroomReport = z.infer<typeof dailyReportSchema>;
export type InboxEntry = z.infer<typeof inboxEntrySchema>;
export type CircuitState = z.infer<typeof circuitSchema>;
export type GlobalLock = z.infer<typeof lockSchema>;
