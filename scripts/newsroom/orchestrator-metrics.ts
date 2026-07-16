import type { EditorialDecision } from "./orchestrator-schema";

export interface OrchestratorMetrics {
  clustersEvaluated: number;
  byRecommendation: Record<string, number>;
  byRisk: Record<string, number>;
  commonBlockers: Record<string, number>;
  singleSource: number;
  multiSource: number;
  translationPending: number;
  imagesPending: number;
  insufficientSources: number;
  rejected: number;
  monitoring: number;
  approvedForPitch: number;
  recommendationHumanDivergence: number;
  averageCollectionToDecisionHours: number | null;
}

function count(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>(
    (result, value) => ({ ...result, [value]: (result[value] ?? 0) + 1 }),
    {},
  );
}

export function calculateOrchestratorMetrics(decisions: EditorialDecision[]): OrchestratorMetrics {
  return {
    clustersEvaluated: new Set(decisions.map(({ clusterId }) => clusterId)).size,
    byRecommendation: count(decisions.map(({ recommendation }) => recommendation)),
    byRisk: count(decisions.map(({ riskLevel }) => riskLevel)),
    commonBlockers: count(decisions.flatMap(({ blockers }) => blockers)),
    singleSource: decisions.filter(({ warnings }) => warnings.includes("single-source")).length,
    multiSource: decisions.filter(({ warnings }) => !warnings.includes("single-source")).length,
    translationPending: decisions.filter(({ blockers }) =>
      blockers.includes("unreviewed-translation"),
    ).length,
    imagesPending: decisions.filter(({ imageRisk }) => imageRisk === "unknown").length,
    insufficientSources: decisions.filter(
      ({ recommendation }) => recommendation === "request-more-sources",
    ).length,
    rejected: decisions.filter(({ status }) => status === "rejected").length,
    monitoring: decisions.filter(({ status }) => status === "monitoring").length,
    approvedForPitch: decisions.filter(({ status }) => status === "approved-for-pitch").length,
    recommendationHumanDivergence: decisions.filter(
      ({ humanDecision, recommendation }) =>
        humanDecision &&
        !recommendation.includes(humanDecision.replace("approve-for-", "prepare-")),
    ).length,
    // A decisão não carrega um instante de coleta confiável. Nulo evita
    // apresentar a data de publicação do feed como se fosse a data de coleta.
    averageCollectionToDecisionHours: null,
  };
}
