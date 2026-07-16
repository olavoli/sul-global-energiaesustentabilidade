import type { CliContext, CommandResult } from "./cli-types";
import { executeDailyPipeline } from "./daily-pipeline";
import { reportMarkdown } from "./daily-report";
import { calculateAutomationMetrics } from "./automation-metrics";
import { loadAutomationPolicy } from "./automation-config";
import type { InboxEntry, RunMode } from "./automation-schema";
import { loadDecisions } from "./decision-store";
import { buildCleanupPlan } from "./retention";
import { loadInbox, saveInbox, updateInboxEntry } from "./review-inbox";
import { emptyCircuit, loadCircuits, saveCircuits } from "./retry-circuit";
import { finishRun, loadRuns, resumableStage, saveRuns } from "./run-store";

const COMMANDS = new Set([
  "daily",
  "report",
  "inbox:list",
  "inbox:show",
  "inbox:open",
  "inbox:defer",
  "inbox:resolve",
  "inbox:dismiss",
  "run:list",
  "run:show",
  "run:resume",
  "run:cancel",
  "run:cleanup",
  "circuit:list",
  "circuit:reset",
  "automation:stats",
  "stats",
]);

export function isAutomationCommand(command: string): boolean {
  return COMMANDS.has(command);
}

function modeFor(context: CliContext): RunMode {
  if (context.has("validate-only")) return "validate-only";
  if (context.has("collect-only")) return "collect-only";
  if (context.has("process-existing")) return "process-existing";
  if (context.has("report-only")) return "report-only";
  return context.apply ? "apply" : "dry-run";
}

async function dailyCommand(context: CliContext): Promise<CommandResult> {
  const result = await executeDailyPipeline({
    mode: modeFor(context),
    apply: context.apply,
    actor: context.actor,
    environment: process.env.NEWSROOM_ENVIRONMENT ?? "local",
    runType: process.env.GITHUB_ACTIONS === "true" ? "scheduled" : "manual",
    overrideLock: context.has("override-lock"),
  });
  console.log(
    `${result.run.id} | ${result.run.status} | modo=${result.run.mode} | dryRun=${result.run.dryRun}`,
  );
  console.log(reportMarkdown(result.report));
  return {
    source: "daily-pipeline",
    itemsFetched: result.run.itemsFetched,
    itemsAccepted: result.run.itemsAccepted,
    itemsRejected: result.run.itemsRejected,
    duplicates: result.run.duplicates,
    clustersCreated: result.run.clustersCreated,
    translationsQueued: result.run.translationsQueued,
    decisionsEvaluated: result.run.decisionsCreated + result.run.decisionsUpdated,
    errors: result.run.errors,
  };
}

async function inboxCommand(context: CliContext): Promise<CommandResult> {
  const entries = await loadInbox();
  const filtered = entries.filter(
    (entry) =>
      (!context.option("risk") || entry.risk === context.option("risk")) &&
      (!context.option("topic") || entry.topics.includes(context.option("topic") ?? "")) &&
      (!context.option("source") || entry.sources.includes(context.option("source") ?? "")) &&
      (!context.option("date") || entry.publishedAt.startsWith(context.option("date") ?? "")),
  );
  if (context.command === "inbox:list") {
    filtered
      .sort((a, b) => b.priority - a.priority)
      .forEach((entry) =>
        console.log(
          `${entry.id} | ${entry.status} | risco=${entry.risk} | ${entry.recommendation} | ${entry.clusterId}`,
        ),
      );
    if (!filtered.length) console.log("Inbox vazia; nenhuma pauta ou publicaÃ§Ã£o criada.");
    return { itemsRead: filtered.length };
  }
  const id = context.positional[0];
  const index = entries.findIndex((entry) => entry.id === id);
  if (index < 0) throw new Error(`Entrada nÃ£o encontrada: ${id ?? "(id ausente)"}.`);
  if (context.command === "inbox:show") {
    console.log(JSON.stringify(entries[index], null, 2));
    return { itemsRead: 1 };
  }
  const statuses: Record<string, InboxEntry["status"]> = {
    "inbox:open": "opened",
    "inbox:defer": "deferred",
    "inbox:resolve": "resolved",
    "inbox:dismiss": "dismissed",
  };
  entries[index] = updateInboxEntry(
    entries[index],
    statuses[context.command],
    context.option("actor") ?? "",
    context.option("notes") ?? "",
    new Date().toISOString(),
  );
  if (context.apply) await saveInbox(entries);
  else console.log("Dry-run: inbox nÃ£o alterada.");
  return { itemsRead: 1 };
}

