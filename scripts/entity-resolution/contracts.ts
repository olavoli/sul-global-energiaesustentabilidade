import { z } from "zod";

export const canonicalEntityTypes = [
  "author",
  "institution",
  "journal",
  "publisher",
  "category",
  "country",
  "funder",
] as const;
export const resolutionRules = [
  "orcid",
  "ror",
  "doi",
  "issn",
  "openalex",
  "crossref",
  "normalized-name",
  "known-alias",
] as const;
export const resolutionScores = [100, 95, 80, 60] as const;

const text = z.string().trim().min(1);
export const canonicalEntitySchema = z.object({
  id: z
    .string()
    .regex(/^(?:author|institution|journal|publisher|category|country|funder)-[a-f0-9]{16}$/),
  type: z.enum(canonicalEntityTypes),
  canonicalName: text,
  normalizedName: text,
  aliases: z.array(text),
  externalIds: z.record(z.string(), text),
  sourceNodeIds: z.array(text).min(1),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const duplicateCandidateSchema = z.object({
  id: z.string().regex(/^duplicate-[a-f0-9]{16}$/),
  entityType: z.enum(canonicalEntityTypes),
  leftEntityId: text,
  rightEntityId: text,
  rule: z.enum(resolutionRules),
  confidence: z.union(resolutionScores.map((score) => z.literal(score))),
  explanation: text,
  evidence: z.array(text).min(1),
  status: z.enum(["pending", "accepted", "ignored"]),
  detectedAt: z.iso.datetime(),
  history: z.array(
    z.object({
      status: z.enum(["accepted", "ignored"]),
      actor: text,
      note: text.max(1_000),
      at: z.iso.datetime(),
    }),
  ),
});

export const canonicalEntitiesDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  items: z.array(canonicalEntitySchema),
});
export const duplicateCandidatesDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  items: z.array(duplicateCandidateSchema),
});

export type CanonicalEntity = z.infer<typeof canonicalEntitySchema>;
export type CanonicalEntityType = (typeof canonicalEntityTypes)[number];
export type DuplicateCandidate = z.infer<typeof duplicateCandidateSchema>;
export type ResolutionRule = (typeof resolutionRules)[number];
