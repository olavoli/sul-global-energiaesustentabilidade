import type { StorageAdapter } from "../newsroom/storage/contracts";
import { storageAdapter } from "../newsroom/storage/runtime";
import {
  memoryEntitiesDocumentSchema,
  memoryEntityTypes,
  memoryMetadataSchema,
  memoryTimelineDocumentSchema,
  type EntityMemory,
  type MemoryEntityType,
  type MemoryMetadata,
  type MemoryTimeline,
} from "./contracts";

export const MEMORY_KEYS: Record<MemoryEntityType, string> = {
  author: "scientific-memory/authors",
  institution: "scientific-memory/institutions",
  journal: "scientific-memory/journals",
  publisher: "scientific-memory/publishers",
  country: "scientific-memory/countries",
  category: "scientific-memory/categories",
};
export const MEMORY_TIMELINE_KEY = "scientific-memory/timeline";
export const MEMORY_METADATA_KEY = "scientific-memory/metadata";
const emptyEntities = { schemaVersion: 1 as const, items: [] as EntityMemory[] };
const emptyTimeline: MemoryTimeline = { schemaVersion: 1, years: [] };
const emptyMetadata: MemoryMetadata = {
  schemaVersion: 1,
  checksum: "0".repeat(64),
  articleCount: 0,
  entityCount: 0,
  updatedAt: null,
  snapshots: [],
};

export async function loadMemoryState(adapter: StorageAdapter = storageAdapter()) {
  const documents = await Promise.all(
    memoryEntityTypes.map((type) =>
      adapter.getDocument(MEMORY_KEYS[type], memoryEntitiesDocumentSchema, emptyEntities),
    ),
  );
  const [timeline, metadata] = await Promise.all([
    adapter.getDocument(MEMORY_TIMELINE_KEY, memoryTimelineDocumentSchema, emptyTimeline),
    adapter.getDocument(MEMORY_METADATA_KEY, memoryMetadataSchema, emptyMetadata),
  ]);
  return {
    entities: Object.fromEntries(
      memoryEntityTypes.map((type, index) => [type, documents[index].value.items]),
    ) as Record<MemoryEntityType, EntityMemory[]>,
    timeline: timeline.value,
    metadata: metadata.value,
    versions: {
      ...Object.fromEntries(
        memoryEntityTypes.map((type, index) => [MEMORY_KEYS[type], documents[index].version]),
      ),
      [MEMORY_TIMELINE_KEY]: timeline.version,
      [MEMORY_METADATA_KEY]: metadata.version,
    } as Record<string, number>,
  };
}

export async function writeMemoryState(input: {
  entities: Record<MemoryEntityType, EntityMemory[]>;
  timeline: MemoryTimeline;
  metadata: MemoryMetadata;
  changedTypes: MemoryEntityType[];
  versions: Record<string, number>;
  adapter?: StorageAdapter;
}) {
  const adapter = input.adapter ?? storageAdapter();
  await adapter.transaction([
    ...input.changedTypes.map((type) => ({
      key: MEMORY_KEYS[type],
      value: { schemaVersion: 1, items: input.entities[type] },
      expectedVersion: input.versions[MEMORY_KEYS[type]] ?? 0,
    })),
    {
      key: MEMORY_TIMELINE_KEY,
      value: input.timeline,
      expectedVersion: input.versions[MEMORY_TIMELINE_KEY] ?? 0,
    },
    {
      key: MEMORY_METADATA_KEY,
      value: input.metadata,
      expectedVersion: input.versions[MEMORY_METADATA_KEY] ?? 0,
    },
  ]);
}
