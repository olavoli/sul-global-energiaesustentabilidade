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

export const scientificWorkSchema = z.object({
  id: z.string().regex(/^radar-[a-f0-9]{16}$/),
  openAlexId: z.url(),
  doi: z.string().regex(/^10\.\d{4,9}\/\S+$/i),
  title: text,
  authors: z.array(text),
  institutions: z.array(text),
  abstract: text.nullable(),
  keywords: z.array(text),
  journal: text.nullable(),
  publisher: text.nullable(),
  publicationDate: z.iso.date(),
  license: text.nullable(),
  openAccess: z.boolean(),
  type: text,
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
  score: radarScoreSchema,
  status: radarStatusSchema,
  discoveredAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  history: z.array(radarHistorySchema),
});

export type ScientificWork = z.infer<typeof scientificWorkSchema>;

export const scientificRadarDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  lastRunAt: z.iso.datetime().nullable(),
  items: z.array(scientificWorkSchema),
});

export type ScientificRadarDocument = z.infer<typeof scientificRadarDocumentSchema>;

export const scientificDossierSchema = z.object({
  id: z.string().regex(/^dossier-[a-f0-9]{16}$/),
  scientificWorkId: z.string().regex(/^radar-[a-f0-9]{16}$/),
  title: text,
  status: z.literal("empty-supervised"),
  createdAt: z.iso.datetime(),
  createdBy: text,
  note: z.string().trim().max(1_000),
  sources: z.array(z.url()),
  generatedContent: z.literal(false),
});

export const scientificDossiersDocumentSchema = z.object({
  schemaVersion: z.literal(1),
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
