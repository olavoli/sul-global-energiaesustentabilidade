import type { TrendSignal } from "../../../scripts/scientific-trends/contracts";

export interface TrendFilters {
  type: string;
  status: string;
  confidence: string;
  warning: string;
  period: string;
  coverage: string;
  term: string;
}
export function filterScientificTrends(signals: TrendSignal[], filters: TrendFilters) {
  return signals.filter(
    (signal) =>
      (filters.type === "all" || signal.entityType === filters.type) &&
      (filters.status === "all" || signal.status === filters.status) &&
      (filters.confidence === "all" || signal.confidence === filters.confidence) &&
      (filters.warning === "all" || signal.warnings.some(({ code }) => code === filters.warning)) &&
      (filters.period === "all" ||
        signal.yearlySeries.some(({ year }) => year === Number(filters.period))) &&
      (filters.coverage === "all" ||
        (filters.coverage === "low" ? signal.coverageScore < 55 : signal.coverageScore >= 55)) &&
      (!filters.term.trim() ||
        `${signal.entityName} ${signal.entityId} ${signal.entityType}`
          .toLocaleLowerCase("pt-BR")
          .includes(filters.term.trim().toLocaleLowerCase("pt-BR"))),
  );
}
