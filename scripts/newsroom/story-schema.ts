import { z } from "zod";

export const relationTypes = [
  "exact-duplicate",
  "republication",
  "same-source-update",
  "independent-coverage",
  "commentary-analysis",
  "related-distinct",
] as const;

export const clusterStatuses = ["open", "monitoring", "review", "closed"] as const;
export const claimTypes = [
  "announcement",
  "fact",
  "estimate",
  "projection",
  "opinion",
  "allegation",
  "interpretation",
  "unknown",
] as const;

export const relationSchema = z.object({
  itemId: z.string().min(1),
  relatedItemId: z.string().min(1),
  type: z.enum(relationTypes),
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string().min(1)),
  independentInstitution: z.boolean(),
});

export const primarySourceCandidateSchema = z.object({
  itemId: z.string().min(1),
  sourceId: z.string().min(1),
  confidence: z.enum(["low", "medium", "high"]),
  evidence: z.array(z.string().min(1)),
  limitations: z.array(z.string().min(1)),
});

export const storyClusterSchema = z.object({
  id: z.string().regex(/^cluster-[a-f0-9]{16}$/),
  canonicalTitle: z.string().min(1).max(300),
  status: z.enum(clusterStatuses),
  primaryItemId: z.string().min(1),
  itemIds: z.array(z.string().min(1)).min(1),
  sourceIds: z.array(z.string().min(1)).min(1),
  sourceCount: z.number().int().positive(),
  independentSourceCount: z.number().int().positive(),
  languages: z.array(z.string().min(2)).min(1),
  countries: z.array(z.string().min(2)),
  topics: z.array(z.string().min(1)),
  entities: z.array(z.string().min(2)),
  firstPublishedAt: z.iso.datetime(),
  lastUpdatedAt: z.iso.datetime(),
  clusterScore: z.number(),
  recommendation: z.enum(["archive", "monitor", "review", "priority"]),
  relations: z.array(relationSchema),
  primarySourceCandidate: primarySourceCandidateSchema.optional(),
  uncertaintyNotes: z.array(z.string().min(1)),
  history: z.array(
    z.object({
      action: z.string().min(1),
      at: z.iso.datetime(),
      actor: z.string().min(1),
      reason: z.string().min(1),
    }),
  ),
});

export const claimCandidateSchema = z.object({
  id: z.string().regex(/^claim-[a-f0-9]{16}$/),
  clusterId: z.string().min(1),
  text: z.string().min(1).max(500),
  type: z.enum(claimTypes),
  sourceItemIds: z.array(z.string().min(1)).min(1),
  sourceIds: z.array(z.string().min(1)).min(1),
  independentSourceCount: z.number().int().positive(),
  status: z.enum([
    "single-source",
    "multi-source",
    "contradicted",
    "needs-primary-source",
    "needs-review",
  ]),
  confidence: z.enum(["low", "medium", "high"]),
  evidence: z.array(z.string().min(1)),
  uncertainties: z.array(z.string().min(1)),
});

export const evidencePackageSchema = z.object({
  id: z.string().regex(/^evidence-[a-f0-9]{16}$/),
  clusterId: z.string().min(1),
  generatedAt: z.iso.datetime(),
  primarySourceCandidate: primarySourceCandidateSchema.optional(),
  sources: z.array(
    z.object({ id: z.string(), name: z.string(), url: z.url(), institution: z.string() }),
  ),
  chronology: z.array(z.object({ itemId: z.string(), publishedAt: z.iso.datetime() })),
  claims: z.array(claimCandidateSchema),
  confirmations: z.array(z.string()),
  contradictions: z.array(z.string()),
  uncertainties: z.array(z.string()),
  promotionalSignals: z.array(z.string()),
  editorialRisks: z.array(z.string()),
  topics: z.array(z.string()),
  countries: z.array(z.string()),
  clusterScore: z.number(),
  recommendation: z.string(),
  pendingQuestions: z.array(z.string()),
  originalUrls: z.array(z.url()),
});

export const clusterDocumentSchema = z.object({
  version: z.literal(1),
  generatedAt: z.iso.datetime(),
  clusters: z.array(storyClusterSchema),
});
export const claimDocumentSchema = z.object({
  version: z.literal(1),
  claims: z.array(claimCandidateSchema),
});
export const evidenceDocumentSchema = z.object({
  version: z.literal(1),
  packages: z.array(evidencePackageSchema),
});

export type StoryCluster = z.infer<typeof storyClusterSchema>;
export type ClaimCandidate = z.infer<typeof claimCandidateSchema>;
export type EvidencePackage = z.infer<typeof evidencePackageSchema>;
export type ClusterRelation = z.infer<typeof relationSchema>;
