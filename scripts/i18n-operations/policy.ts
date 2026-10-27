import { cost, inputEstimate, rates } from "../i18n-real-pilot/budget";
import { hash } from "../i18n-simulation/pipeline";
export const policy = Object.freeze({
  version: "operations-v1",
  monthly: 10_000_000_000,
  regular: 8_000_000_000,
  contingency: 2_000_000_000,
  article: 150_000_000,
  maxOutput: 2500,
  maxInput: 12000,
});
export type Pool = "regular" | "contingency";
export const nanos = (usd: number) => {
  if (!Number.isFinite(usd) || usd < 0) throw new Error("invalid-money");
  const n = Math.ceil(usd * 1e9);
  if (!Number.isSafeInteger(n)) throw new Error("invalid-money");
  return n;
};
export const usd = (n: number) => n / 1e9;
export function reservation(payload: unknown) {
  const input = inputEstimate(payload);
  if (input > policy.maxInput) throw new Error("input-limit");
  return nanos(cost("cloudflare", input, policy.maxOutput));
}
export const fingerprint = (value: unknown) => hash(JSON.stringify(value));
export const pricing = rates.cloudflare;
