import {
  AtomCollector,
  LocalFixtureCollector,
  RssCollector,
  type CollectionResult,
  type SourceCollector,
  parseFeedDocument,
} from "./collectors";
import { classifyItem } from "./classify";
import { deduplicate } from "./deduplicate";
import { scoreItem } from "./score";
import { queueItemSchema, type NewsSource, type QueueItem } from "./schema";

export interface SourceRun extends CollectionResult {
  source: NewsSource;
}

export function processFeedBody(
  body: string,
  source: NewsSource,
  collectedAt: string,
  maxItems = 50,
): SourceRun & { format: "rss" | "atom" } {
  const parsed = parseFeedDocument(body, maxItems);
  const expected = source.collectionMethod === "atom" ? "atom" : "rss";
  if (source.collectionMethod !== "local-fixture" && parsed.format !== expected) {
    throw new Error(`Formato alterado: esperado ${expected}, recebido ${parsed.format}.`);
  }
  const collector = parsed.format === "atom" ? new AtomCollector() : new RssCollector();
  return {
    source,
    format: parsed.format,
    ...collector.normalize(parsed.items, source, collectedAt),
  };
}

export async function collectSource(
  source: NewsSource,
  options: { fixturePath?: string; collectedAt?: string; maxItems?: number } = {},
): Promise<SourceRun> {
  let collector: SourceCollector;
  if (source.collectionMethod === "local-fixture") {
    if (!options.fixturePath) throw new Error("Fixture local exige caminho explícito.");
    const format = options.fixturePath.endsWith("atom.xml") ? "atom" : "rss";
    collector = new LocalFixtureCollector(options.fixturePath, format);
  } else {
    collector = source.collectionMethod === "atom" ? new AtomCollector() : new RssCollector();
  }
  const raw = await collector.collect(source, options.maxItems ?? 50);
  const normalized = collector.normalize(
    raw,
    source,
    options.collectedAt ?? new Date().toISOString(),
  );
  return { source, ...normalized };
}

export function buildQueue(runs: readonly SourceRun[], actor = "newsroom-cli"): QueueItem[] {
  const items = runs.flatMap((run) => run.accepted);
  const sourceById = new Map(runs.map((run) => [run.source.id, run.source]));
  const duplicateMatches = deduplicate(items);
  const duplicateById = new Map(duplicateMatches.map((match) => [match.relatedId, match]));
  const relatedByPrimary = new Map<string, string[]>();
  for (const match of duplicateMatches) {
    const related = relatedByPrimary.get(match.primaryId) ?? [];
    related.push(match.relatedId);
    relatedByPrimary.set(match.primaryId, related);
  }
  return items.map((item) => {
    const source = sourceById.get(item.sourceId);
    if (!source) throw new Error(`Fonte desconhecida: ${item.sourceId}.`);
    const topics = classifyItem(item, source);
    const duplicate = duplicateById.get(item.id);
    const relatedItems = duplicate ? [duplicate.primaryId] : (relatedByPrimary.get(item.id) ?? []);
    const relatedSources = relatedItems
      .map((id) => items.find((candidate) => candidate.id === id)?.sourceName)
      .filter((name): name is string => Boolean(name));
    const score = scoreItem(item, {
      source,
      topics,
      duplicate: Boolean(duplicate),
      relatedSourceCount: new Set(relatedSources).size,
      now: new Date(item.collectedAt),
    });
    const state = duplicate ? "duplicate" : "scored";
    return queueItemSchema.parse({
      id: item.id,
      state,
      item,
      topics,
      score,
      relatedItems,
      relatedSources,
      rejectionReasons: [],
      history: [
        { to: "collected", at: item.collectedAt, actor },
        { from: "collected", to: "normalized", at: item.collectedAt, actor },
        { from: "normalized", to: state, at: item.collectedAt, actor },
      ],
    });
  });
}

export function rescoreQueue(
  queue: readonly QueueItem[],
  sources: readonly NewsSource[],
): QueueItem[] {
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  return queue.map((entry) => {
    const source = sourceById.get(entry.item.sourceId);
    if (!source) throw new Error(`Fonte desconhecida: ${entry.item.sourceId}.`);
    const topics = classifyItem(entry.item, source);
    const score = scoreItem(entry.item, {
      source,
      topics,
      duplicate: entry.state === "duplicate",
      relatedSourceCount: new Set(entry.relatedSources).size,
      now: new Date(entry.item.collectedAt),
    });
    return queueItemSchema.parse({ ...entry, topics, score });
  });
}
