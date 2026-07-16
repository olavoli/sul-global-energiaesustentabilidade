import { itemFreshness } from "./freshness";
import type { NewsSource, QuarantineEntry, QueueItem, SourceRuntime } from "./schema";

export interface SourceMetrics {
  sourceId: string;
  technicalAvailability?: number;
  averageResponseMs?: number;
  itemsCollected: number;
  itemsValid: number;
  itemsRejected: number;
  duplicates: number;
  missingDate: number;
  missingAuthor: number;
  missingDescription: number;
  averageRelevance?: number;
  promotionalRate?: number;
  quarantineRate?: number;
  averageFreshnessHours?: number;
  topicCoverage: Record<string, number>;
  institutionalTrust: NewsSource["trustTier"];
  countries: string[];
}

function ratio(part: number, total: number): number | undefined {
  return total > 0 ? part / total : undefined;
}

export function calculateSourceMetrics(
  source: NewsSource,
  runtime: SourceRuntime,
  queue: readonly QueueItem[],
  quarantine: readonly QuarantineEntry[],
  now = new Date(),
): SourceMetrics {
  const sourceItems = queue.filter((entry) => entry.item.sourceId === source.id);
  const relevance = sourceItems
    .map((entry) => entry.score?.dimensions.topicRelevance)
    .filter((value): value is number => value !== undefined);
  const freshness = sourceItems
    .map((entry) => itemFreshness(entry.item, source, now).ageHours)
    .filter((value): value is number => value !== undefined);
  const topicCoverage = { ...runtime.topicCounts };
  for (const entry of sourceItems) {
    for (const topic of entry.topics)
      topicCoverage[topic.topic] = (topicCoverage[topic.topic] ?? 0) + 1;
  }
  const quarantined = quarantine.filter((entry) => entry.sourceId === source.id).length;
  return {
    sourceId: source.id,
    technicalAvailability: ratio(runtime.successfulChecks, runtime.healthChecks),
    averageResponseMs: ratio(runtime.totalResponseMs, runtime.healthChecks),
    itemsCollected: runtime.itemsFetched,
    itemsValid: runtime.itemsValid,
    itemsRejected: runtime.itemsRejected,
    duplicates: runtime.duplicates,
    missingDate: runtime.missingDate,
    missingAuthor: runtime.missingAuthor,
    missingDescription: runtime.missingDescription,
    averageRelevance:
      relevance.length > 0
        ? relevance.reduce((sum, value) => sum + value, 0) / relevance.length
        : undefined,
    promotionalRate: ratio(runtime.promotionalItems, runtime.itemsValid),
    quarantineRate: ratio(quarantined, Math.max(1, runtime.collections)),
    averageFreshnessHours:
      freshness.length > 0
        ? freshness.reduce((sum, value) => sum + value, 0) / freshness.length
        : undefined,
    topicCoverage,
    institutionalTrust: source.trustTier,
    countries: source.countries,
  };
}
