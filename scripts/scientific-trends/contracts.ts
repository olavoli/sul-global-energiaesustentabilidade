import { z } from "zod";

export const trendEntityTypes = [
  "category",
  "author",
  "institution",
  "country",
  "journal",
  "publisher",
  "funder",
] as const;
export const trendStatuses = [
  "insufficient-data",
  "stable",
  "increasing",
  "decreasing",
  "volatile",
  "emerging-candidate",
  "declining-candidate",
  "anomaly",
  "review-required",
] as const;
export const trendWarningCodes = [
  "insufficient-years",
  "insufficient-observations",
  "single-year-concentration",
  "missing-years",
  "metadata-gaps",
  "geographic-concentration",
  "institution-concentration",
  "journal-concentration",
  "source-concentration",
  "volatile-series",
  "baseline-zero",
  "partial-period",
  "citation-count-volatile",
  "coverage-too-low",
  "policy-threshold-not-met",
  "manual-review-required",
  "preliminary-signal",
] as const;
const text = z.string().trim().min(1);
const year = z.number().int().min(1900).max(2200);
export const yearlyPointSchema = z.object({ year, value: z.number().int().nonnegative() });
export const trendWarningSchema = z.object({
  code: z.enum(trendWarningCodes),
  severity: z.enum(["info", "warning", "blocker"]),
  message: text,
  evidence: z.array(text),
  detectedAt: z.iso.datetime(),
  resolved: z.boolean(),
  resolutionNote: text.optional(),
});
export const coverageScoreSchema = z.object({
  score: z.number().min(0).max(100),
  dimensions: z.record(z.string(), z.number().min(0).max(100)),
  evidence: z.array(text),
  limitations: z.array(text),
  warnings: z.array(z.string()),
});
export const trendHistorySchema = z.object({
  action: z.enum(["created", "updated", "reviewed", "more-data-requested", "archived", "watched"]),
  actor: text,
  note: z.string().trim().max(1000),
  at: z.iso.datetime(),
});
export const trendSignalSchema = z.object({
  id: z.string().regex(/^trend-[a-f0-9]{16}$/),
  version: z.literal(1),
  entityType: z.enum(trendEntityTypes),
  entityId: text,
  entityName: text,
  metric: z.literal("article-count"),
  periodStart: year,
  periodEnd: year,
  observations: z.number().int().nonnegative(),
  yearlySeries: z.array(yearlyPointSchema),
  baseline: z.number().nonnegative(),
  latestValue: z.number().nonnegative(),
  absoluteChange: z.number(),
  relativeChange: z.number().nullable(),
  cagr: z.number().nullable(),
  growthRate: z.number().nullable(),
  acceleration: z.number(),
  volatility: z.number().nonnegative(),
  concentration: z.number().min(0).max(1),
  relativeShare: z.number().min(0).max(1),
  newParticipants: z.number().int().nonnegative(),
  recurrence: z.number().min(0).max(1),
  continuity: z.number().min(0).max(1),
  activeYears: z.number().int().nonnegative(),
  missingYears: z.array(year),
  firstAppearance: year,
  lastAppearance: year,
  sampleSize: z.number().int().nonnegative(),
  coverage: coverageScoreSchema,
  coverageScore: z.number().min(0).max(100),
  confidence: z.enum(["none", "low", "moderate", "high"]),
  status: z.enum(trendStatuses),
  warnings: z.array(trendWarningSchema),
  reasons: z.array(text),
  sourceMemoryIds: z.array(text),
  policyVersion: z.number().int().positive(),
  calculatedAt: z.iso.datetime(),
  history: z.array(trendHistorySchema),
});
export const trendSignalsDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  items: z.array(trendSignalSchema),
});
export const trendRunsDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  items: z.array(
    z.object({
      id: z.string().regex(/^trend-run-[a-f0-9]{16}$/),
      mode: z.enum(["rebuild", "incremental"]),
      dryRun: z.boolean(),
      signals: z.number().int().nonnegative(),
      checksum: text,
      startedAt: z.iso.datetime(),
      completedAt: z.iso.datetime(),
    }),
  ),
});
export type TrendSignal = z.infer<typeof trendSignalSchema>;
export type TrendEntityType = (typeof trendEntityTypes)[number];
export type TrendWarning = z.infer<typeof trendWarningSchema>;
export type CoverageScore = z.infer<typeof coverageScoreSchema>;
export type TrendRun = z.infer<typeof trendRunsDocumentSchema>["items"][number];
