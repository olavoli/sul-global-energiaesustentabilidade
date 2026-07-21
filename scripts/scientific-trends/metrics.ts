import type { EntityMemory } from "../scientific-memory/contracts";

export function completeSeries(memory: EntityMemory) {
  const byYear = new Map(memory.timeline.map(({ year, count }) => [year, count]));
  return Array.from({ length: memory.lastSeen - memory.firstSeen + 1 }, (_, index) => ({
    year: memory.firstSeen + index,
    value: byYear.get(memory.firstSeen + index) ?? 0,
  }));
}
const mean = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / (values.length || 1);
export function calculateMetrics(memory: EntityMemory, totalObserved: number) {
  const yearlySeries = completeSeries(memory);
  const values = yearlySeries.map(({ value }) => value);
  const baseline = values[0] ?? 0;
  const latestValue = values.at(-1) ?? 0;
  const changes = values.slice(1).map((value, index) => value - values[index]);
  const average = mean(values);
  const volatility = average
    ? Math.sqrt(mean(values.map((value) => (value - average) ** 2))) / average
    : 0;
  const relativeChange = baseline ? (latestValue - baseline) / baseline : null;
  const periods = Math.max(0, yearlySeries.length - 1);
  const cagr =
    baseline > 0 && latestValue > 0 && periods > 0
      ? (latestValue / baseline) ** (1 / periods) - 1
      : null;
  const missingYears = yearlySeries.filter(({ value }) => value === 0).map(({ year }) => year);
  return {
    yearlySeries,
    baseline,
    latestValue,
    absoluteChange: latestValue - baseline,
    relativeChange,
    cagr,
    growthRate: relativeChange,
    acceleration: changes.length > 1 ? changes.at(-1)! - changes.at(-2)! : 0,
    volatility: Number(volatility.toFixed(4)),
    concentration: memory.articleCount ? Math.max(...values) / memory.articleCount : 0,
    relativeShare: totalObserved ? memory.articleCount / totalObserved : 0,
    newParticipants: memory.firstSeen === memory.lastSeen ? 1 : 0,
    recurrence: yearlySeries.length ? memory.yearsActive / yearlySeries.length : 0,
    continuity: yearlySeries.length
      ? (yearlySeries.length - missingYears.length) / yearlySeries.length
      : 0,
    missingYears,
    positiveIntervals: changes.filter((value) => value > 0).length,
    negativeIntervals: changes.filter((value) => value < 0).length,
  };
}
