import type { ScientificDossier } from "../scientific-radar/contracts";
import type { TrendSignal } from "./contracts";

export function attachTrendStructure(
  dossier: ScientificDossier,
  signals: TrendSignal[],
): ScientificDossier {
  const entityIds = new Set([
    ...(dossier.authorIds ?? []),
    ...(dossier.institutionIds ?? []),
    ...(dossier.topicIds ?? []),
    ...(dossier.historicalContext?.relatedEntities ?? []),
  ]);
  const related = signals.filter(({ entityId }) => entityIds.has(entityId));
  if (!related.length) return dossier;
  const latest = [...related].sort((a, b) => b.calculatedAt.localeCompare(a.calculatedAt))[0];
  return {
    ...dossier,
    trendSignalIds: related.map(({ id }) => id).sort(),
    trendWarnings: [
      ...new Set(related.flatMap(({ warnings }) => warnings.map(({ code }) => code))),
    ].sort(),
    trendUpdatedAt: latest.calculatedAt,
    observedSeries: latest.yearlySeries,
    trendEligibility: related.some(({ status }) => status !== "insufficient-data")
      ? "eligible"
      : "insufficient-data",
    trendPolicyVersion: latest.policyVersion,
  };
}
