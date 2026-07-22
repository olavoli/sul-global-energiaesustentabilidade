import { z } from "zod";

const text = z.string().trim().min(1);
const instant = z.iso.datetime();
export const evidenceStatuses = [
  "scaffold",
  "collecting",
  "evidence-review",
  "needs-more-sources",
  "ready-for-editorial-review",
  "rejected",
  "archived",
] as const;
export const humanEvidenceStatuses = [
  "unread",
  "verified",
  "rejected",
  "needs-context",
  "disputed",
] as const;
export const sourceTypes = [
  "primary-paper",
  "related-paper",
  "review-paper",
  "correction",
  "retraction",
  "official-metadata",
] as const;
export const claimTypes = [
  "objective",
  "method",
  "result",
  "limitation",
  "comparison",
  "hypothesis",
  "recommendation",
  "future-work",
] as const;
export const readinessLevels = [
  "blocked",
  "incomplete",
  "evidence-ready",
  "editorial-review-ready",
] as const;
const provenanceSchema = z.object({
  source: text,
  sourceId: text,
  retrievedAt: instant,
  method: text,
});
const historySchema = z.object({ action: text, actor: text, note: text, at: instant });
export const evidenceSourceSchema = z.object({
  sourceId: z.string().regex(/^evidence-source-[a-f0-9]{16}$/),
  type: z.enum(sourceTypes),
  title: text,
  url: z.url(),
  doi: text.optional(),
  publisher: text.optional(),
  authors: z.array(text),
  publicationDate: z.iso.date().optional(),
  license: text,
  accessType: z.enum(["open", "metadata-only"]),
  retrievedAt: instant,
  verifiedAt: instant.nullable(),
  checksum: z
    .string()
    .regex(/^[A-F0-9]{64}$/)
    .optional(),
  provenance: z.array(provenanceSchema).min(1),
  warnings: z.array(text),
  humanStatus: z.enum(humanEvidenceStatuses),
});
export const evidenceItemSchema = z.object({
  evidenceId: z.string().regex(/^evidence-item-[a-f0-9]{16}$/),
  sourceId: text,
  type: z.enum(["excerpt", "number", "method", "metadata"]),
  location: text,
  shortExcerpt: z.string().max(500),
  structuredValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  unit: text.optional(),
  population: text.optional(),
  material: text.optional(),
  method: text.optional(),
  conditions: text.optional(),
  confidence: z.enum(["confirmed", "probable", "uncertain"]),
  warnings: z.array(text),
  humanStatus: z.enum(humanEvidenceStatuses),
});
export const evidenceClaimSchema = z.object({
  claimId: z.string().regex(/^evidence-claim-[a-f0-9]{16}$/),
  exactSourceReference: text,
  sourceId: text,
  attributedTo: text,
  claimType: z.enum(claimTypes),
  statement: text,
  evidenceLocation: text,
  supportingEvidenceIds: z.array(text),
  opposingEvidenceIds: z.array(text),
  uncertainty: text,
  status: z.enum(["candidate", "supported", "disputed", "rejected"]),
  warnings: z.array(text),
  humanStatus: z.enum(humanEvidenceStatuses),
  history: z.array(historySchema),
});
const checklistSchema = z.object({ key: text, satisfied: z.boolean(), note: text });
export const evidenceDossierSchema = z.object({
  schemaVersion: z.literal(1),
  dossierId: z.string().regex(/^evidence-dossier-[a-f0-9]{16}$/),
  scientificWorkId: z.string().regex(/^radar-[a-f0-9]{16}$/),
  graphId: z.string().regex(/^graph-[a-f0-9]{16}$/),
  status: z.enum(evidenceStatuses),
  sourceAccess: z.object({
    licenseConfirmed: z.boolean(),
    accessType: z.enum(["open", "metadata-only"]),
    officialUrl: z.url(),
  }),
  sourceIds: z.array(text),
  claimIds: z.array(text),
  evidenceItemIds: z.array(text),
  limitations: z.array(z.object({ type: text, statement: text, sourceId: text.optional() })),
  uncertainties: z.array(z.object({ type: text, statement: text, sourceId: text.optional() })),
  contradictions: z.array(
    z.object({
      statement: text,
      sourceIds: z.array(text).min(2),
      humanStatus: z.enum(humanEvidenceStatuses),
    }),
  ),
  relatedEvidence: z.array(
    z.object({
      relationType: z.enum([
        "cites",
        "cited-by",
        "related-to",
        "version-of",
        "corrects",
        "retracts",
      ]),
      workId: text,
      classification: z.literal("uninterpreted"),
    }),
  ),
  terminology: z.array(z.object({ term: text, sourceId: text })),
  methodologyNotes: z.array(text),
  dataNotes: z.array(text),
  statisticalNotes: z.array(text),
  funding: z.array(z.object({ statement: text, sourceId: text })),
  conflictsOfInterest: z.array(z.object({ statement: text, sourceId: text })),
  copyright: z.object({
    license: text,
    fullTextStored: z.literal(false),
    figuresStored: z.literal(false),
    tablesStored: z.literal(false),
    excerptLimit: z.literal(500),
  }),
  openQuestions: z.array(text),
  factChecks: z.array(checklistSchema),
  editorialQuestions: z.array(text),
  humanReview: z.object({
    completed: z.boolean(),
    reviewer: text.nullable(),
    reviewedAt: instant.nullable(),
  }),
  readiness: z.object({ level: z.enum(readinessLevels), checklist: z.array(checklistSchema) }),
  history: z.array(historySchema),
  createdAt: instant,
  updatedAt: instant,
});
export const evidenceStateSchema = z.object({
  schemaVersion: z.literal(1),
  dossiers: z.array(evidenceDossierSchema),
  sources: z.array(evidenceSourceSchema),
  claims: z.array(evidenceClaimSchema),
  evidence: z.array(evidenceItemSchema),
});
export type EvidenceDossier = z.infer<typeof evidenceDossierSchema>;
export type EvidenceSource = z.infer<typeof evidenceSourceSchema>;
export type EvidenceClaim = z.infer<typeof evidenceClaimSchema>;
export type EvidenceItem = z.infer<typeof evidenceItemSchema>;
export type HumanEvidenceStatus = (typeof humanEvidenceStatuses)[number];
