import type { CollectedItem, FreshnessBand, NewsSource } from "./schema";

export interface FreshnessPolicy {
  recentHours: number;
  currentHours: number;
  backgroundHours: number;
}

export const DEFAULT_FRESHNESS_POLICY: FreshnessPolicy = {
  recentHours: 48,
  currentHours: 7 * 24,
  backgroundHours: 30 * 24,
};

export function policyForSource(source: NewsSource): FreshnessPolicy {
  if (["academic", "university", "research-institute"].includes(source.sourceType)) {
    return { recentHours: 48, currentHours: 30 * 24, backgroundHours: 365 * 24 };
  }
  if (source.expectedFrequency === "monthly" || source.expectedFrequency === "irregular") {
    return { recentHours: 48, currentHours: 14 * 24, backgroundHours: 90 * 24 };
  }
  return DEFAULT_FRESHNESS_POLICY;
}

export function freshnessOf(
  dateInput: string | undefined,
  source: NewsSource,
  now = new Date(),
): { band: FreshnessBand; ageHours?: number } {
  if (!dateInput) return { band: "unknown" };
  const date = new Date(dateInput);
  if (Number.isNaN(date.valueOf())) return { band: "unknown" };
  const ageHours = Math.max(0, (now.valueOf() - date.valueOf()) / 3_600_000);
  const policy = policyForSource(source);
  const band =
    ageHours <= policy.recentHours
      ? "recent"
      : ageHours <= policy.currentHours
        ? "current"
        : ageHours <= policy.backgroundHours
          ? "background"
          : "stale";
  return { band, ageHours };
}

export function itemFreshness(
  item: Pick<CollectedItem, "publishedAt" | "updatedAt">,
  source: NewsSource,
  now = new Date(),
): { band: FreshnessBand; ageHours?: number } {
  const effective =
    item.updatedAt && new Date(item.updatedAt) > new Date(item.publishedAt)
      ? item.updatedAt
      : item.publishedAt;
  return freshnessOf(effective, source, now);
}
