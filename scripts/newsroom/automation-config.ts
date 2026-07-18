import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { z } from "zod";
import bundledAutomationPolicy from "../../newsroom/policies/daily-automation.json";

const budgetSchema = z.object({
  sourcesPerRun: z.number().int().positive(),
  itemsPerSource: z.number().int().positive(),
  totalItems: z.number().int().positive(),
  downloadBytes: z.number().int().positive(),
  sourceDurationMs: z.number().int().positive(),
  totalDurationMs: z.number().int().positive(),
  redirects: z.number().int().nonnegative(),
  retries: z.number().int().nonnegative().max(3),
  consecutiveErrors: z.number().int().positive(),
  quarantine: z.number().int().positive(),
  clusters: z.number().int().positive(),
  translationsQueued: z.number().int().nonnegative(),
  decisionsGenerated: z.number().int().positive(),
});

export const automationPolicySchema = z.object({
  version: z.string().min(1),
  lockTtlMs: z.number().int().positive(),
  budgets: budgetSchema,
  circuit: z.object({
    failureThreshold: z.number().int().positive(),
    openDurationMs: z.number().int().positive(),
    halfOpenAttempts: z.number().int().positive(),
  }),
  retention: z.object({
    runsDays: z.number().int().positive(),
    reportsDays: z.number().int().positive(),
    backupsDays: z.number().int().positive(),
    auditDays: z.number().int().positive(),
    resolvedInboxDays: z.number().int().positive(),
    discardedQuarantineDays: z.number().int().positive(),
    temporaryHours: z.number().int().positive(),
  }),
});

export type AutomationPolicy = z.infer<typeof automationPolicySchema>;

export interface AutomationSwitches {
  newsroom: boolean;
  collection: boolean;
  translation: boolean;
  orchestration: boolean;
  notifications: boolean;
  schedule: boolean;
}

const DEFAULT_AUTOMATION_POLICY_PATH = resolve("newsroom/policies/daily-automation.json");

function enabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

export function resolveAutomationSwitches(
  environment: Record<string, string | undefined> = process.env,
): AutomationSwitches {
  return {
    newsroom: enabled(environment.NEWSROOM_ENABLED),
    collection: enabled(environment.NEWSROOM_COLLECTION_ENABLED),
    translation: enabled(environment.NEWSROOM_TRANSLATION_ENABLED),
    orchestration: enabled(environment.NEWSROOM_ORCHESTRATION_ENABLED),
    notifications: enabled(environment.NEWSROOM_NOTIFICATIONS_ENABLED),
    schedule: enabled(environment.NEWSROOM_SCHEDULE_ENABLED),
  };
}

export async function loadAutomationPolicy(
  path = DEFAULT_AUTOMATION_POLICY_PATH,
): Promise<AutomationPolicy> {
  const input: unknown =
    resolve(path) === DEFAULT_AUTOMATION_POLICY_PATH
      ? bundledAutomationPolicy
      : JSON.parse(await readFile(path, "utf8"));
  return automationPolicySchema.parse(input);
}
