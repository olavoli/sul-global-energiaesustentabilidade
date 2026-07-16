import { buildCluster } from "./clustering";
import type { NewsSource, QueueItem } from "./schema";
import type { StoryCluster } from "./story-schema";

export function mergeClusters(
  clusters: StoryCluster[],
  ids: string[],
  queue: QueueItem[],
  sources: NewsSource[],
  actor: string,
  reason: string,
  now: string,
): StoryCluster[] {
  if (ids.length < 2) throw new Error("Merge exige ao menos dois clusters.");
  const selected = clusters.filter(({ id }) => ids.includes(id));
  if (selected.length !== ids.length) throw new Error("Um ou mais clusters não foram encontrados.");
  const itemIds = new Set(selected.flatMap(({ itemIds }) => itemIds));
  const merged = buildCluster(
    queue.filter(({ id }) => itemIds.has(id)),
    sources,
    selected.flatMap(({ relations }) => relations),
    now,
  );
  merged.history = [
    ...selected.flatMap(({ history }) => history),
    { action: "manual-merge", at: now, actor, reason },
  ];
  return [...clusters.filter(({ id }) => !ids.includes(id)), merged];
}

export function splitCluster(
  clusters: StoryCluster[],
  id: string,
  itemIds: string[],
  queue: QueueItem[],
  sources: NewsSource[],
  actor: string,
  reason: string,
  now: string,
): StoryCluster[] {
  const target = clusters.find((cluster) => cluster.id === id);
  if (!target) throw new Error("Cluster não encontrado.");
  if (!itemIds.length || itemIds.some((itemId) => !target.itemIds.includes(itemId)))
    throw new Error("Itens de split inválidos.");
  const remaining = target.itemIds.filter((itemId) => !itemIds.includes(itemId));
  if (!remaining.length) throw new Error("Split não pode esvaziar o cluster original.");
  const build = (ids: string[]) =>
    buildCluster(
      queue.filter(({ id: itemId }) => ids.includes(itemId)),
      sources,
      [],
      now,
    );
  const parts = [build(remaining), build(itemIds)].map((cluster) => ({
    ...cluster,
    history: [...target.history, { action: "manual-split", at: now, actor, reason }],
  }));
  return [...clusters.filter((cluster) => cluster.id !== id), ...parts];
}
