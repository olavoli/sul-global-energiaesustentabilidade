import { z } from "zod";
import policy from "../../newsroom/policies/scientific-trends.json";
import { trendStatuses } from "./contracts";

const schema = z.object({
  version: z.number().int().positive(),
  minimumDistinctYears: z.number().int().positive(),
  minimumObservations: z.number().int().positive(),
  minimumConsecutiveYears: z.number().int().positive(),
  minimumCoverageScore: z.number().min(0).max(100),
  volatilityLimit: z.number().positive(),
  concentrationWarningThreshold: z.number().min(0).max(1),
  anomalyChangeThreshold: z.number().positive(),
  stableRelativeChange: z.number().nonnegative(),
  increaseRelativeChange: z.number().positive(),
  decreaseRelativeChange: z.number().negative(),
  emergingMinimumPositiveIntervals: z.number().int().positive(),
  decliningMinimumNegativeIntervals: z.number().int().positive(),
  maximumSeriesYears: z.number().int().positive(),
  highConfidenceMinimumYears: z.number().int().positive(),
  highConfidenceMinimumObservations: z.number().int().positive(),
  allowedStatuses: z.array(z.enum(trendStatuses)),
  warningSeverities: z.array(z.enum(["info", "warning", "blocker"])),
  partialPeriod: z.object({ include: z.boolean(), warningRequired: z.boolean() }),
});
export const trendPolicy = schema.parse(policy);
export type TrendPolicy = z.infer<typeof schema>;
