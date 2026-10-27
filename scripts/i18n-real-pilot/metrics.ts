import type { Call } from "./budget";
/** Null means not measured; monetary calculations are not billing confirmations. */
export function summarize(calls: Call[]) {
  function stage(name: Call["stage"]) {
    const items = calls.filter((c) => c.stage === name);
    const measured = items.length > 0 && items.every((c) => c.usage !== null);
    const calculated = measured ? items.reduce((n, c) => n + (c.usageCalculatedUSD ?? 0), 0) : null;
    const reserved = items.reduce((n, c) => n + c.reservedUSD, 0);
    return {
      calls: items.length,
      attempts: items.reduce((n, c) => n + c.attempts, 0),
      inputTokens: measured ? items.reduce((n, c) => n + (c.usage?.inputTokens ?? 0), 0) : null,
      outputTokens: measured ? items.reduce((n, c) => n + (c.usage?.outputTokens ?? 0), 0) : null,
      neurons:
        items.length > 0 && items.every((c) => c.usage?.neurons != null)
          ? items.reduce((n, c) => n + (c.usage?.neurons ?? 0), 0)
          : null,
      durationMs: items.length ? items.reduce((n, c) => n + (c.durationMs ?? 0), 0) : null,
      reservedUSD: reserved,
      usageCalculatedUSD: calculated,
      differenceUSD: calculated === null ? null : calculated - reserved,
      providerReportedCostUSD:
        items.length && items.every((c) => c.usage?.providerReportedCostUSD != null)
          ? items.reduce((n, c) => n + (c.usage?.providerReportedCostUSD ?? 0), 0)
          : null,
    };
  }
  return { translation: stage("translation"), review: stage("review"), billingReconciled: false };
}
export function project(meanPerArticle: number | null) {
  return [10, 30, 50, 100].map((articles) => ({
    articles,
    usageBasedUSD: meanPerArticle === null ? null : articles * meanPerArticle,
    billingConfirmed: false,
  }));
}
