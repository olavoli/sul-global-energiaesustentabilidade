import { z } from "zod";
import type { Event } from "./ledger-types";
export const freePolicy = Object.freeze({
  dailyNeurons: 10000,
  safetyNeurons: 1000,
  callNeurons: 1153,
  maximumAgeMs: 30000,
  version: "free-only-v2-provider-limit",
});
const strictSnapshotSchema = z
  .object({
    accountHash: z.string().regex(/^[a-f0-9]{64}$/),
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    asOf: z.iso.datetime(),
    plan: z.literal("workers-free"),
    planEvidence: z.string().trim().min(10),
    allConsumersCovered: z.literal(true),
    authoritativeUpperBound: z.literal(true),
    usageUpperNeurons: z.number().int().nonnegative(),
    unobservedUpperNeurons: z.number().int().nonnegative(),
  })
  .strict();
const providerSnapshotSchema = z
  .object({
    accountHash: z.string().regex(/^[a-f0-9]{64}$/),
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    asOf: z.iso.datetime(),
    plan: z.literal("workers-free"),
    planEvidence: z.string().min(10),
    enforcement: z.literal("cloudflare-429-3036"),
    model: z.literal("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
    observedNeuronsEstimate: z.number().finite().nonnegative().nullable(),
    sharedUsage: z.literal("unknown-provider-enforced"),
  })
  .strict();
export const freeSnapshotSchema = z.union([strictSnapshotSchema, providerSnapshotSchema]);
export type FreeSnapshot = z.infer<typeof freeSnapshotSchema>;
export interface FreeQuotaSource {
  read(): Promise<unknown>;
}
export function executionMode(value: string | undefined): "paid" | "free-only" {
  if (value === undefined || value === "paid") return "paid";
  if (value === "free-only") return value;
  throw Error("execution-mode-invalid");
}
export function freeMargin(
  events: Event[],
  raw: unknown,
  calls: number,
  accountHash: string,
  now = new Date(),
) {
  const parsed = freeSnapshotSchema.safeParse(raw);
  if (!parsed.success) throw Error("free-quota-unverifiable");
  const s = parsed.data,
    age = now.getTime() - new Date(s.asOf).getTime();
  if (s.accountHash !== accountHash) throw Error("free-account-mismatch");
  if (s.day !== now.toISOString().slice(0, 10) || age < 0 || age > freePolicy.maximumAgeMs)
    throw Error("free-quota-stale");
  if (!Number.isSafeInteger(calls) || calls < 1) throw Error("free-reservation-invalid");
  if (
    events.some(
      (e) =>
        e.kind === "failed" &&
        e.data.code === "free-quota-exhausted" &&
        e.at.slice(0, 10) === s.day &&
        events.some(
          (q) =>
            q.kind === "free-quota-reserve" &&
            q.run === e.run &&
            q.data.accountHash === accountHash &&
            q.data.day === s.day,
        ),
    )
  )
    throw Error("free-quota-exhausted");
  const held = events
    .filter(
      (e) =>
        e.kind === "free-quota-reserve" &&
        e.data.accountHash === accountHash &&
        e.data.day === s.day,
    )
    .reduce((n, e) => n + Number(e.data.neurons), 0);
  let projected = held + calls * freePolicy.callNeurons + freePolicy.safetyNeurons;
  if ("enforcement" in s) {
    // This is a LOCAL cap, not an assertion that unobserved shared usage equals zero.
    // The Free provider enforces the account-wide quota; available estimates only reduce margin.
    if (s.observedNeuronsEstimate !== null) projected += Math.ceil(s.observedNeuronsEstimate);
  } else projected += s.usageUpperNeurons + s.unobservedUpperNeurons;
  if (!Number.isSafeInteger(projected) || projected > freePolicy.dailyNeurons)
    throw Error("free-quota-exhausted");
  return s;
}
/** Replay keeps every dispatch reservation, even after failure or administrative reconciliation. */
export function validateFreeReservation(events: Event[], e: Event) {
  const prior = events.slice(0, e.sequence - 1);
  if (
    e.data.neurons !== freePolicy.callNeurons ||
    typeof e.data.call !== "string" ||
    !["free-only-v1", freePolicy.version].includes(String(e.data.version)) ||
    prior.some((x) => x.kind === e.kind && x.run === e.run && x.data.call === e.data.call)
  )
    throw Error("free-reservation-invalid");
  const s = freeMargin(prior, e.data.snapshot, 1, String(e.data.accountHash), new Date(e.at));
  if (e.data.day !== s.day) throw Error("free-reservation-invalid");
}
