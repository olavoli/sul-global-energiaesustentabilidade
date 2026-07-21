import type { StorageAdapter } from "../newsroom/storage/contracts";
import { storageAdapter } from "../newsroom/storage/runtime";
import {
  canonicalEntitiesDocumentSchema,
  duplicateCandidatesDocumentSchema,
  type CanonicalEntity,
  type DuplicateCandidate,
} from "./contracts";

export const CANONICAL_KEYS = {
  author: "entity-resolution/canonical-author",
  institution: "entity-resolution/canonical-institution",
  journal: "entity-resolution/canonical-journal",
  publisher: "entity-resolution/canonical-publisher",
  category: "entity-resolution/canonical-category",
  country: "entity-resolution/canonical-country",
  funder: "entity-resolution/canonical-funder",
} as const;
export const DUPLICATE_CANDIDATES_KEY = "entity-resolution/duplicate-candidates";
const emptyEntities = { schemaVersion: 1 as const, items: [] as CanonicalEntity[] };
const emptyCandidates = { schemaVersion: 1 as const, items: [] as DuplicateCandidate[] };

export async function loadCanonicalEntities(adapter: StorageAdapter = storageAdapter()) {
  const documents = await Promise.all(
    Object.values(CANONICAL_KEYS).map((key) =>
      adapter.getDocument(key, canonicalEntitiesDocumentSchema, emptyEntities),
    ),
  );
  return {
    value: { schemaVersion: 1 as const, items: documents.flatMap(({ value }) => value.items) },
    versions: Object.fromEntries(
      Object.values(CANONICAL_KEYS).map((key, index) => [key, documents[index].version]),
    ),
  };
}
export const loadDuplicateCandidates = (adapter: StorageAdapter = storageAdapter()) =>
  adapter.getDocument(DUPLICATE_CANDIDATES_KEY, duplicateCandidatesDocumentSchema, emptyCandidates);

export async function saveResolutionState(
  entities: CanonicalEntity[],
  candidates: DuplicateCandidate[],
  adapter: StorageAdapter = storageAdapter(),
) {
  const [currentEntities, currentCandidates] = await Promise.all([
    loadCanonicalEntities(adapter),
    loadDuplicateCandidates(adapter),
  ]);
  await adapter.transaction([
    ...Object.entries(CANONICAL_KEYS).map(([type, key]) => ({
      key,
      value: { schemaVersion: 1, items: entities.filter((entity) => entity.type === type) },
      expectedVersion: currentEntities.versions[key] ?? 0,
    })),
    {
      key: DUPLICATE_CANDIDATES_KEY,
      value: { schemaVersion: 1, items: candidates },
      expectedVersion: currentCandidates.version,
    },
  ]);
}
