import type { ScientificWork } from "../scientific-radar/contracts";
import {
  articleMemorySnapshotSchema,
  memoryEntityTypes,
  type ArticleMemorySnapshot,
  type MemoryEntityType,
} from "./contracts";
import { hash, memoryIdentity, stableStringify } from "./identity";

const unique = (values: string[]) =>
  [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
function names(work: ScientificWork, type: MemoryEntityType): string[] {
  if (type === "author") return work.authors;
  if (type === "institution") return work.institutions;
  if (type === "journal") return work.journal ? [work.journal] : [];
  if (type === "publisher") return work.publisher ? [work.publisher] : [];
  if (type === "country") return work.countries;
  return work.categories;
}

export function snapshotForWork(work: ScientificWork): ArticleMemorySnapshot {
  const refs = Object.fromEntries(
    memoryEntityTypes.map((type) => [
      type,
      unique(names(work, type)).map((name) => ({
        id: memoryIdentity(type, name).canonicalId,
        name,
      })),
    ]),
  ) as ArticleMemorySnapshot["refs"];
  const structural = {
    articleId: work.id,
    year: Number(work.publicationDate.slice(0, 4)),
    updatedAt: work.updatedAt,
    refs,
  };
  return articleMemorySnapshotSchema.parse({
    ...structural,
    fingerprint: hash(stableStringify(structural)),
  });
}
