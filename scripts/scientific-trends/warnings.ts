import type { EntityMemory } from "../scientific-memory/contracts";
import type { TrendWarning } from "./contracts";
import type { TrendPolicy } from "./policy";
import type { ReturnTypeMetrics } from "./types";

const messages: Record<TrendWarning["code"], string> = {
  "insufficient-years": "Anos distintos abaixo do mínimo da política.",
  "insufficient-observations": "Observações abaixo do mínimo da política.",
  "single-year-concentration": "Todas as observações estão concentradas em um ano.",
  "missing-years": "A série contém anos sem observação.",
  "metadata-gaps": "Metadados estruturais incompletos.",
  "geographic-concentration": "Cobertura geográfica concentrada.",
  "institution-concentration": "Cobertura institucional concentrada.",
  "journal-concentration": "Cobertura de periódicos concentrada.",
  "source-concentration": "Fontes concentradas.",
  "volatile-series": "A série excede o limite de volatilidade.",
  "baseline-zero": "Baseline zero impede variação relativa e CAGR.",
  "partial-period": "O período mais recente é parcial e foi excluído da inferência.",
  "citation-count-volatile": "Contagens de citações não são usadas como tendência estável.",
  "coverage-too-low": "Cobertura abaixo do mínimo da política.",
  "policy-threshold-not-met": "Um ou mais critérios de elegibilidade não foram atendidos.",
  "manual-review-required": "O sinal exige revisão humana.",
  "preliminary-signal": "Candidato preliminar; não representa tendência consolidada.",
};
export function buildWarnings(input: {
  memory: EntityMemory;
  metrics: ReturnTypeMetrics;
  policy: TrendPolicy;
  coverageScore: number;
  calculatedAt: string;
  partialPeriod: boolean;
  preliminary: boolean;
}): TrendWarning[] {
  const codes: TrendWarning["code"][] = [];
  if (input.memory.yearsActive < input.policy.minimumDistinctYears)
    codes.push("insufficient-years");
  if (input.memory.articleCount < input.policy.minimumObservations)
    codes.push("insufficient-observations");
  if (input.metrics.concentration === 1) codes.push("single-year-concentration");
  if (input.metrics.missingYears.length) codes.push("missing-years");
  if (!input.memory.countries.length) codes.push("metadata-gaps");
  if (input.memory.countries.length <= 1) codes.push("geographic-concentration");
  if (input.memory.institutions.length <= 1) codes.push("institution-concentration");
  if (input.memory.type === "journal" || input.memory.sources.length <= 1)
    codes.push("journal-concentration");
  if (new Set(input.memory.sources).size <= 1) codes.push("source-concentration");
  if (input.metrics.volatility > input.policy.volatilityLimit) codes.push("volatile-series");
  if (input.metrics.baseline === 0) codes.push("baseline-zero");
  if (input.partialPeriod) codes.push("partial-period");
  if (input.coverageScore < input.policy.minimumCoverageScore) codes.push("coverage-too-low");
  if (codes.some((code) => code.startsWith("insufficient") || code === "single-year-concentration"))
    codes.push("policy-threshold-not-met");
  if (input.preliminary) codes.push("preliminary-signal", "manual-review-required");
  return [...new Set(codes)].map((code) => ({
    code,
    severity: code === "partial-period" || code === "baseline-zero" ? "info" : "warning",
    message: messages[code],
    evidence: evidence(code, input),
    detectedAt: input.calculatedAt,
    resolved: false,
  }));
}
function evidence(code: TrendWarning["code"], input: Parameters<typeof buildWarnings>[0]) {
  if (code === "insufficient-years")
    return [`${input.memory.yearsActive}/${input.policy.minimumDistinctYears} anos`];
  if (code === "insufficient-observations")
    return [`${input.memory.articleCount}/${input.policy.minimumObservations} observações`];
  if (code === "coverage-too-low")
    return [`${input.coverageScore}/${input.policy.minimumCoverageScore} pontos`];
  if (code === "missing-years") return input.metrics.missingYears.map(String);
  return [`entity:${input.memory.canonicalId}`];
}
