import { createHash } from "node:crypto";

import type { NewsSource, QueueItem } from "./schema";
import type { ClaimCandidate, EvidencePackage, StoryCluster } from "./story-schema";

function id(prefix: "claim" | "evidence", value: string): string {
  return `${prefix}-${createHash("sha256").update(value).digest("hex").slice(0, 16)}`;
}

function claimType(text: string): ClaimCandidate["type"] {
  const value = text.toLowerCase();
  if (/\b(may|might|could|forecast|project|expect|prevê|pode|poderia)\b/.test(value))
    return "projection";
  if (/\b(announc\w*|launch\w*|release\w*|anuncia\w*|lança\w*)\b/.test(value))
    return "announcement";
  if (/\b(allege|accus|alega|acus)\w*/.test(value)) return "allegation";
  if (/\b(opinion|argues?|believes?|opinião|defende)\b/.test(value)) return "opinion";
  if (/\b(estimat|approximately|cerca de)\b/.test(value)) return "estimate";
  return "unknown";
}

export function extractClaims(cluster: StoryCluster, queue: QueueItem[]): ClaimCandidate[] {
  const groups = new Map<string, QueueItem[]>();
  cluster.itemIds.forEach((itemId) => {
    const entry = queue.find(({ id: value }) => value === itemId);
    if (!entry) throw new Error(`Item ausente no cluster: ${itemId}.`);
    const key = entry.item.title
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .replace(/\W+/g, " ")
      .trim();
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  });
  return [...groups.values()].map((entries) => {
    const text = entries[0].item.title.slice(0, 500);
    const sourceIds = [...new Set(entries.map(({ item }) => item.sourceId))];
    return {
      id: id("claim", `${cluster.id}|${text}`),
      clusterId: cluster.id,
      text,
      type: claimType(text),
      sourceItemIds: entries.map(({ id: itemId }) => itemId),
      sourceIds,
      independentSourceCount: sourceIds.length,
      status: sourceIds.length > 1 ? "multi-source" : "needs-review",
      confidence: sourceIds.length > 1 ? "medium" : "low",
      evidence: ["Extraído somente de título atribuído à fonte original."],
      uncertainties: [
        "Não confirmado; equivalência textual não substitui verificação independente.",
      ],
    };
  });
}

export function buildEvidencePackage(
  cluster: StoryCluster,
  queue: QueueItem[],
  catalog: NewsSource[],
  generatedAt: string,
): EvidencePackage {
  const items = cluster.itemIds.map((itemId) => {
    const entry = queue.find(({ id }) => id === itemId);
    if (!entry) throw new Error(`Item ausente: ${itemId}.`);
    return entry;
  });
  const claims = extractClaims(cluster, queue);
  const titles = items.map(({ item }) => item.title.toLowerCase());
  const contradictions =
    titles.some((title) => /\b(increase|rise|aument)\w*/.test(title)) &&
    titles.some((title) => /\b(decrease|fall|reduz|queda)\w*/.test(title))
      ? ["Possível conflito direcional entre títulos; exige verificação humana."]
      : [];
  const sources = items.map(({ item }) => {
    const source = catalog.find(({ id: sourceId }) => sourceId === item.sourceId);
    return {
      id: item.sourceId,
      name: item.sourceName,
      url: item.originalUrl,
      institution: source ? new URL(source.homepage).hostname : item.sourceId,
    };
  });
  return {
    id: id("evidence", cluster.id),
    clusterId: cluster.id,
    generatedAt,
    primarySourceCandidate: cluster.primarySourceCandidate,
    sources,
    chronology: items
      .map(({ id: itemId, item }) => ({ itemId, publishedAt: item.publishedAt }))
      .sort((a, b) => a.publishedAt.localeCompare(b.publishedAt)),
    claims,
    confirmations:
      cluster.independentSourceCount > 1
        ? ["Há instituições distintas no cluster; equivalência factual ainda requer revisão."]
        : [],
    contradictions,
    uncertainties: [
      ...cluster.uncertaintyNotes,
      "O pacote não valida fatos nem substitui consulta às fontes.",
    ],
    promotionalSignals: items
      .filter(({ score }) => (score?.dimensions.promotionalPenalty ?? 0) < 0)
      .map(({ id: itemId }) => `Sinal promocional no item ${itemId}.`),
    editorialRisks: [
      "Títulos são alegações atribuídas, não fatos confirmados.",
      "Não há tradução aprovada automaticamente.",
    ],
    topics: cluster.topics,
    countries: cluster.countries,
    clusterScore: cluster.clusterScore,
    recommendation: cluster.recommendation,
    pendingQuestions: [
      "Qual documento primário sustenta cada alegação?",
      "Há confirmação institucional independente?",
      "Há contexto ou conflito de interesse relevante?",
    ],
    originalUrls: [...new Set(items.map(({ item }) => item.originalUrl))],
  };
}

export function buildEvidencePackages(
  clusters: StoryCluster[],
  queue: QueueItem[],
  catalog: NewsSource[],
  now: string,
): { claims: ClaimCandidate[]; packages: EvidencePackage[] } {
  const packages = clusters.map((cluster) => buildEvidencePackage(cluster, queue, catalog, now));
  return { claims: packages.flatMap(({ claims }) => claims), packages };
}
