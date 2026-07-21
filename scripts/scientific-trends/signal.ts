import type { EntityMemory } from "../scientific-memory/contracts";
import { hash } from "../scientific-memory/identity";
import type { TrendSignal } from "./contracts";
import { calculateCoverage } from "./coverage";
import { calculateMetrics } from "./metrics";
import { trendPolicy, type TrendPolicy } from "./policy";
import { buildWarnings } from "./warnings";

export function buildTrendSignal(
  memory: EntityMemory,
  totalObserved: number,
  policy: TrendPolicy = trendPolicy,
): TrendSignal {
  const metrics = calculateMetrics(memory, totalObserved);
  const coverage = calculateCoverage(memory, metrics);
  const calculatedAt = memory.updatedAt;
  const partialPeriod =
    memory.lastSeen === Number(memory.updatedAt.slice(0, 4)) &&
    !memory.updatedAt.endsWith("12-31T23:59:59.999Z");
  const eligible =
    !partialPeriod &&
    memory.yearsActive >= policy.minimumDistinctYears &&
    memory.articleCount >= policy.minimumObservations &&
    metrics.concentration < 1 &&
    metrics.continuity > 0 &&
    coverage.score >= policy.minimumCoverageScore;
  const emerging =
    eligible &&
    metrics.positiveIntervals >= policy.emergingMinimumPositiveIntervals &&
    metrics.latestValue > metrics.baseline;
  const declining =
    eligible &&
    metrics.negativeIntervals >= policy.decliningMinimumNegativeIntervals &&
    metrics.latestValue < metrics.baseline;
  const status = classify({ eligible, emerging, declining, metrics, policy });
  const warnings = buildWarnings({
    memory,
    metrics,
    policy,
    coverageScore: coverage.score,
    calculatedAt,
    partialPeriod,
    preliminary: status === "emerging-candidate" || status === "declining-candidate",
  });
  const confidence = confidenceFor(memory, coverage.score, metrics.concentration, policy, eligible);
  return {
    id: `trend-${hash(`${memory.type}:${memory.canonicalId}:article-count`).slice(0, 16)}`,
    version: 1,
    entityType: memory.type,
    entityId: memory.canonicalId,
    entityName: memory.name,
    metric: "article-count",
    periodStart: memory.firstSeen,
    periodEnd: memory.lastSeen,
    observations: memory.articleCount,
    yearlySeries: metrics.yearlySeries,
    baseline: metrics.baseline,
    latestValue: metrics.latestValue,
    absoluteChange: metrics.absoluteChange,
    relativeChange: metrics.relativeChange,
    cagr: metrics.cagr,
    growthRate: metrics.growthRate,
    acceleration: metrics.acceleration,
    volatility: metrics.volatility,
    concentration: metrics.concentration,
    relativeShare: metrics.relativeShare,
    newParticipants: metrics.newParticipants,
    recurrence: metrics.recurrence,
    continuity: metrics.continuity,
    activeYears: memory.yearsActive,
    missingYears: metrics.missingYears,
    firstAppearance: memory.firstSeen,
    lastAppearance: memory.lastSeen,
    sampleSize: memory.articleCount,
    coverage,
    coverageScore: coverage.score,
    confidence,
    status,
    warnings,
    reasons: reasonsFor(status, eligible, metrics),
    sourceMemoryIds: [memory.id],
    policyVersion: policy.version,
    calculatedAt,
    history: [{ action: "created", actor: "deterministic-engine", note: "", at: calculatedAt }],
  };
}

function classify(input: {
  eligible: boolean;
  emerging: boolean;
  declining: boolean;
  metrics: ReturnType<typeof calculateMetrics>;
  policy: TrendPolicy;
}): TrendSignal["status"] {
  if (!input.eligible) return "insufficient-data";
  if (input.metrics.baseline === 0) return "review-required";
  if (input.metrics.volatility > input.policy.volatilityLimit) return "volatile";
  if (input.emerging) return "emerging-candidate";
  if (input.declining) return "declining-candidate";
  const change = input.metrics.relativeChange ?? 0;
  if (Math.abs(change) <= input.policy.stableRelativeChange) return "stable";
  return change > 0 ? "increasing" : "decreasing";
}
function confidenceFor(
  memory: EntityMemory,
  coverage: number,
  concentration: number,
  policy: TrendPolicy,
  eligible: boolean,
): TrendSignal["confidence"] {
  if (!eligible || memory.yearsActive < 3 || memory.articleCount < 5 || concentration === 1)
    return "none";
  if (
    memory.yearsActive >= policy.highConfidenceMinimumYears &&
    memory.articleCount >= policy.highConfidenceMinimumObservations &&
    coverage >= 85
  )
    return "high";
  return coverage >= 70 && memory.yearsActive >= 4 ? "moderate" : "low";
}
function reasonsFor(
  status: TrendSignal["status"],
  eligible: boolean,
  metrics: ReturnType<typeof calculateMetrics>,
) {
  if (!eligible) return ["Critérios mínimos da política não atendidos."];
  if (status === "volatile") return ["Volatilidade acima do limite versionado."];
  if (status.endsWith("candidate")) return ["Sinal preliminar elegível para revisão humana."];
  return [`Variação observada em ${metrics.yearlySeries.length} anos, sem previsão.`];
}
