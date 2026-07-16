import { z } from "zod";

export const translationStatuses = [
  "queued",
  "not-required",
  "translated",
  "review-required",
  "approved",
  "rejected",
  "failed",
] as const;
export const translationProviders = ["fixture", "passthrough", "external-placeholder"] as const;

export const qualityCheckSchema = z.object({
  name: z.string().min(1),
  passed: z.boolean(),
  detail: z.string().min(1),
});

export const translationEntrySchema = z.object({
  id: z.string().regex(/^translation-[a-f0-9]{16}$/),
  clusterId: z.string().min(1),
  sourceLanguage: z.string().min(2),
  targetLanguage: z.literal("pt-BR"),
  sourceText: z.string().min(1).max(500),
  translatedText: z.string().max(700).optional(),
  provider: z.enum(translationProviders),
  providerVersion: z.string().min(1),
  status: z.enum(translationStatuses),
  glossaryVersion: z.string().min(1),
  qualityChecks: z.array(qualityCheckSchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  reviewedBy: z.string().min(1).optional(),
  reviewedAt: z.iso.datetime().optional(),
  reviewNotes: z.string().min(1).optional(),
  attempts: z.number().int().nonnegative(),
  history: z.array(
    z.object({ action: z.string(), at: z.iso.datetime(), actor: z.string(), notes: z.string() }),
  ),
});

export const translationDocumentSchema = z.object({
  version: z.literal(1),
  entries: z.array(translationEntrySchema),
});

export type TranslationEntry = z.infer<typeof translationEntrySchema>;
export type QualityCheck = z.infer<typeof qualityCheckSchema>;
