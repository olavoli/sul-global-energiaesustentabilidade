import type { EntityMemory } from "../scientific-memory/contracts";
import type { CoverageScore } from "./contracts";
import type { ReturnTypeMetrics } from "./types";

const cap = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
export function calculateCoverage(memory: EntityMemory, metrics: ReturnTypeMetrics): CoverageScore {
  const dimensions = {
    yearsCovered: cap(memory.yearsActive * 20),
    observations: cap(memory.articleCount * 10),
    continuity: cap(metrics.continuity * 100),
    sourceDiversity: cap(new Set(memory.sources).size * 10),
    geographicDiversity: cap(new Set(memory.countries).size * 25),
    metadataIntegrity: 100,
    temporalConcentration: cap((1 - metrics.concentration) * 100),
    institutionDiversity: cap(new Set(memory.institutions).size * 20),
    journalDiversity: memory.type === "journal" ? 50 : cap(new Set(memory.sources).size * 10),
  };
  const score = cap(Object.values(dimensions).reduce((sum, value) => sum + value, 0) / 9);
  const limitations = [
    ...(metrics.missingYears.length ? ["Há lacunas na série anual."] : []),
    ...(metrics.concentration >= 0.8 ? ["A amostra tem concentração temporal elevada."] : []),
    ...(!memory.countries.length ? ["Cobertura geográfica ausente ou incompleta."] : []),
  ];
  return {
    score,
    dimensions,
    evidence: [
      `${memory.yearsActive} anos ativos`,
      `${memory.articleCount} observações`,
      `${memory.sources.length} fontes estruturais`,
    ],
    limitations,
    warnings: limitations.map((value) => value.toLocaleLowerCase("pt-BR")),
  };
}
