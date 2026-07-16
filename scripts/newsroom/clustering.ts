import { createHash } from "node:crypto";

import type { NewsSource, QueueItem } from "./schema";
import type { ClusterRelation, StoryCluster } from "./story-schema";

const GENERIC = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "de",
  "do",
  "da",
  "e",
  "energia",
  "energy",
  "for",
  "from",
  "how",
  "in",
  "is",
  "new",
  "of",
  "on",
  "para",
  "the",
  "to",
  "with",
]);

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function words(value: string): Set<string> {
  return new Set(
    value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .match(/[a-z0-9]{3,}/g)
      ?.filter((word) => !GENERIC.has(word)) ?? [],
  );
}

export function titleSimilarity(left: string, right: string): number {
  const a = words(left);
  const b = words(right);
  const intersection = [...a].filter((word) => b.has(word)).length;
  const union = new Set([...a, ...b]).size;
  return union ? intersection / union : 0;
}

export function extractEntities(title: string): string[] {
  return [...new Set(title.match(/\b(?:[A-Z][A-Za-z0-9'-]{2,}|NASA|MIT|COP\d+)\b/g) ?? [])]
    .filter((value) => !["How", "The", "For", "New", "What", "Why", "Next"].includes(value))
    .sort();
}

function institution(source: NewsSource | undefined, item: QueueItem): string {
  if (!source) return item.item.sourceId;
  try {
    return new URL(source.homepage).hostname
      .replace(/^www\./, "")
      .split(".")
      .slice(-2)
      .join(".");
  } catch {
    return source.id;
  }
}

export function classifyRelation(
  left: QueueItem,
  right: QueueItem,
  sources: NewsSource[],
): ClusterRelation | undefined {
  const independent =
    institution(
      sources.find(({ id }) => id === left.item.sourceId),
      left,
    ) !==
    institution(
      sources.find(({ id }) => id === right.item.sourceId),
      right,
    );
  if (left.item.guid && left.item.guid === right.item.guid)
    return {
      itemId: left.id,
      relatedItemId: right.id,
      type: "exact-duplicate",
      confidence: 1,
      reasons: ["GUID idêntico."],
      independentInstitution: false,
    };
  if (
    (left.item.canonicalUrl ?? left.item.originalUrl) ===
    (right.item.canonicalUrl ?? right.item.originalUrl)
  )
    return {
      itemId: left.id,
      relatedItemId: right.id,
      type: "republication",
      confidence: 1,
      reasons: ["URL canônica idêntica."],
      independentInstitution: independent,
    };
  if (left.item.hash === right.item.hash)
    return {
      itemId: left.id,
      relatedItemId: right.id,
      type: "exact-duplicate",
      confidence: 1,
      reasons: ["Hash idêntico."],
      independentInstitution: independent,
    };
  const similarity = titleSimilarity(left.item.title, right.item.title);
  const sharedEntities = extractEntities(left.item.title).filter((entity) =>
    extractEntities(right.item.title).includes(entity),
  );
  const sharedTopics = left.topics.filter((topic) =>
    right.topics.some((other) => other.topic === topic.topic && other.score >= 2),
  );
  const hours =
    Math.abs(
      new Date(left.item.publishedAt).valueOf() - new Date(right.item.publishedAt).valueOf(),
    ) / 3_600_000;
  if (similarity >= 0.72 && sharedEntities.length > 0 && sharedTopics.length > 0 && hours <= 168) {
    return {
      itemId: left.id,
      relatedItemId: right.id,
      type: independent ? "independent-coverage" : "same-source-update",
      confidence: Math.min(0.99, similarity),
      reasons: [
        `Similaridade de título ${similarity.toFixed(2)}.`,
        `Entidades comuns: ${sharedEntities.join(", ")}.`,
        `Janela temporal: ${hours.toFixed(1)}h.`,
      ],
      independentInstitution: independent,
    };
  }
  if (similarity >= 0.3 && sharedEntities.length > 0 && hours <= 336) {
    const commentary = /\b(analysis|commentary|opinion|explainer|análise|opinião)\b/i.test(
      `${left.item.title} ${right.item.title}`,
    );
    return {
      itemId: left.id,
      relatedItemId: right.id,
      type: commentary ? "commentary-analysis" : "related-distinct",
      confidence: Math.min(0.7, similarity),
      reasons: [
        `Relação contextual sem evidência suficiente para agrupamento (${similarity.toFixed(2)}).`,
      ],
      independentInstitution: independent,
    };
  }
  return undefined;
}

function recommendation(score: number): StoryCluster["recommendation"] {
  if (score >= 65) return "priority";
  if (score >= 45) return "review";
  if (score >= 20) return "monitor";
  return "archive";
}

export function buildCluster(
  items: QueueItem[],
  sources: NewsSource[],
  relations: ClusterRelation[],
  now: string,
): StoryCluster {
  const ranked = [...items].sort(
    (a, b) => (b.score?.total ?? 0) - (a.score?.total ?? 0) || a.id.localeCompare(b.id),
  );
  const primary = ranked[0];
  const sourceIds = [...new Set(items.map(({ item }) => item.sourceId))].sort();
  const institutions = new Set(
    items.map((item) =>
      institution(
        sources.find(({ id }) => id === item.item.sourceId),
        item,
      ),
    ),
  );
  const dates = items.map(({ item }) => item.updatedAt ?? item.publishedAt).sort();
  const score =
    Math.round(
      (ranked.reduce((sum, item) => sum + (item.score?.total ?? 0), 0) / ranked.length) * 100,
    ) / 100;
  const primarySource = sources.find(({ id }) => id === primary.item.sourceId);
  const primaryCandidate =
    primarySource &&
    ["official", "regulatory", "academic", "university", "research-institute"].includes(
      primarySource.sourceType,
    )
      ? {
          itemId: primary.id,
          sourceId: primary.item.sourceId,
          confidence: "medium" as const,
          evidence: [
            `Tipo de fonte: ${primarySource.sourceType}.`,
            `Trust tier declarado: ${primarySource.trustTier}.`,
          ],
          limitations: [
            "Candidato inferido por metadados; o documento primário ainda exige verificação humana.",
          ],
        }
      : undefined;
  const ids = items.map(({ id }) => id).sort();
  return {
    id: `cluster-${hash(ids.join("|"))}`,
    canonicalTitle: primary.item.title,
    status: "open",
    primaryItemId: primary.id,
    itemIds: ids,
    sourceIds,
    sourceCount: sourceIds.length,
    independentSourceCount: institutions.size,
    languages: [...new Set(items.map(({ item }) => item.language))].sort(),
    countries: [
      ...new Set(
        sourceIds.flatMap((id) => sources.find((source) => source.id === id)?.countries ?? []),
      ),
    ].sort(),
    topics: [
      ...new Set(
        items.flatMap(({ topics }) =>
          topics.filter(({ score: value }) => value >= 2).map(({ topic }) => topic),
        ),
      ),
    ].sort(),
    entities: [...new Set(items.flatMap(({ item }) => extractEntities(item.title)))].sort(),
    firstPublishedAt: items.map(({ item }) => item.publishedAt).sort()[0],
    lastUpdatedAt: dates.at(-1) ?? dates[0],
    clusterScore: score,
    recommendation: recommendation(score),
    relations,
    primarySourceCandidate: primaryCandidate,
    uncertaintyNotes:
      institutions.size < 2 ? ["Sem confirmação por instituição independente."] : [],
    history: [
      {
        action: "cluster-created",
        at: now,
        actor: "deterministic-clusterer",
        reason: "Regras locais conservadoras v1.",
      },
    ],
  };
}

export function clusterQueue(
  queue: QueueItem[],
  sources: NewsSource[],
  now = new Date().toISOString(),
): StoryCluster[] {
  const parent = new Map(queue.map(({ id }) => [id, id]));
  const find = (id: string): string => (parent.get(id) === id ? id : find(parent.get(id) ?? id));
  const relations: ClusterRelation[] = [];
  for (let left = 0; left < queue.length; left += 1)
    for (let right = left + 1; right < queue.length; right += 1) {
      const found = classifyRelation(queue[left], queue[right], sources);
      if (!found) continue;
      relations.push(found);
      if (!["related-distinct", "commentary-analysis"].includes(found.type))
        parent.set(find(queue[right].id), find(queue[left].id));
    }
  const groups = new Map<string, QueueItem[]>();
  queue.forEach((item) => groups.set(find(item.id), [...(groups.get(find(item.id)) ?? []), item]));
  return [...groups.values()]
    .map((items) =>
      buildCluster(
        items,
        sources,
        relations.filter(
          (entry) =>
            items.some(({ id }) => id === entry.itemId) &&
            items.some(({ id }) => id === entry.relatedItemId),
        ),
        now,
      ),
    )
    .sort((a, b) => b.clusterScore - a.clusterScore || a.id.localeCompare(b.id));
}
