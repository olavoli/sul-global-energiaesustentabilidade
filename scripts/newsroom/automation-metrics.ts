import type { CircuitState, InboxEntry, NewsroomRun } from "./automation-schema";

export interface AutomationMetrics {
  runs: number;
  successes: number;
  failures: number;
  averageDurationMs: number | null;
  sourcesChecked: number;
  openCircuits: number;
  items: number;
  duplicates: number;
  quarantined: number;
  clusters: number;
  decisions: number;
  reviewsPending: number;
  reports: number;
  inbox: number;
  retries: number;
  budgetsReached: number;
  recoveries: number;
  dryRunApplyDivergence: number | null;
}

export function calculateAutomationMetrics(
  runs: NewsroomRun[],
  circuits: CircuitState[],
  inbox: InboxEntry[],
): AutomationMetrics {
  const finished = runs.filter(({ finishedAt }) => finishedAt);
  const retries = runs
    .flatMap(({ stages }) => stages)
    .reduce((total, stage) => {
      const value = stage.output.retries;
      return total + (typeof value === "number" ? value : 0);
    }, 0);
  return {
    runs: runs.length,
    successes: runs.filter(({ status }) =>
      ["completed", "completed-with-warnings"].includes(status),
    ).length,
    failures: runs.filter(({ status }) => status === "failed").length,
    averageDurationMs: finished.length
      ? finished.reduce((sum, { durationMs }) => sum + durationMs, 0) / finished.length
      : null,
    sourcesChecked: runs.reduce((sum, { sourceIds }) => sum + sourceIds.length, 0),
    openCircuits: circuits.filter(({ state }) => state === "open").length,
    items: runs.reduce((sum, { itemsFetched }) => sum + itemsFetched, 0),
    duplicates: runs.reduce((sum, { duplicates }) => sum + duplicates, 0),
    quarantined: runs.reduce((sum, value) => sum + value.quarantined, 0),
    clusters: runs.reduce((sum, { clustersCreated }) => sum + clustersCreated, 0),
    decisions: runs.reduce(
      (sum, { decisionsCreated, decisionsUpdated }) => sum + decisionsCreated + decisionsUpdated,
      0,
    ),
    reviewsPending: runs.at(-1)?.humanReviewsPending ?? 0,
    reports: runs.filter(({ checkpoints }) =>
      checkpoints.some(({ stage }) => stage === "daily-report"),
    ).length,
    inbox: inbox.length,
    retries,
    budgetsReached: runs.filter(({ stopReason }) => stopReason?.startsWith("budget:")).length,
    recoveries: runs.filter(({ runType }) => runType === "recovery").length,
    dryRunApplyDivergence: null,
  };
}
