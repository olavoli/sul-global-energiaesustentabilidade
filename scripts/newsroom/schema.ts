import { z } from "zod";

export const sourceTypes = [
  "official",
  "regulatory",
  "academic",
  "university",
  "research-institute",
  "company",
  "industry-association",
  "news-agency",
  "specialist-media",
  "general-media",
  "data-provider",
] as const;
export const trustTiers = ["primary", "high", "medium", "contextual", "blocked"] as const;
export const collectionMethods = ["rss", "atom", "local-fixture"] as const;
export const healthStatuses = [
  "healthy",
  "degraded",
  "stale",
  "invalid",
  "blocked",
  "unknown",
] as const;
export const freshnessBands = ["recent", "current", "background", "stale", "unknown"] as const;
export const changeStatuses = [
  "first-collection",
  "unchanged",
  "changed",
  "error",
  "format-changed",
] as const;
export const queueStates = [
  "collected",
  "normalized",
  "duplicate",
  "rejected",
  "scored",
  "review",
  "approved-for-draft",
  "archived",
] as const;

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const sourceSchema = z
  .object({
    id: slug,
    name: z.string().trim().min(1),
    homepage: z.url(),
    feedUrl: z.url().optional(),
    sourceType: z.enum(sourceTypes),
    language: z.string().trim().min(2),
    countries: z.array(z.string().trim().min(2)),
    topics: z.array(z.string().trim().min(1)),
    trustTier: z.enum(trustTiers),
    active: z.boolean(),
    termsNotes: z.string().trim().min(1),
    copyrightNotes: z.string().trim().min(1),
    collectionMethod: z.enum(collectionMethods),
    expectedFrequency: z.enum(["daily", "weekly", "monthly", "irregular"]).optional(),
    evidenceCheckedAt: z.iso.datetime().optional(),
    evidenceCheckedBy: z.string().trim().min(1).optional(),
    evidenceId: slug.optional(),
    lastCheckedAt: z.iso.datetime().optional(),
    notes: z.string().trim().min(1).optional(),
  })
  .superRefine((source, context) => {
    if (source.active && source.trustTier === "blocked") {
      context.addIssue({
        code: "custom",
        path: ["active"],
        message: "Fonte bloqueada não pode estar ativa.",
      });
    }
    if (source.collectionMethod !== "local-fixture" && !source.feedUrl) {
      context.addIssue({
        code: "custom",
        path: ["feedUrl"],
        message: "Coletor externo exige feedUrl.",
      });
    }
    if (source.collectionMethod !== "local-fixture") {
      for (const [field, value] of [
        ["homepage", source.homepage],
        ["feedUrl", source.feedUrl],
      ] as const) {
        if (value && new URL(value).protocol !== "https:") {
          context.addIssue({ code: "custom", path: [field], message: "Fonte real exige HTTPS." });
        }
      }
      if (
        source.active &&
        (!source.evidenceCheckedAt || !source.evidenceCheckedBy || !source.evidenceId)
      ) {
        context.addIssue({
          code: "custom",
          path: ["active"],
          message: "Fonte real ativa exige evidência verificada.",
        });
      }
    }
  });

export const sourceHealthSchema = z.object({
  sourceId: slug,
  status: z.enum(healthStatuses),
  checkedAt: z.iso.datetime(),
  httpStatus: z.number().int().optional(),
  finalUrl: z.url().optional(),
  redirects: z.number().int().nonnegative(),
  contentType: z.string().optional(),
  responseBytes: z.number().int().nonnegative().optional(),
  responseMs: z.number().nonnegative(),
  format: z.enum(["rss", "atom"]).optional(),
  approximateItems: z.number().int().nonnegative(),
  newestItemAt: z.iso.datetime().optional(),
  apparentLanguage: z.string().optional(),
  etag: z.string().optional(),
  lastModified: z.string().optional(),
  consecutiveFailures: z.number().int().nonnegative(),
  reasons: z.array(z.string().min(1)),
});

export const sourceRuntimeSchema = z.object({
  sourceId: slug,
  etag: z.string().optional(),
  lastModified: z.string().optional(),
  feedHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
  lastCheckedAt: z.iso.datetime().optional(),
  lastChangedAt: z.iso.datetime().optional(),
  changeStatus: z.enum(changeStatuses).optional(),
  consecutiveFailures: z.number().int().nonnegative().default(0),
  healthChecks: z.number().int().nonnegative().default(0),
  successfulChecks: z.number().int().nonnegative().default(0),
  totalResponseMs: z.number().nonnegative().default(0),
  collections: z.number().int().nonnegative().default(0),
  itemsFetched: z.number().int().nonnegative().default(0),
  itemsValid: z.number().int().nonnegative().default(0),
  itemsRejected: z.number().int().nonnegative().default(0),
  duplicates: z.number().int().nonnegative().default(0),
  missingDate: z.number().int().nonnegative().default(0),
  missingAuthor: z.number().int().nonnegative().default(0),
  missingDescription: z.number().int().nonnegative().default(0),
  promotionalItems: z.number().int().nonnegative().default(0),
  quarantined: z.number().int().nonnegative().default(0),
  freshnessHoursTotal: z.number().nonnegative().default(0),
  topicCounts: z.record(z.string(), z.number().int().nonnegative()).default({}),
  health: sourceHealthSchema.optional(),
});

