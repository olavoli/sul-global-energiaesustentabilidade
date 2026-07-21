import {
  memoryEntityTypes,
  type ArticleMemorySnapshot,
  type EntityMemory,
  type MemoryEntityType,
  type MemoryTimeline,
} from "./contracts";

const sorted = (values: Iterable<string>) => [...new Set(values)].sort();
function references(snapshot: ArticleMemorySnapshot, type: MemoryEntityType, id: string) {
  return snapshot.refs[type].some((reference) => reference.id === id);
}

export function projectEntity(
  type: MemoryEntityType,
  canonicalId: string,
  snapshots: ArticleMemorySnapshot[],
): EntityMemory | undefined {
  const related = snapshots.filter((snapshot) => references(snapshot, type, canonicalId));
  if (!related.length) return undefined;
  const name = related
    .flatMap((snapshot) => snapshot.refs[type])
    .find(({ id }) => id === canonicalId)!.name;
  const years = [...new Set(related.map(({ year }) => year))].sort((a, b) => a - b);
  const timeline = years.map((year) => ({
    year,
    count: related.filter((item) => item.year === year).length,
  }));
  const latest = timeline.at(-1)!.count;
  const previous = timeline.at(-2)?.count;
  return {
    id: `memory-${canonicalId}`,
    canonicalId,
    type,
    name,
    firstSeen: years[0],
    lastSeen: years.at(-1)!,
    articleCount: related.length,
    timeline,
    categories: sorted(related.flatMap(({ refs }) => refs.category.map(({ id }) => id))),
    countries: sorted(related.flatMap(({ refs }) => refs.country.map(({ id }) => id))),
    institutions: sorted(related.flatMap(({ refs }) => refs.institution.map(({ id }) => id))),
    sources: sorted(related.map(({ articleId }) => articleId)),
    growthRate: previous ? Number((((latest - previous) / previous) * 100).toFixed(2)) : 0,
    firstAppearance: years[0],
    lastAppearance: years.at(-1)!,
    yearsActive: years.length,
    updatedAt: related
      .map(({ updatedAt }) => updatedAt)
      .sort()
      .at(-1)!,
  };
}

export function projectAll(
  snapshots: ArticleMemorySnapshot[],
): Record<MemoryEntityType, EntityMemory[]> {
  return Object.fromEntries(
    memoryEntityTypes.map((type) => {
      const ids = sorted(snapshots.flatMap(({ refs }) => refs[type].map(({ id }) => id)));
      return [type, ids.flatMap((id) => projectEntity(type, id, snapshots) ?? [])];
    }),
  ) as Record<MemoryEntityType, EntityMemory[]>;
}

export function projectTimeline(
  snapshots: ArticleMemorySnapshot[],
  entities: EntityMemory[],
): MemoryTimeline {
  const years = [...new Set(snapshots.map(({ year }) => year))].sort((a, b) => a - b);
  return {
    schemaVersion: 1,
    years: years.map((year) => ({
      year,
      articleCount: snapshots.filter((item) => item.year === year).length,
      newEntities: entities.filter(({ firstSeen }) => firstSeen === year).length,
      activeEntities: entities.filter(
        ({ firstSeen, lastSeen }) => firstSeen <= year && lastSeen >= year,
      ).length,
      inactiveEntities: entities.filter(({ lastSeen }) => lastSeen < year).length,
      recurringEntities: entities.filter(
        ({ timeline }) =>
          timeline.some((item) => item.year === year) && timeline.some((item) => item.year < year),
      ).length,
    })),
  };
}
