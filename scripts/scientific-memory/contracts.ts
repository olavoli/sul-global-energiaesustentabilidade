import { z } from "zod";

export const memoryEntityTypes = [
  "author",
  "institution",
  "journal",
  "publisher",
  "country",
  "category",
] as const;
const text = z.string().trim().min(1);
const year = z.number().int().min(1900).max(2200);
export const annualCountSchema = z.object({ year, count: z.number().int().nonnegative() });
const entityRefSchema = z.object({ id: text, name: text });

export const articleMemorySnapshotSchema = z.object({
  articleId: z.string().regex(/^radar-[a-f0-9]{16}$/),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  year,
  updatedAt: z.iso.datetime(),
  refs: z.record(z.enum(memoryEntityTypes), z.array(entityRefSchema)),
});

export const entityMemorySchema = z.object({
  id: z
    .string()
    .regex(/^memory-(?:author|institution|journal|publisher|country|category)-[a-f0-9]{16}$/),
  canonicalId: z
    .string()
    .regex(/^(?:author|institution|journal|publisher|country|category)-[a-f0-9]{16}$/),
  type: z.enum(memoryEntityTypes),
  name: text,
  firstSeen: year,
  lastSeen: year,
  articleCount: z.number().int().positive(),
  timeline: z.array(annualCountSchema),
  categories: z.array(text),
  countries: z.array(text),
  institutions: z.array(text),
  sources: z.array(z.string().regex(/^radar-[a-f0-9]{16}$/)),
  growthRate: z.number().finite(),
  firstAppearance: year,
  lastAppearance: year,
  yearsActive: z.number().int().positive(),
  updatedAt: z.iso.datetime(),
});

export const memoryEntitiesDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  items: z.array(entityMemorySchema),
});
export const memoryTimelineDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  years: z.array(
    z.object({
      year,
      articleCount: z.number().int().nonnegative(),
      newEntities: z.number().int().nonnegative(),
      activeEntities: z.number().int().nonnegative(),
      inactiveEntities: z.number().int().nonnegative(),
      recurringEntities: z.number().int().nonnegative(),
    }),
  ),
});
export const memoryMetadataSchema = z.object({
  schemaVersion: z.literal(1),
  checksum: z.string().regex(/^[A-F0-9]{64}$/),
  articleCount: z.number().int().nonnegative(),
  entityCount: z.number().int().nonnegative(),
  updatedAt: z.iso.datetime().nullable(),
  snapshots: z.array(articleMemorySnapshotSchema),
});

export type MemoryEntityType = (typeof memoryEntityTypes)[number];
export type EntityMemory = z.infer<typeof entityMemorySchema>;
export type ArticleMemorySnapshot = z.infer<typeof articleMemorySnapshotSchema>;
export type MemoryTimeline = z.infer<typeof memoryTimelineDocumentSchema>;
export type MemoryMetadata = z.infer<typeof memoryMetadataSchema>;
