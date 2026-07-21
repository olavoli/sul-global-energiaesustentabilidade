import { z } from "zod";

const text = z.string().trim().min(1);
const conceptId = z.string().regex(/^concept-[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const conceptRelationTypes = [
  "paper-concept",
  "concept-concept",
  "concept-theme",
  "concept-timeline",
  "concept-dossier",
] as const;
export const conceptReviewStatuses = ["pending", "accepted", "rejected", "ignored"] as const;

export const conceptProvenanceSchema = z.object({
  sourceType: z.enum(["controlled-taxonomy", "scientific-graph", "scientific-memory"]),
  sourceId: text,
  evidence: text,
  observedAt: z.iso.datetime(),
});
export const conceptSchema = z.object({
  schemaVersion: z.literal(1),
  id: conceptId,
  label: text,
  aliases: z.array(text).min(1),
  category: text,
  confidence: z.literal(100),
  origin: z.literal("controlled-taxonomy"),
  provenance: z.array(conceptProvenanceSchema).min(1),
  observedRelationIds: z.array(z.string().regex(/^concept-relation-[a-f0-9]{16}$/)),
  taxonomyVersion: text,
  updatedAt: z.iso.datetime(),
});
export const conceptRelationSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^concept-relation-[a-f0-9]{16}$/),
  type: z.enum(conceptRelationTypes),
  from: text,
  to: text,
  confidence: z.literal(100),
  provenance: z.array(conceptProvenanceSchema).min(1),
  humanStatus: z.enum(conceptReviewStatuses),
  history: z.array(
    z.object({
      status: z.enum(conceptReviewStatuses),
      actor: text,
      note: z.string().trim().max(1_000),
      at: z.iso.datetime(),
    }),
  ),
  observedAt: z.iso.datetime(),
});
export const conceptDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  items: z.array(conceptSchema),
});
export const conceptRelationDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  items: z.array(conceptRelationSchema),
});
export const conceptMetadataSchema = z.object({
  schemaVersion: z.literal(1),
  taxonomyVersion: text,
  checksum: z.string().regex(/^[A-F0-9]{64}$/),
  unresolvedTopics: z.array(text),
  updatedAt: z.iso.datetime().nullable(),
});
export type Concept = z.infer<typeof conceptSchema>;
export type ConceptRelation = z.infer<typeof conceptRelationSchema>;
export type ConceptReviewStatus = (typeof conceptReviewStatuses)[number];
