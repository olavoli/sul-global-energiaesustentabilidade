import type { InboxEntry, NewsroomRun } from "./automation-schema";
import type { EditorialDecision } from "./orchestrator-schema";

export interface CleanupPlan {
  runIds: string[];
  inboxIds: string[];
  protectedDecisionIds: string[];
}

export function buildCleanupPlan(
  runs: NewsroomRun[],
  inbox: InboxEntry[],
  decisions: EditorialDecision[],
  input: { now: Date; runsDays: number; resolvedInboxDays: number },
): CleanupPlan {
  const runCutoff = input.now.valueOf() - input.runsDays * 86_400_000;
  const inboxCutoff = input.now.valueOf() - input.resolvedInboxDays * 86_400_000;
  return {
    runIds: runs
      .filter(({ finishedAt }) => finishedAt && new Date(finishedAt).valueOf() < runCutoff)
      .map(({ id }) => id),
    inboxIds: inbox
      .filter(
        ({ status, updatedAt }) =>
          ["resolved", "dismissed"].includes(status) && new Date(updatedAt).valueOf() < inboxCutoff,
      )
      .map(({ id }) => id),
    protectedDecisionIds: decisions
      .filter(({ humanDecision }) => Boolean(humanDecision))
      .map(({ id }) => id),
  };
}