async function runCommand(context: CliContext): Promise<CommandResult> {
  const runs = await loadRuns();
  if (context.command === "run:list") {
    runs.forEach((run) =>
      console.log(`${run.id} | ${run.status} | ${run.mode} | ${run.startedAt} | ${run.actor}`),
    );
    if (!runs.length) console.log("Nenhuma execuÃ§Ã£o aplicada registrada.");
    return { itemsRead: runs.length };
  }
  const id = context.positional[0];
  const index = runs.findIndex((run) => run.id === id);
  if (context.command === "run:cleanup") {
    const policy = await loadAutomationPolicy();
    const inbox = await loadInbox();
    const plan = buildCleanupPlan(runs, inbox, await loadDecisions(), {
      now: new Date(),
      runsDays: policy.retention.runsDays,
      resolvedInboxDays: policy.retention.resolvedInboxDays,
    });
    console.log(JSON.stringify(plan, null, 2));
    if (context.apply) {
      await saveRuns(runs.filter(({ id: runId }) => !plan.runIds.includes(runId)));
      await saveInbox(inbox.filter(({ id: inboxId }) => !plan.inboxIds.includes(inboxId)));
    } else console.log("Dry-run: nenhum arquivo removido.");
    return { itemsRead: plan.runIds.length + plan.inboxIds.length };
  }
  if (index < 0) throw new Error(`ExecuÃ§Ã£o nÃ£o encontrada: ${id ?? "(id ausente)"}.`);
  if (context.command === "run:show") {
    console.log(
      JSON.stringify({ ...runs[index], nextStage: resumableStage(runs[index]) }, null, 2),
    );
    return { itemsRead: 1 };
  }
  if (context.command === "run:cancel") {
    if (!context.option("actor") || !context.option("notes"))
      throw new Error("Cancelamento exige --actor e --notes.");
    runs[index] = finishRun(runs[index], "cancelled", new Date(), context.option("notes"));
    if (context.apply) await saveRuns(runs);
    else console.log("Dry-run: execuÃ§Ã£o nÃ£o cancelada.");
    return { itemsRead: 1 };
  }
  if (!context.apply) throw new Error("RecuperaÃ§Ã£o exige --apply.");
  const result = await executeDailyPipeline({
    mode: "recovery",
    apply: true,
    actor: context.option("actor") ?? "",
    runType: "recovery",
    recoveryOfRunId: runs[index].id,
    overrideLock: context.has("override-lock"),
  });
  console.log(`${result.run.id} recupera ${runs[index].id}.`);
  return { itemsRead: 1 };
}

async function circuitCommand(context: CliContext): Promise<CommandResult> {
  const circuits = await loadCircuits();
  if (context.command === "circuit:list") {
    circuits.forEach((entry) =>
      console.log(`${entry.sourceId} | ${entry.state} | falhas=${entry.consecutiveFailures}`),
    );
    return { itemsRead: circuits.length };
  }
  const sourceId = context.positional[0];
  if (!sourceId || !context.option("actor") || !context.option("notes"))
    throw new Error("Reset exige sourceId, --actor e --notes.");
  const previous = circuits.find((entry) => entry.sourceId === sourceId) ?? emptyCircuit(sourceId);
  const reset = {
    ...emptyCircuit(sourceId),
    history: [
      ...previous.history,
      {
        action: "circuit-reset",
        at: new Date().toISOString(),
        actor: context.option("actor") ?? "",
        notes: context.option("notes") ?? "",
      },
    ],
  };
  if (context.apply)
    await saveCircuits([...circuits.filter(({ sourceId: id }) => id !== sourceId), reset]);
  else console.log("Dry-run: circuito nÃ£o alterado.");
  return { itemsRead: 1 };
}

export async function runAutomationCommand(context: CliContext): Promise<CommandResult> {
  if (["daily", "report"].includes(context.command))
    return dailyCommand(
      context.command === "report"
        ? { ...context, apply: false, has: (name) => name === "report-only" || context.has(name) }
        : context,
    );
  if (context.command.startsWith("inbox:")) return inboxCommand(context);
  if (context.command.startsWith("run:")) return runCommand(context);
  if (context.command.startsWith("circuit:")) return circuitCommand(context);
  const [runs, circuits, inbox] = await Promise.all([loadRuns(), loadCircuits(), loadInbox()]);
  console.log(JSON.stringify(calculateAutomationMetrics(runs, circuits, inbox), null, 2));
  return { itemsRead: runs.length };
}
