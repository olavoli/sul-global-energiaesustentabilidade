import type { EditorialPolicy, RiskMatrix } from "./orchestrator-schema";
import type { NewsSource } from "./schema";
import type { ClaimCandidate, EvidencePackage, StoryCluster } from "./story-schema";
import type { TranslationEntry } from "./translation-schema";

const rank = { unknown: -1, low: 0, medium: 1, high: 2, critical: 3 } as const;

function risk(level: keyof typeof rank, signals: string[], reasons: string[]) {
  return { level, signals, reasons };
}

function contains(text: string, terms: string[]): string[] {
  const value = text.toLowerCase();
  return terms.filter((term) => value.includes(term.toLowerCase()));
}

export function highestRisk(matrix: RiskMatrix): keyof typeof rank {
  return Object.values(matrix).reduce<keyof typeof rank>(
    (highest, current) => (rank[current.level] > rank[highest] ? current.level : highest),
    "unknown",
  );
}

export function evaluateRisks(
  cluster: StoryCluster,
  evidence: EvidencePackage,
  claims: ClaimCandidate[],
  translations: TranslationEntry[],
  sources: NewsSource[],
  policy: EditorialPolicy,
): RiskMatrix {
  const text = `${cluster.canonicalTitle} ${claims.map(({ text: value }) => value).join(" ")}`;
  const allegations = claims.filter(({ type }) => type === "allegation");
  const projections = claims.filter(({ type }) => ["projection", "estimate"].includes(type));
  const pendingTranslation = translations.some(
    ({ clusterId, status }) =>
      clusterId === cluster.id && !["approved", "not-required"].includes(status),
  );
  const blockedSource = sources.some(
    ({ id, trustTier }) => cluster.sourceIds.includes(id) && trustTier === "blocked",
  );
  const political = contains(text, policy.sensitiveTerms.political ?? []);
  const legal = contains(text, policy.sensitiveTerms.legal ?? []);
  const health = contains(text, policy.sensitiveTerms.healthSafety ?? []).filter(
    (term) =>
      term.toLowerCase() !== "health" ||
      !/\b(spacecraft|equipment|system)\b/i.test(text) ||
      /\b(accident|death|fatal|injury|patient|human)\b/i.test(text),
  );
  const financial = contains(text, policy.sensitiveTerms.financial ?? []);
  const privacy = contains(text, policy.sensitiveTerms.privacy ?? []);
  const promotional = evidence.promotionalSignals;
  const contradiction = evidence.contradictions;
  const single = cluster.independentSourceCount < 2;
  return {
    factual: contradiction.length
      ? risk("high", contradiction, ["Contradição ainda não revisada."])
      : single || projections.length
        ? risk(
            "medium",
            [...(single ? ["single-source"] : []), ...projections.map(({ id }) => id)],
            ["Evidência factual limitada ou projetada."],
          )
        : risk("low", [], ["Nenhum sinal factual alto detectado; revisão continua necessária."]),
    legal:
      allegations.length || legal.length
        ? risk(
            "high",
            [...legal, ...allegations.map(({ id }) => id)],
            ["Alegação ou sinal jurídico exige revisão humana."],
          )
        : risk("unknown", [], ["Risco jurídico não determinado automaticamente."]),
    reputational: allegations.length
      ? risk(
          "high",
          allegations.map(({ id }) => id),
          ["Potencial dano reputacional."],
        )
      : risk("unknown", [], ["Impacto reputacional desconhecido."]),
    political: political.length
      ? risk("high", political, ["Tema político/geopolítico sensível; o sistema não escolhe lado."])
      : risk("low", [], ["Nenhum termo político sensível detectado."]),
    scientific: cluster.topics.some((topic) => topic.includes("pesquisa"))
      ? risk("medium", ["research-topic"], ["Afirmação científica exige método e fonte primária."])
      : risk("unknown", [], ["Risco científico não aplicável ou desconhecido."]),
    financial: financial.length
      ? risk("high", financial, ["Possível impacto financeiro direto."])
      : risk("unknown", [], ["Impacto financeiro não determinado."]),
    regulatory: /\b(regulat|policy|política)\w*/i.test(text)
      ? risk("high", ["regulatory-language"], ["Decisão regulatória pode ser preliminar."])
      : risk("unknown", [], ["Risco regulatório desconhecido."]),
    healthSafety: health.length
      ? risk("critical", health, [
          "Saúde, acidente, morte ou segurança exigem revisão humana urgente.",
        ])
      : risk("unknown", [], ["Risco de saúde e segurança desconhecido."]),
    conflictOfInterest: promotional.length
      ? risk("medium", promotional, ["Possível interesse promocional da fonte."])
      : risk("unknown", [], ["Conflito de interesse não confirmado."]),
    translation: pendingTranslation
      ? risk(
          "high",
          ["unreviewed-translation"],
          ["Tradução não revisada não sustenta decisão factual."],
        )
      : risk("low", [], ["Nenhuma tradução pendente é usada."]),
    copyright: claims.some(({ text: value }) => value.length > 500)
      ? risk("critical", ["snippet-policy"], ["Limite de conteúdo violado."])
      : risk("low", [], ["Somente títulos/claims limitados foram usados."]),
    image: risk("unknown", [], ["Nenhuma imagem foi coletada; licença não avaliada nesta pauta."]),
    privacy: privacy.length
      ? risk("critical", privacy, ["Possível dado pessoal ou sensível."])
      : risk("unknown", [], ["Risco de privacidade não determinado."]),
  };
}

export function sourceBlocked(cluster: StoryCluster, sources: NewsSource[]): boolean {
  return sources.some(
    ({ id, trustTier }) => cluster.sourceIds.includes(id) && trustTier === "blocked",
  );
}
