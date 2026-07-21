import type { StorageAdapter } from "../newsroom/storage/contracts";
import { storageAdapter } from "../newsroom/storage/runtime";
import {
  conceptDocumentSchema,
  conceptMetadataSchema,
  conceptRelationDocumentSchema,
  type Concept,
  type ConceptRelation,
} from "./contracts";

export const CONCEPTS_KEY = "scientific-concepts/concepts";
export const CONCEPT_RELATIONS_KEY = "scientific-concepts/relations";
export const CONCEPT_METADATA_KEY = "scientific-concepts/metadata";
const emptyConcepts = { schemaVersion: 1 as const, items: [] as Concept[] };
const emptyRelations = { schemaVersion: 1 as const, items: [] as ConceptRelation[] };

export async function loadConceptState(adapter: StorageAdapter = storageAdapter()) {
  const [concepts, relations, metadata] = await Promise.all([
    adapter.getDocument(CONCEPTS_KEY, conceptDocumentSchema, emptyConcepts),
    adapter.getDocument(CONCEPT_RELATIONS_KEY, conceptRelationDocumentSchema, emptyRelations),
    adapter.getDocument(CONCEPT_METADATA_KEY, conceptMetadataSchema, {
      schemaVersion: 1,
      taxonomyVersion: "1.0.0",
      checksum: "0".repeat(64),
      unresolvedTopics: [],
      updatedAt: null,
    }),
  ]);
  return {
    concepts: concepts.value.items,
    relations: relations.value.items,
    metadata: metadata.value,
    versions: {
      concepts: concepts.version,
      relations: relations.version,
      metadata: metadata.version,
    },
  };
}

export async function saveConceptState(input: {
  concepts: Concept[];
  relations: ConceptRelation[];
  taxonomyVersion: string;
  checksum: string;
  unresolvedTopics: string[];
  updatedAt: string;
  adapter?: StorageAdapter;
}) {
  const adapter = input.adapter ?? storageAdapter();
  const current = await loadConceptState(adapter);
  await adapter.transaction([
    {
      key: CONCEPTS_KEY,
      value: { schemaVersion: 1, items: input.concepts },
      expectedVersion: current.versions.concepts,
    },
    {
      key: CONCEPT_RELATIONS_KEY,
      value: { schemaVersion: 1, items: input.relations },
      expectedVersion: current.versions.relations,
    },
    {
      key: CONCEPT_METADATA_KEY,
      value: {
        schemaVersion: 1,
        taxonomyVersion: input.taxonomyVersion,
        checksum: input.checksum,
        unresolvedTopics: input.unresolvedTopics,
        updatedAt: input.updatedAt,
      },
      expectedVersion: current.versions.metadata,
    },
  ]);
}
