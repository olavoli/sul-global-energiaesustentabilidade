import { z } from "zod";

export const graphNodeTypes = [
  "scientific-work",
  "author",
  "institution",
  "topic",
  "journal",
  "publisher",
  "funder",
] as const;
export const graphRelationTypes = [
  "cites",
  "cited-by",
  "related-to",
  "authored-by",
  "affiliated-with",
  "published-in",
  "published-by",
  "funded-by",
  "has-topic",
  "version-of",
  "corrects",
  "retracts",
] as const;
export const confidenceLevels = ["confirmed", "probable", "uncertain"] as const;
export const humanStatuses = [
  "unread",
  "reviewed",
  "accepted",
  "rejected",
  "needs-context",
] as const;

const text = z.string().trim().min(1);
export const provenanceSchema = z.object({
  source: z.enum(["openalex", "crossref"]),
  endpoint: z.url(),
  externalId: text,
  retrievedAt: z.iso.datetime(),
  normalization: text,
  confidence: z.enum(confidenceLevels),
});
export const graphNodeSchema = z.object({
  id: z.string().regex(/^sgn-[a-f0-9]{16}$/),
  type: z.enum(graphNodeTypes),
  label: text,
  externalIds: z.record(z.string(), text),
  sourceRecords: z.array(provenanceSchema).min(1),
  firstSeenAt: z.iso.datetime(),
  lastCheckedAt: z.iso.datetime(),
  warnings: z.array(text),
  status: z.enum(["active", "blocked"]),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
});
export const relationHistorySchema = z.object({
  status: z.enum(humanStatuses),
  actor: text,
  note: z.string().trim().max(1_000),
  at: z.iso.datetime(),
});
export const graphRelationSchema = z.object({
  id: z.string().regex(/^sgr-[a-f0-9]{16}$/),
  from: text,
  to: text,
  type: z.enum(graphRelationTypes),
  source: z.array(z.enum(["openalex", "crossref"])).min(1),
  sourceEvidence: z.array(provenanceSchema).min(1),
  detectedAt: z.iso.datetime(),
  confidence: z.enum(confidenceLevels),
  humanStatus: z.enum(humanStatuses),
  warnings: z.array(text),
  history: z.array(relationHistorySchema),
});
export const scientificGraphSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^graph-[a-f0-9]{16}$/),
  scientificWorkId: z.string().regex(/^radar-[a-f0-9]{16}$/),
  rootNodeId: text,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  nodes: z.array(graphNodeSchema).max(100),
  relations: z.array(graphRelationSchema).max(150),
  warnings: z.array(text),
  budget: z.object({
    requests: z.number().int().nonnegative(),
    retries: z.number().int().nonnegative(),
    maxNodes: z.literal(100),
    maxRelations: z.literal(150),
  }),
});
export const graphDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  items: z.array(scientificGraphSchema),
});
export type GraphNode = z.infer<typeof graphNodeSchema>;
export type GraphRelation = z.infer<typeof graphRelationSchema>;
export type ScientificGraph = z.infer<typeof scientificGraphSchema>;
export type GraphProvenance = z.infer<typeof provenanceSchema>;

export interface GraphBuildReport {
  graph: ScientificGraph;
  duplicates: number;
  incompleteRelations: number;
  nodesByType: Record<string, number>;
  relationsByType: Record<string, number>;
  authorsWithoutOrcid: number;
  institutionsWithoutRor: number;
  worksWithoutDoi: number;
  retractions: number;
  corrections: number;
  openAccessWorks: number;
  persisted: boolean;
}
