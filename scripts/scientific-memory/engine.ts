import type { ScientificWork } from "../scientific-radar/contracts";
import type { StorageAdapter } from "../newsroom/storage/contracts";
import { storageAdapter } from "../newsroom/storage/runtime";
import { auditMemory } from "./audit";
import { memoryChecksum } from "./checksum";
import { memoryEntityTypes, type ArticleMemorySnapshot, type MemoryEntityType } from "./contracts";
import { projectAll, projectEntity, projectTimeline } from "./projection";
import { snapshotForWork } from "./snapshot";
import { loadMemoryState, writeMemoryState } from "./store";

export interface MemoryRunReport {
  mode: "incremental" | "rebuild";
  changed: boolean;
  articles: number;
  entities: number;
  affectedEntities: number;
  timelines: number;
  checksum: string;
  durationMs: number;
  audit?: "memory.created" | "memory.updated" | "memory.rebuilt";
}
const entityCount = (entities: ReturnType<typeof projectAll>) =>
  Object.values(entities).reduce((sum, items) => sum + items.length, 0);
const allIds = (snapshot: ArticleMemorySnapshot) =>
  memoryEntityTypes.flatMap((type) => snapshot.refs[type].map(({ id }) => `${type}:${id}`));

export async function rebuildScientificMemory(
  works: ScientificWork[],
  actor: string,
  adapter: StorageAdapter = storageAdapter(),
): Promise<MemoryRunReport> {
  const started = performance.now();
  const current = await loadMemoryState(adapter);
  const snapshots = works
    .map(snapshotForWork)
    .sort((a, b) => a.articleId.localeCompare(b.articleId));
  const entities = projectAll(snapshots);
  const timeline = projectTimeline(snapshots, Object.values(entities).flat());
  const checksum = memoryChecksum(entities, timeline);
  const count = entityCount(entities);
  const metadata = {
    schemaVersion: 1 as const,
    checksum,
    articleCount: snapshots.length,
    entityCount: count,
    updatedAt:
      snapshots
        .map(({ updatedAt }) => updatedAt)
        .sort()
        .at(-1) ?? null,
    snapshots,
  };
  await writeMemoryState({
    entities,
    timeline,
    metadata,
    changedTypes: [...memoryEntityTypes],
    versions: current.versions,
    adapter,
  });
  const action = current.metadata.articleCount ? "memory.rebuilt" : "memory.created";
  await auditMemory(adapter, {
    action,
    actor,
    at: metadata.updatedAt ?? new Date(0).toISOString(),
    checksum,
    articles: snapshots.length,
    entities: count,
    affectedEntities: count,
  });
  return {
    mode: "rebuild",
    changed: true,
    articles: snapshots.length,
    entities: count,
    affectedEntities: count,
    timelines: timeline.years.length,
    checksum,
    durationMs: Number((performance.now() - started).toFixed(2)),
    audit: action,
  };
}

export async function updateScientificMemory(
  works: ScientificWork[],
  actor: string,
  adapter: StorageAdapter = storageAdapter(),
): Promise<MemoryRunReport> {
  const started = performance.now();
  const current = await loadMemoryState(adapter);
  const incoming = new Map(works.map((work) => [work.id, snapshotForWork(work)]));
  const existing = new Map(current.metadata.snapshots.map((item) => [item.articleId, item]));
  const changedArticles = [...incoming.values()].filter(
    (item) => existing.get(item.articleId)?.fingerprint !== item.fingerprint,
  );
  if (!changedArticles.length)
    return {
      mode: "incremental",
      changed: false,
      articles: current.metadata.articleCount,
      entities: current.metadata.entityCount,
      affectedEntities: 0,
      timelines: current.timeline.years.length,
      checksum: current.metadata.checksum,
      durationMs: Number((performance.now() - started).toFixed(2)),
    };
  const affected = new Set(
    changedArticles.flatMap((item) => [
      ...allIds(item),
      ...(existing.get(item.articleId) ? allIds(existing.get(item.articleId)!) : []),
    ]),
  );
  const snapshots = [
    ...[...existing.values()].filter((item) => !incoming.has(item.articleId)),
    ...incoming.values(),
  ].sort((a, b) => a.articleId.localeCompare(b.articleId));
  const entities = structuredClone(current.entities);
  const changedTypes = new Set<MemoryEntityType>();
  for (const key of affected) {
    const [type, id] = key.split(":") as [MemoryEntityType, string];
    changedTypes.add(type);
    entities[type] = [
      ...entities[type].filter(({ canonicalId }) => canonicalId !== id),
      ...(projectEntity(type, id, snapshots) ? [projectEntity(type, id, snapshots)!] : []),
    ].sort((a, b) => a.id.localeCompare(b.id));
  }
  if (!current.metadata.articleCount) memoryEntityTypes.forEach((type) => changedTypes.add(type));
  const timeline = projectTimeline(snapshots, Object.values(entities).flat());
  const checksum = memoryChecksum(entities, timeline);
  const count = entityCount(entities);
  const metadata = {
    schemaVersion: 1 as const,
    checksum,
    articleCount: snapshots.length,
    entityCount: count,
    updatedAt:
      snapshots
        .map(({ updatedAt }) => updatedAt)
        .sort()
        .at(-1) ?? null,
    snapshots,
  };
  await writeMemoryState({
    entities,
    timeline,
    metadata,
    changedTypes: [...changedTypes],
    versions: current.versions,
    adapter,
  });
  const action = current.metadata.articleCount ? "memory.updated" : "memory.created";
  await auditMemory(adapter, {
    action,
    actor,
    at: metadata.updatedAt ?? new Date(0).toISOString(),
    checksum,
    articles: snapshots.length,
    entities: count,
    affectedEntities: affected.size,
  });
  return {
    mode: "incremental",
    changed: true,
    articles: snapshots.length,
    entities: count,
    affectedEntities: affected.size,
    timelines: timeline.years.length,
    checksum,
    durationMs: Number((performance.now() - started).toFixed(2)),
    audit: action,
  };
}
