import { z } from "zod";

export const riskLevels = ["unknown", "low", "medium", "high", "critical"] as const;
export const readinessStates = ["ready", "partial", "blocked", "unknown", "not-required"] as const;
export const decisionStatuses = [
  "pending-evaluation",
  "evaluated",
  "human-review-required",
  "approved-for-pitch",
  "rejected",
  "monitoring",
  "archived",
  "superseded",
] as const;
export const recommendations = [
  "reject",
  "archive",
  "monitor",
  "request-more-sources",
  "request-translation-review",
  "human-review",
  "prepare-pitch",
  "urgent-human-review",
] as const;
export const humanActions = [
  "approve-for-pitch",
  "reject",
  "monitor",
  "request-more-sources",
  "request-translation-review",
  "archive",
] as const;

const riskSchema = z.object({
  level: z.enum(riskLevels),
  signals: z.array(z.string()),
  reasons: z.array(z.string()),
});

const readinessDimensionSchema = z.object({
  state: z.enum(readinessStates),
  evidence: z.array(z.string()),
  blockers: z.array(z.string()),
  requiredActions: z.array(z.string()),
});

export const editorialReadinessSchema = z.object({
  sourceReady: readinessDimensionSchema,
  evidenceReady: readinessDimensionSchema,
  translationReady: readinessDimensionSchema,
  factualReady: readinessDimensionSchema,
  legalReady: readinessDimensionSchema,
  imageReady: readinessDimensionSchema,
  topicReady: readinessDimensionSchema,
  audienceReady: readinessDimensionSchema,
  timingReady: readinessDimensionSchema,
  diversityReady: readinessDimensionSchema,
  overallReady: readinessDimensionSchema,
});

export const riskMatrixSchema = z.object({
  factual: riskSchema,
  legal: riskSchema,
  reputational: riskSchema,
  political: riskSchema,
  scientific: riskSchema,
  financial: riskSchema,
  regulatory: riskSchema,
  healthSafety: riskSchema,
  conflictOfInterest: riskSchema,
  translation: riskSchema,
  copyright: riskSchema,
  image: riskSchema,
  privacy: riskSchema,
});

export const editorialDecisionSchema = z.object({
  id: z.string().regex(/^decision-[a-f0-9]{16}$/),
  clusterId: z.string().min(1),
  evidencePackageId: z.string().min(1),
  topics: z.array(z.string()).default([]),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  policyVersion: z.string().min(1),
  inputFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  status: z.enum(decisionStatuses),
  recommendation: z.enum(recommendations),
  confidence: z.enum(["low", "medium", "high"]),
  riskLevel: z.enum(riskLevels),
  blockers: z.array(z.string()),
  warnings: z.array(z.string()),
  evidenceStrength: z.number().min(0).max(100),
  sourceDiversity: z.number().min(0).max(100),
  geographicRelevance: z.number().min(0).max(100),
  topicRelevance: z.number().min(0).max(100),
  novelty: z.number().min(0).max(100),
  educationalPotential: z.number().min(0).max(100),
  publicInterest: z.number().min(0).max(100),
  urgency: z.number().min(0).max(100),
  promotionalRisk: z.enum(riskLevels),
  legalRisk: z.enum(riskLevels),
  reputationalRisk: z.enum(riskLevels),
  factualRisk: z.enum(riskLevels),
  translationRisk: z.enum(riskLevels),
  imageRisk: z.enum(riskLevels),
  decisionReasons: z.array(z.string().min(1)),
  requiredActions: z.array(z.string().min(1)),
  risks: riskMatrixSchema,
  readiness: editorialReadinessSchema,
  reviewedAt: z.iso.datetime().optional(),
  reviewedBy: z.string().min(1).optional(),
  humanDecision: z.enum(humanActions).optional(),
  humanNotes: z.string().min(1).optional(),
  history: z.array(
    z.object({ action: z.string(), at: z.iso.datetime(), actor: z.string(), notes: z.string() }),
  ),
});

export const editorialPolicySchema = z.object({
  version: z.string().min(1),
  effectiveAt: z.iso.datetime(),
  rationale: z.string().min(1),
  weights: z.record(z.string(), z.number()),
  thresholds: z.object({
    minimumTopicScore: z.number(),
    priorityScore: z.number(),
    criticalRiskBlocks: z.boolean(),
  }),
  blockers: z.array(z.string().min(1)),
  warnings: z.array(z.string().min(1)),
  sensitiveTerms: z.record(z.string(), z.array(z.string().min(1))),
  contentTypeRules: z.record(
    z.string(),
    z.object({ humanReview: z.boolean(), imageRequired: z.boolean() }),
  ),
});

export const decisionDocumentSchema = z.object({
  version: z.literal(1),
  policyVersion: z.string(),
  decisions: z.array(editorialDecisionSchema),
});

export const pitchSchema = z.object({
  id: z.string().regex(/^pitch-[a-f0-9]{16}$/),
  decisionId: z.string().min(1),
  clusterId: z.string().min(1),
  provisionalTitle: z.string().min(1),
  contentTypeSuggestion: z.enum(["news", "explainer", "analysis", "guide"]),
  centralQuestion: z.string().min(1),
  audience: z.string().min(1),
  whyItMatters: z.array(z.string()),
  knownFacts: z.array(z.string()),
  unverifiedClaims: z.array(z.string()),
  primarySources: z.array(z.url()),
  secondarySources: z.array(z.url()),
  uncertainties: z.array(z.string()),
  requiredFactChecks: z.array(z.string()),
  translationNotes: z.array(z.string()),
  imageRequirements: z.array(z.string()),
  legalReviewNeeded: z.boolean(),
  editorialRisks: z.array(z.string()),
  suggestedSections: z.array(z.string()),
  createdAt: z.iso.datetime(),
  createdBy: z.string().min(1),
  updatedAt: z.iso.datetime(),
  status: z.enum(["proposed", "researching", "approved", "rejected", "archived"]),
  history: z.array(
    z.object({ action: z.string(), at: z.iso.datetime(), actor: z.string(), reason: z.string() }),
  ),
});

export const pitchDocumentSchema = z.object({
  version: z.literal(1),
  pitches: z.array(pitchSchema),
});

export type EditorialDecision = z.infer<typeof editorialDecisionSchema>;
export type EditorialPolicy = z.infer<typeof editorialPolicySchema>;
export type EditorialReadiness = z.infer<typeof editorialReadinessSchema>;
export type RiskMatrix = z.infer<typeof riskMatrixSchema>;
export type Pitch = z.infer<typeof pitchSchema>;
export type HumanAction = (typeof humanActions)[number];