export const quarantineSchema = z.object({
  id: z.string().min(1),
  sourceId: slug,
  reasonCode: z.enum([
    "invalid-xml",
    "format-changed",
    "too-large",
    "suspicious-redirect",
    "domain-changed",
    "invalid-content-type",
    "future-items",
    "missing-dates",
    "missing-attribution",
    "snippet-policy",
    "repeated-failures",
  ]),
  reason: z.string().min(1),
  createdAt: z.iso.datetime(),
  state: z.enum(["pending", "retry-approved", "discarded"]),
  attempts: z.number().int().nonnegative(),
  metadata: z.object({
    httpStatus: z.number().int().optional(),
    contentType: z.string().optional(),
    responseBytes: z.number().int().nonnegative().optional(),
    finalUrl: z.url().optional(),
  }),
});

export const collectedItemSchema = z.object({
  id: z.string().min(1),
  sourceId: slug,
  sourceName: z.string().min(1),
  originalUrl: z.url(),
  canonicalUrl: z.url().optional(),
  title: z.string().min(1),
  description: z.string().max(500),
  publishedAt: z.iso.datetime(),
  updatedAt: z.iso.datetime().optional(),
  collectedAt: z.iso.datetime(),
  language: z.string().min(2),
  authors: z.array(z.string().min(1)),
  categories: z.array(z.string().min(1)),
  rawCategories: z.array(z.string().min(1)),
  contentSnippet: z.string().max(500),
  guid: z.string().min(1).optional(),
  imageUrl: z.url().optional(),
  rights: z.string().max(300).optional(),
  hash: z.string().regex(/^[a-f0-9]{64}$/),
  collectionMethod: z.enum(collectionMethods),
});

export const topicResultSchema = z.object({
  topic: z.string().min(1),
  score: z.number().nonnegative(),
  reasons: z.array(z.string().min(1)),
});

export const scoreSchema = z.object({
  total: z.number(),
  dimensions: z.record(z.string(), z.number()),
  reasons: z.array(z.string().min(1)),
  penalties: z.array(z.string().min(1)),
  recommendation: z.enum(["reject", "archive", "monitor", "review", "priority"]),
});

export const queueItemSchema = z.object({
  id: z.string().min(1),
  state: z.enum(queueStates),
  item: collectedItemSchema,
  topics: z.array(topicResultSchema),
  score: scoreSchema.optional(),
  relatedItems: z.array(z.string().min(1)).default([]),
  relatedSources: z.array(z.string().min(1)).default([]),
  rejectionReasons: z.array(z.string().min(1)).default([]),
  history: z.array(
    z.object({
      from: z.enum(queueStates).optional(),
      to: z.enum(queueStates),
      at: z.iso.datetime(),
      actor: z.string().min(1),
    }),
  ),
});

export const auditSchema = z.object({
  command: z.string().min(1),
  timestamp: z.iso.datetime(),
  source: z.string().min(1),
  itemsFetched: z.number().int().nonnegative(),
  itemsAccepted: z.number().int().nonnegative(),
  itemsRejected: z.number().int().nonnegative(),
  duplicates: z.number().int().nonnegative(),
  errors: z.array(z.string().min(1)),
  duration: z.number().nonnegative(),
  configurationVersion: z.string().min(1),
  actor: z.string().min(1),
  dryRun: z.boolean(),
  itemsRead: z.number().int().nonnegative().default(0),
  clustersCreated: z.number().int().nonnegative().default(0),
  clustersChanged: z.number().int().nonnegative().default(0),
  translationsQueued: z.number().int().nonnegative().default(0),
  translationsApproved: z.number().int().nonnegative().default(0),
  decisionsEvaluated: z.number().int().nonnegative().default(0),
  humanActions: z.number().int().nonnegative().default(0),
  pitchesCreated: z.number().int().nonnegative().default(0),
});

export type NewsSource = z.infer<typeof sourceSchema>;
export type CollectedItem = z.infer<typeof collectedItemSchema>;
export type TopicResult = z.infer<typeof topicResultSchema>;
export type EditorialScore = z.infer<typeof scoreSchema>;
export type QueueItem = z.infer<typeof queueItemSchema>;
export type AuditEntry = z.infer<typeof auditSchema>;
export type SourceHealth = z.infer<typeof sourceHealthSchema>;
export type SourceRuntime = z.infer<typeof sourceRuntimeSchema>;
export type QuarantineEntry = z.infer<typeof quarantineSchema>;
export type FreshnessBand = (typeof freshnessBands)[number];
