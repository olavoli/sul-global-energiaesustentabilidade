import { readFile } from "node:fs/promises";

import {
  loadCatalog,
  prepareSourceAdd,
  prepareSourceDisable,
  saveCatalog,
  sourceDiff,
} from "./catalog";
import { buildCoverageReport } from "./coverage";
import { loadEvidence } from "./evidence";
import { fixtureSources } from "./fixtures";
import { checkSourceHealth, runtimeAfterHealth } from "./health";
import { calculateSourceMetrics } from "./metrics";
import { collectSource, buildQueue, rescoreQueue } from "./pipeline";
import { loadQuarantine, saveQuarantine, updateQuarantine } from "./quarantine";
import {
  appendAudit,
  listQueue,
  loadQueue,
  saveQueue,
  transitionItem,
  writeBriefing,
} from "./queue";
import { collectRealSource } from "./real-collection";
import { loadRuntime, replaceRuntime, runtimeFor, saveRuntime } from "./runtime";
import type { CliContext, CommandResult } from "./cli-types";
import { isOrchestratorCommand, runOrchestratorCommand } from "./orchestrator-commands";
import { isAutomationCommand, runAutomationCommand } from "./automation-commands";
import { sourceSchema, type QueueItem } from "./schema";
import { isStoryCommand, runStoryCommand } from "./story-commands";

function printItem(item: QueueItem): void {
  console.log(
    `${item.id} | ${item.state} | score=${item.score?.total ?? "—"} | ${item.item.title}`,
  );
}

export function validateCollectionSelection(context: CliContext): string | "all" | "fixtures" {
  const id = context.option("source");
  if (id) return id;
  if (context.has("all")) {
    if (!context.has("confirm-all")) throw new Error("--all exige --confirm-all.");
    return "all";
  }
  return "fixtures";
}

async function sourceCommand(context: CliContext): Promise<CommandResult> {
  const catalog = await loadCatalog();
  if (["sources", "source:list"].includes(context.command)) {
    if (!catalog.length) console.log("Catálogo real vazio; nenhuma URL foi inventada.");
    catalog.forEach((source) =>
      console.log(`${source.id} | ${source.name} | ${source.trustTier} | ativo=${source.active}`),
    );
    return { source: "catalog" };
  }
  const id = context.positional[0];
  if (context.command === "source:show") {
    const source = catalog.find((entry) => entry.id === id);
    if (!source) throw new Error(`Fonte não encontrada: ${id ?? "(id ausente)"}.`);
    console.log(JSON.stringify(source, null, 2));
    return { source: source.id };
  }
  if (context.command === "source:add") {
    const path = context.positional[0];
    if (!path) throw new Error("Informe o arquivo JSON da fonte.");
    const input: unknown = JSON.parse(await readFile(path, "utf8"));
    const parsed = sourceSchema.parse(input);
    const evidence = parsed.active ? await loadEvidence(parsed.evidenceId ?? "") : undefined;
    const source = prepareSourceAdd(input, catalog, evidence);
    console.log(sourceDiff(source));
    if (context.apply) await saveCatalog([...catalog, source]);
    else console.log("Dry-run: use --apply para cadastrar.");
    return { source: source.id };
  }
  if (context.command === "source:disable") {
    const next = prepareSourceDisable(id ?? "", catalog);
    console.log(`${id}: active true → false.`);
    if (context.apply) await saveCatalog(next);
    else console.log("Dry-run: use --apply para desativar.");
    return { source: id };
  }
  const runtimes = await loadRuntime();
  const targets = context.has("all") ? catalog : catalog.filter((source) => source.id === id);
  if (!targets.length)
    console.log(
      catalog.length
        ? id
          ? "Fonte não encontrada."
          : "Informe o ID da fonte ou --all; nenhum acesso externo foi realizado."
        : "Catálogo real vazio; nenhum acesso externo realizado.",
    );
  let next = runtimes;
  for (const source of targets) {
    const health = await checkSourceHealth(source, runtimeFor(source.id, next));
    console.log(
      `${source.id} | ${health.status} | itens≈${health.approximateItems} | ${health.reasons.join(" ")}`,
    );
    next = replaceRuntime(next, runtimeAfterHealth(runtimeFor(source.id, next), health));
  }
  if (context.apply && targets.length) await saveRuntime(next);
  return { source: targets.map(({ id: value }) => value).join(",") || "catalog" };
}

