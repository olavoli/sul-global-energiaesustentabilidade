import type { ScientificDossier, ScientificWork } from "../scientific-radar/contracts";
import type { ArticleMemorySnapshot, EntityMemory, MemoryEntityType } from "./contracts";

export function historicalContext(
  work: ScientificWork,
  snapshots: ArticleMemorySnapshot[],
  entities: Record<MemoryEntityType, EntityMemory[]>,
) {
  const current = snapshots.find(({ articleId }) => articleId === work.id);
  if (!current) return undefined;
  const relatedEntities = Object.values(current.refs)
    .flat()
    .map(({ id }) => id)
    .sort();
  const relatedArticles = snapshots.filter(
    (snapshot) =>
      snapshot.articleId !== work.id &&
      Object.values(snapshot.refs)
        .flat()
        .some(({ id }) => relatedEntities.includes(id)),
  );
  const years = [...new Set([current, ...relatedArticles].map(({ year }) => year))].sort();
  const memories = Object.values(entities)
    .flat()
    .filter(({ canonicalId }) => relatedEntities.includes(canonicalId));
  return {
    firstSeen: Math.min(...memories.map(({ firstSeen }) => firstSeen), current.year),
    lastSeen: Math.max(...memories.map(({ lastSeen }) => lastSeen), current.year),
    previousArticles: relatedArticles.length,
    timeline: years.map((year) => ({
      year,
      count: [current, ...relatedArticles].filter((item) => item.year === year).length,
    })),
    relatedEntities,
  };
}

export function attachHistoricalContexts(
  dossiers: ScientificDossier[],
  works: ScientificWork[],
  snapshots: ArticleMemorySnapshot[],
  entities: Record<MemoryEntityType, EntityMemory[]>,
) {
  return dossiers.map((dossier) => {
    const work = works.find(({ id }) => id === dossier.scientificWorkId);
    return work
      ? { ...dossier, historicalContext: historicalContext(work, snapshots, entities) }
      : dossier;
  });
}
