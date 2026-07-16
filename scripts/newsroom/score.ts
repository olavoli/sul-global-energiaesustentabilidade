import type { CollectedItem, EditorialScore, NewsSource, TopicResult } from "./schema";
import { itemFreshness } from "./freshness";

const TRUST_POINTS = { primary: 20, high: 15, medium: 10, contextual: 5, blocked: -50 } as const;
const STRATEGIC_TOPICS = new Set([
  "eficiência energética",
  "política energética",
  "regulação",
  "pesquisa e inovação",
  "sustentabilidade",
  "Sul Global",
]);

export interface ScoreContext {
  source: NewsSource;
  topics: TopicResult[];
  relatedSourceCount?: number;
  duplicate?: boolean;
  now?: Date;
}

export function scoreItem(item: CollectedItem, context: ScoreContext): EditorialScore {
  const now = context.now ?? new Date();
  const freshness = itemFreshness(item, context.source, now);
  const recency =
    freshness.band === "recent"
      ? 15
      : freshness.band === "current"
        ? 10
        : freshness.band === "background"
          ? 5
          : 0;
  const sourceTrust = TRUST_POINTS[context.source.trustTier];
  const classified = context.topics.filter(
    (topic) =>
      topic.topic !== "unclassified" &&
      topic.reasons.some((reason) => !reason.startsWith("fonte:")),
  );
  const topicRelevance = Math.min(
    15,
    classified.reduce((sum, topic) => sum + topic.score, 0),
  );
  const geographicRelevance = classified.some((topic) => topic.topic === "Sul Global") ? 10 : 0;
  const novelty = context.duplicate ? 0 : 10;
  const primarySourceBonus = context.source.trustTier === "primary" ? 10 : 0;
  const crossSourceConfirmation = Math.min(10, (context.relatedSourceCount ?? 0) * 5);
  const educationalPotential = /pesquisa|estudo|explica|efici[eê]ncia|inova/i.test(
    `${item.title} ${item.contentSnippet}`,
  )
    ? 5
    : 0;
  const strategicRelevance = classified.some((topic) => STRATEGIC_TOPICS.has(topic.topic)) ? 10 : 0;
  const duplicationPenalty = context.duplicate ? -20 : 0;
  const promotionalPenalty =
    context.source.sourceType === "company" ||
    /líder|revolucion|imperdível|compre|lançamento da empresa|\bcompany\b|\bentrepreneur\b/i.test(
      `${item.title} ${item.contentSnippet}`,
    )
      ? -15
      : 0;
  const uncertaintyPenalty = /rumor|não confirmado|supostamente|pode ter ocorrido/i.test(
    `${item.title} ${item.contentSnippet}`,
  )
    ? -10
    : 0;
  const irrelevantPenalty = classified.length === 0 ? -40 : 0;
  const dimensions = {
    recency,
    sourceTrust,
    topicRelevance,
    geographicRelevance,
    novelty,
    primarySourceBonus,
    crossSourceConfirmation,
    educationalPotential,
    strategicRelevance,
    duplicationPenalty,
    promotionalPenalty,
    uncertaintyPenalty,
    irrelevantPenalty,
  };
  const total = Object.values(dimensions).reduce((sum, value) => sum + value, 0);
  const reasons = [
    `Recência (${freshness.band}): ${recency}.`,
    `Confiança da fonte (${context.source.trustTier}): ${sourceTrust}.`,
    `Relevância temática rastreada: ${topicRelevance}.`,
    `Potencial educacional: ${educationalPotential}.`,
    `Relevância estratégica: ${strategicRelevance}.`,
    `Confirmação por fontes relacionadas: ${crossSourceConfirmation}.`,
  ];
  const penalties = Object.entries({
    duplicationPenalty,
    promotionalPenalty,
    uncertaintyPenalty,
    irrelevantPenalty,
  })
    .filter(([, value]) => value < 0)
    .map(([name, value]) => `${name}: ${value}.`);
  const recommendation =
    total < 0
      ? "reject"
      : total < 20
        ? "archive"
        : total < 40
          ? "monitor"
          : total < 60
            ? "review"
            : "priority";
  return { total, dimensions, reasons, penalties, recommendation };
}
