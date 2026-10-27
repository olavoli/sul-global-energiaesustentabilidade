import { z } from "zod";
import { fingerprint } from "./policy";
const money = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const call = z
  .object({
    locale: z.enum(["en", "es"]),
    index: z.number().int().nonnegative(),
    reserved: money,
    ids: z.array(z.string()).min(1),
  })
  .strict();
export const batchPlanSchema = z
  .object({
    version: z.literal("batch-v1"),
    month: z.string().regex(/^\d{4}-\d{2}$/),
    pool: z.enum(["regular", "contingency"]),
    history: z.string(),
    codeRevision: z.string().regex(/^[a-f0-9]{64}$/),
    policy: z.unknown(),
    pricing: z.unknown(),
    articles: z
      .array(
        z
          .object({
            article: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
            sourceRevision: z.string().regex(/^[a-f0-9]{64}$/),
            calls: z.array(call).min(2),
            reserved: money,
          })
          .strict(),
      )
      .min(1)
      .max(100),
    reserved: money,
  })
  .strict();
export type BatchPlan = z.infer<typeof batchPlanSchema>;
export const batchRunId = (batch: string, article: string) => fingerprint({ batch, article });