async function collectCommand(context: CliContext): Promise<CommandResult> {
  const catalog = await loadCatalog();
  const selection = validateCollectionSelection(context);
  const active = catalog.filter((source) => source.active && source.trustTier !== "blocked");
  if (selection === "fixtures" && active.length) {
    console.log(
      "Há fontes reais ativas; nenhuma coleta foi iniciada. Selecione --source <id> ou --all --confirm-all.",
    );
    return { source: "nenhuma" };
  }
  if (selection === "fixtures") {
    console.log("Nenhuma coleta real solicitada; usando fixtures locais offline.");
    const runs = await Promise.all(
      fixtureSources.map((source, index) =>
        collectSource(source, {
          fixturePath: `newsroom/fixtures/${index ? "atom" : "rss"}.xml`,
          maxItems: 20,
        }),
      ),
    );
    const items = buildQueue(runs, context.actor);
    if (context.apply) await saveQueue([...(await loadQueue()), ...items]);
    else console.log("Dry-run: fila não alterada.");
    items.forEach(printItem);
    return { source: "fixtures-locais", itemsFetched: items.length, itemsAccepted: items.length };
  }
  const targets = selection === "all" ? active : active.filter(({ id }) => id === selection);
  if (!targets.length) throw new Error("Nenhuma fonte ativa corresponde à seleção.");
  let runtimes = await loadRuntime();
  let quarantine = await loadQuarantine();
  const current = await loadQueue();
  const additions: QueueItem[] = [];
  const errors: string[] = [];
  let fetched = 0;
  let rejected = 0;
  for (const source of targets) {
    const outcome = await collectRealSource(source, runtimeFor(source.id, runtimes), quarantine, {
      actor: context.actor,
      maxItems: 20,
    });
    runtimes = replaceRuntime(runtimes, outcome.runtime);
    if (outcome.quarantine) quarantine = [...quarantine, outcome.quarantine];
    additions.push(...outcome.queueItems);
    fetched += outcome.fetched;
    rejected += outcome.rejected;
    if (outcome.error) errors.push(`${source.id}: ${outcome.error}`);
    console.log(
      `${source.id} | ${outcome.changeStatus} | recebidos=${outcome.fetched} | aceitos=${outcome.queueItems.length}`,
    );
  }
  if (context.apply) {
    const ids = new Set(current.map(({ id }) => id));
    await saveQueue([...current, ...additions.filter(({ id }) => !ids.has(id))]);
    await saveRuntime(runtimes);
    await saveQuarantine(quarantine);
  } else console.log("Dry-run: estado operacional não alterado.");
  return {
    source: targets.map(({ id }) => id).join(","),
    itemsFetched: fetched,
    itemsAccepted: additions.length,
    itemsRejected: rejected,
    errors,
  };
}

async function queueCommand(context: CliContext): Promise<CommandResult> {
  const queue = await loadQueue();
  const id = context.positional[0];
  if (context.command === "score") {
    const rescored = rescoreQueue(queue, await loadCatalog());
    rescored.forEach(printItem);
    if (context.apply) await saveQueue(rescored);
    else console.log("Dry-run: scores recalculados sem alterar a fila.");
    console.log(`Scoring determinístico recalculado em ${queue.length} item(ns).`);
    return {};
  }
  if (context.command === "list") {
    listQueue(queue, {
      state: context.option("state") as QueueItem["state"] | undefined,
      sort: "score",
    }).forEach(printItem);
    if (!queue.length) console.log("Fila vazia.");
    return {};
  }
  if (context.command === "stats") {
    console.log(`Total na fila: ${queue.length}.`);
    const catalog = await loadCatalog();
    const runtimes = await loadRuntime();
    const quarantine = await loadQuarantine();
    catalog.forEach((source) =>
      console.log(
        JSON.stringify(
          calculateSourceMetrics(source, runtimeFor(source.id, runtimes), queue, quarantine),
        ),
      ),
    );
    return {};
  }
  if (context.command === "coverage") {
    console.log(JSON.stringify(buildCoverageReport(await loadCatalog(), queue), null, 2));
    return {};
  }
  const index = queue.findIndex((entry) => entry.id === id);
  if (index < 0) throw new Error(`Item não encontrado: ${id ?? "(id ausente)"}.`);
  if (["show", "review"].includes(context.command)) {
    console.log(JSON.stringify(queue[index], null, 2));
    return { source: queue[index].item.sourceId };
  }
  const target =
    context.command === "reject"
      ? "rejected"
      : context.command === "archive"
        ? "archived"
        : "approved-for-draft";
  if (
    target === "approved-for-draft" &&
    (!context.has("confirm-review") || !context.option("actor"))
  ) {
    throw new Error("Aprovação exige --confirm-review e --actor <identificador>.");
  }
  const candidate =
    target === "approved-for-draft" && queue[index].state === "scored"
      ? transitionItem(queue[index], "review", context.actor)
      : queue[index];
  const next = transitionItem(candidate, target, context.actor);
  console.log(`${id}: ${queue[index].state} → ${target}.`);
  if (context.apply) {
    if (target === "approved-for-draft") await writeBriefing(candidate);
    queue[index] = next;
    await saveQueue(queue);
  } else console.log("Dry-run: fila não alterada.");
  return { source: queue[index].item.sourceId };
}

async function quarantineCommand(context: CliContext): Promise<CommandResult> {
  const entries = await loadQuarantine();
  const id = context.positional[0];
  if (context.command === "quarantine:list")
    entries.forEach((entry) =>
      console.log(`${entry.id} | ${entry.sourceId} | ${entry.state} | ${entry.reasonCode}`),
    );
  else if (context.command === "quarantine:show")
    console.log(JSON.stringify(entries.find((entry) => entry.id === id) ?? null, null, 2));
  else {
    const next = updateQuarantine(
      entries,
      id ?? "",
      context.command.endsWith("retry") ? "retry" : "discard",
    );
    if (context.apply) await saveQuarantine(next);
    else console.log("Dry-run: quarentena não alterada.");
  }
  return { source: "quarantine" };
}

export async function runCommand(context: CliContext): Promise<CommandResult> {
  if (isAutomationCommand(context.command)) return runAutomationCommand(context);
  if (isOrchestratorCommand(context.command)) return runOrchestratorCommand(context);
  if (isStoryCommand(context.command)) return runStoryCommand(context);
  if (
    [
      "sources",
      "source:list",
      "source:show",
      "source:add",
      "source:disable",
      "source:health",
    ].includes(context.command)
  )
    return sourceCommand(context);
  if (context.command === "collect") return collectCommand(context);
  if (context.command.startsWith("quarantine:")) return quarantineCommand(context);
  if (
    [
      "list",
      "show",
      "review",
      "score",
      "reject",
      "archive",
      "approve",
      "stats",
      "coverage",
    ].includes(context.command)
  )
    return queueCommand(context);
  throw new Error("Comando inválido. Consulte docs/NEWSROOM_OPERATIONS.md.");
}
