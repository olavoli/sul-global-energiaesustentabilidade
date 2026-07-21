import { z } from "zod";

export const scientificCategories = [
  "solar",
  "wind",
  "nuclear",
  "green-hydrogen",
  "batteries",
  "storage",
  "carbon",
  "smart-grid",
  "mobility",
  "ai-energy",
  "public-policy",
  "market",
] as const;

export const scientificCategorySchema = z.enum(scientificCategories);
export type ScientificCategory = z.infer<typeof scientificCategorySchema>;

export const radarStatuses = [
  "new",
  "ignored",
  "monitoring",
  "dossier-created",
  "translation-requested",
] as const;

export const radarStatusSchema = z.enum(radarStatuses);
export type RadarStatus = z.infer<typeof radarStatusSchema>;

const text = z.string().trim().min(1);

export const radarHistorySchema = z.object({
  action: z.enum([
    "discovered",
    "ignored",
    "monitoring",
    "dossier-created",
    "translation-requested",
  ]),
  actor: text,
  note: z.string().trim().max(1_000),
  at: z.iso.datetime(),
});

export const radarScoreSchema = z.object({
  total: z.number().int().min(0).max(100),
  recency: z.number().int().min(0).max(25),
  citations: z.number().int().min(0).max(20),
  journal: z.number().int().min(0).max(15),
  openAccess: z.number().int().min(0).max(10),
  thematic: z.number().int().min(0).max(20),
  categoryRelationship: z.number().int().min(0).max(10),
});

export const scientificWarningCodes = [
  "license-not-open",
  "tdm-only",
  "peer-review-unconfirmed",
  "metadata-incomplete",
  "future-date-suspected",
  "crossref-divergence",
  "preprint",
  "corrected",
  "retracted",
  "open-access-url-missing",
  "institution-missing",
  "country-missing",
  "citation-count-volatile",
  "manual-review-required",
] as const;

export const scientificWarningSeveritySchema = z.enum(["info", "warning", "blocker"]);
export const scientificWarningSchema = z.object({
  code: z.enum(scientificWarningCodes),
  severity: scientificWarningSeveritySchema,
  message: text,
  source: text,
  detectedAt: z.iso.datetime(),
  resolved: z.boolean(),
  resolutionNote: text.optional(),
});

export type ScientificWarning = z.infer<typeof scientificWarningSchema>;
export type ScientificWarningSeverity = z.infer<typeof scientificWarningSeveritySchema>;

export const scientificWorkSchema = z.object({
  id: z.string().regex(/^radar-[a-f0-9]{16}$/),
  openAlexId: z.url(),
  doi: z.string().regex(/^10\.\d{4,9}\/\S+$/i),
  title: text,
  authors: z.array(text),
  institutions: z.array(text),
  abstract: text.nullable(),
  countries: z.array(text),
  keywords: z.array(text),
  journal: text.nullable(),
  publisher: text.nullable(),
  publicationDate: z.iso.date(),
  license: text.nullable(),
  openAccess: z.boolean(),
  openAccessUrl: z.url().nullable(),
  type: text,
  peerReviewStatus: z.enum(["confirmed", "probable", "unknown"]),
  corrected: z.boolean(),
  retracted: z.boolean(),
  area: text.nullable(),
  categories: z.array(scientificCategorySchema).min(1),
  existingCategorySlugs: z.array(text),
  citedByCount: z.number().int().nonnegative(),
  referencedWorks: z.array(z.url()),
  relatedWorks: z.array(z.url()),
  officialLinks: z.object({
    openAlex: z.url(),
    doi: z.url(),
    crossref: z.url(),
  }),
  crossrefValidated: z.literal(true),
  warningVersion: z.literal(1),
  warnings: z.array(scientificWarningSchema),
  score: radarScoreSchema,
  status: radarStatusSchema,
  discoveredAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  history: z.array(radarHistorySchema),
});

export type ScientificWork = z.infer<typeof scientificWorkSchema>;

export const scientificRadarDocumentSchema = z.object({
  schemaVersion: z.literal(2),
  lastRunAt: z.iso.datetime().nullable(),
  items: z.array(scientificWorkSchema),
});

export type ScientificRadarDocument = z.infer<typeof scientificRadarDocumentSchema>;

export const scientificDossierSchema = z.object({
  id: z.string().regex(/^dossier-[a-f0-9]{16}$/),
  scientificWorkId: z.string().regex(/^radar-[a-f0-9]{16}$/),
  title: text,
  doi: z.string().regex(/^10\.\d{4,9}\/\S+$/i),
  authors: z.array(text),
  institutions: z.array(text),
  journal: text.nullable(),
  publicationDate: z.iso.date(),
  license: text.nullable(),
  openAccess: z.boolean(),
  categories: z.array(scientificCategorySchema),
  warnings: z.array(scientificWarningSchema),
  officialLinks: z.object({ openAlex: z.url(), doi: z.url(), crossref: z.url() }),
  status: z.literal("scaffold"),
  createdAt: z.iso.datetime(),
  createdBy: text,
  centralQuestion: z.literal(""),
  editorialAngle: z.literal(""),
  whyItMatters: z.literal(""),
  knownClaims: z.array(z.never()),
  unsupportedClaims: z.array(z.never()),
  limitations: z.array(z.never()),
  counterEvidenceNeeded: z.array(z.never()),
  relatedWorksNeeded: z.array(z.never()),
  funding: z.array(z.never()),
  conflictsOfInterest: z.array(z.never()),
  openQuestions: z.array(z.never()),
  regionalRelevance: z.literal(""),
  sulGlobalRelevance: z.literal(""),
  sourceAccess: z.object({
    openAccess: z.boolean(),
    license: text.nullable(),
    links: z.array(z.url()),
  }),
  copyrightNotes: z.literal(""),
  factChecks: z.array(z.never()),
  translationNeeds: z.array(z.never()),
  imageNeeds: z.array(z.never()),
  humanNotes: z.array(z.never()),
  history: z.array(radarHistorySchema),
  generatedContent: z.literal(false),
  graphId: z
    .string()
    .regex(/^graph-[a-f0-9]{16}$/)
    .optional(),
  relatedWorkIds: z.array(z.string()).optional(),
  authorIds: z.array(z.string()).optional(),
  institutionIds: z.array(z.string()).optional(),
  topicIds: z.array(z.string()).optional(),
  graphWarnings: z.array(z.string()).optional(),
  graphUpdatedAt: z.iso.datetime().optional(),
});

export const scientificDossiersDocumentSchema = z.object({
  schemaVersion: z.literal(2),
  items: z.array(scientificDossierSchema),
});

export type ScientificDossier = z.infer<typeof scientificDossierSchema>;

export interface RadarDiscoveryOptions {
  apiKey: string;
  fromDate: string;
  perPage?: number;
  now?: Date;
  fetcher?: typeof fetch;
  crossrefMailto?: string;
}

export interface RadarDiscoveryReport {
  fetched: number;
  doiCandidates: number;
  crossrefValidated: number;
  duplicates: number;
  persisted: number;
  rejected: number;
  items: ScientificWork[];
}
