import type { Pool } from "./policy";
import { z } from "zod";
export const money = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const eventSchema = z
  .object({
    sequence: z.number().int().positive(),
    previous: z.string(),
    at: z.string(),
    kind: z.enum([
      "reserve",
      "dispatch",
      "usage",
      "complete",
      "failed",
      "reconcile",
      "billing",
      "batch-reserve",
      "batch-start",
      "batch-cancel",
      "automatic-authorize",
      "automatic-reserve",
      "free-quota-reserve",
    ]),
    run: z.string(),
    data: z.record(z.string(), z.unknown()),
    digest: z.string(),
  })
  .strict();
export type Event = z.infer<typeof eventSchema>;
export interface Run {
  id: string;
  article: string;
  month: string;
  pool: Pool;
  reserved: number;
  calculated: number;
  confirmed: number | null;
  state: string;
  reconciled: boolean;
  calls: Set<string>;
  usage: Set<string>;
  batch?: string;
  authorization?: string;
  executionMode?: "free-only";
}
export interface Book {
  events: Event[];
  digest: string;
  runs: Map<string, Run>;
}
