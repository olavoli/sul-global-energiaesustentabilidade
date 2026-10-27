import { z } from "zod";
import { policy, pricing, fingerprint, nanos } from "./policy";
import { cost } from "../i18n-real-pilot/budget";
export const automaticPolicySchema = z
  .object({
    version: z.literal("continuous-v1"),
    historyAnchor: z.string().regex(/^[a-f0-9]{64}$/),
    enabled: z.literal(true),
    authorizedBy: z.string().trim().min(2),
    validUntil: z.iso.datetime(),
    monthlyNanoUSD: z.literal(10_000_000_000),
    regularNanoUSD: z.literal(8_000_000_000),
    contingencyNanoUSD: z.literal(2_000_000_000),
    articleNanoUSD: z.literal(150_000_000),
    externalMonthlyReserveNanoUSD: z.number().int().nonnegative().max(10_000_000_000),
    maxAttempts: z.number().int().min(1).max(2),
    unknownBilling: z.literal("retain-and-cover-worst-case"),
    exclusiveProviderBudget: z.literal(true),
    providerBudgetEvidence: z.string().trim().min(10),
    model: z.literal("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
    pricing: z.object({ input: z.literal(0.293), output: z.literal(2.253) }),
    maxInputTokens: z.literal(24000),
    maxOutputTokens: z.literal(2500),
  })
  .strict();
export type AutomaticPolicy = z.infer<typeof automaticPolicySchema>;
export interface FinanceRun {
  id: string;
  article: string;
  month: string;
  pool: "regular" | "contingency";
  reserved: number;
  calculated: number;
  confirmed: number | null;
  calls: Set<string>;
  usage: Set<string>;
}
export const maximumCallReserve = () => nanos(cost("cloudflare", 24000, policy.maxOutput));
export function financialExposure(r: FinanceRun) {
  return Math.max(
    r.reserved,
    r.calculated,
    r.confirmed ?? 0,
    r.confirmed === null ? (r.calls.size - r.usage.size) * maximumCallReserve() : 0,
  );
}
export function continuousBudget(
  runs: FinanceRun[],
  article: string,
  month: string,
  pool: "regular" | "contingency",
  reserve: number,
  authorization: AutomaticPolicy,
) {
  if (!Number.isSafeInteger(reserve) || reserve <= 0) throw Error("automatic-invalid-reserve");
  if (JSON.stringify(authorization.pricing) !== JSON.stringify(pricing))
    throw Error("automatic-pricing-stale");
  const sum = (xs: FinanceRun[]) => xs.reduce((n, r) => n + financialExposure(r), 0);
  const carried = runs.filter((r) => r.month !== month && r.confirmed === null && r.calls.size > 0);
  if (sum(runs.filter((r) => r.article === article)) + reserve > authorization.articleNanoUSD)
    throw Error("article-budget-exceeded");
  if (
    sum(runs.filter((r) => r.month === month)) +
      sum(carried) +
      authorization.externalMonthlyReserveNanoUSD +
      reserve >
    authorization.monthlyNanoUSD
  )
    throw Error("monthly-budget-exceeded");
  if (
    sum(runs.filter((r) => r.month === month && r.pool === pool)) +
      sum(carried.filter((r) => r.pool === pool)) +
      (pool === "regular" ? authorization.externalMonthlyReserveNanoUSD : 0) +
      reserve >
    (pool === "regular" ? authorization.regularNanoUSD : authorization.contingencyNanoUSD)
  )
    throw Error("pool-budget-exceeded");
  return {
    carriedUnknownNanoUSD: sum(carried),
    currentExposureNanoUSD: sum(runs.filter((r) => r.month === month)),
  };
}
export function authorizeContinuous(raw: unknown, now = new Date()) {
  const p = automaticPolicySchema.parse(raw);
  if (new Date(p.validUntil) <= now) throw Error("automatic-authorization-expired");
  return { policy: p, id: fingerprint(p) };
}
