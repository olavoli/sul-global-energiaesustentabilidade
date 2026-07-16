import { loadCatalog } from "./catalog";
import type { CliContext, CommandResult } from "./cli-types";
import { mergeClusters, splitCluster } from "./cluster-mutations";
import { clusterQueue } from "./clustering";
import { buildEvidencePackages } from "./evidence-packages";
import { loadQueue } from "./queue";
import { loadClaims, loadClusters, loadEvidencePackages, saveStoryState } from "./story-store";
import {
  loadTranslations,
  queueTranslation,
  reviewTranslation,
  runTranslation,
  saveTranslations,
} from "./translation";
import type { StoryCluster } from "./story-schema";

const STORY_COMMANDS = new Set([
  "cluster",
  "cluster:list",
  "cluster:show",
  "cluster:merge",
  "cluster:split",
  "evidence",
  "claims",
  "translation:list",
  "translation:queue",
  "translation:run",
  "translation:review",
  "translation:approve",
  "translation:reject",
  "translation:retry",
]);

export function isStoryCommand(command: string): boolean {
  return STORY_COMMANDS.has(command);
}

function printCluster(cluster: StoryCluster): void {
  console.log(
    `${cluster.id} | itens=${cluster.itemIds.length} | fontes-independentes=${cluster.independentSourceCount} | score=${cluster.clusterScore} | ${cluster.canonicalTitle}`,
  );
}

async function clusterCommand(context: CliContext): Promise<CommandResult> {
  const queue = await loadQueue();
  const catalog = await loadCatalog();
  const now = new Date().toISOString();
  if (context.command === "cluster") {
    const clusters = clusterQueue(queue, catalog, now);
    const evidence = buildEvidencePackages(clusters, queue, catalog, now);
    clusters.forEach(printCluster);
    if (context.apply) await saveStoryState(clusters, evidence.claims, evidence.packages, now);
    else console.log("Dry-run: clusters, claims e evidências não foram persistidos.");
    return { source: "fila-local", itemsRead: queue.length, clustersCreated: clusters.length };
  }
  const clusters = await loadClusters();
  if (context.command === "cluster:list") {
    clusters.forEach(printCluster);
    return { itemsRead: clusters.length };
  }
  const id = context.positional[0];
  if (context.command === "cluster:show") {
    const cluster = clusters.find((entry) => entry.id === id);
    if (!cluster) throw new Error(`Cluster não encontrado: ${id ?? "(id ausente)"}.`);
    console.log(JSON.stringify(cluster, null, 2));
    return { itemsRead: cluster.itemIds.length };
  }
  const reason = context.option("reason");
  if (!reason || !context.option("actor"))
    throw new Error("Alteração manual exige --reason e --actor.");
  let next: StoryCluster[];
  if (context.command === "cluster:merge") {
    const ids = context.positional;
    next = mergeClusters(clusters, ids, queue, catalog, context.actor, reason, now);
  } else {
    const itemIds = (context.option("items") ?? "").split(",").filter(Boolean);
    next = splitCluster(clusters, id ?? "", itemIds, queue, catalog, context.actor, reason, now);
  }
  const evidence = buildEvidencePackages(next, queue, catalog, now);
  if (context.apply) await saveStoryState(next, evidence.claims, evidence.packages, now);
  else console.log("Dry-run: agrupamento não alterado.");
  return { itemsRead: queue.length, clustersChanged: 1 };
}

async function evidenceCommand(context: CliContext): Promise<CommandResult> {
  const entries = context.command === "claims" ? await loadClaims() : await loadEvidencePackages();
  const id = context.positional[0];
  const selected = id
    ? entries.filter((entry) => "clusterId" in entry && entry.clusterId === id)
    : entries;
  console.log(JSON.stringify(selected, null, 2));
  return { itemsRead: selected.length };
}

async function translationCommand(context: CliContext): Promise<CommandResult> {
  let entries = await loadTranslations();
  const now = new Date().toISOString();
  if (context.command === "translation:list") {
    entries.forEach((entry) =>
      console.log(
        `${entry.id} | ${entry.status} | ${entry.sourceLanguage}→pt-BR | ${entry.clusterId}`,
      ),
    );
    return { itemsRead: entries.length };
  }
  if (context.command === "translation:queue") {
    const clusters = await loadClusters();
    const requested = context.positional[0];
    const targets = requested
      ? clusters.filter(({ id }) => id === requested)
      : clusters
          .filter(({ canonicalTitle }) =>
            [
              "How data centers can better manage energy use",
              "MIT researchers develop a low-cost technique to get lithium out of rocks",
              "Turning extreme heat into large-scale energy storage",
            ].includes(canonicalTitle),
          )
          .slice(0, 3);
    if (!targets.length) throw new Error("Nenhum cluster elegível encontrado.");
    const before = entries.length;
    for (const cluster of targets)
      entries = await queueTranslation(cluster, entries, now, context.actor);
    if (context.apply) await saveTranslations(entries);
    else console.log("Dry-run: fila de tradução não alterada.");
    return { itemsRead: targets.length, translationsQueued: entries.length - before };
  }
  if (context.command === "translation:run") {
    const limit = Math.min(3, Number(context.option("limit") ?? 3));
    const ids = entries
      .filter(({ status }) => status === "queued")
      .slice(0, limit)
      .map(({ id }) => id);
    const next = await Promise.all(
      entries.map((entry) =>
        ids.includes(entry.id) ? runTranslation(entry, now, context.actor) : entry,
      ),
    );
    next
      .filter(({ id }) => ids.includes(id))
      .forEach((entry) => console.log(`${entry.id} | ${entry.status}`));
    if (context.apply) await saveTranslations(next);
    else console.log("Dry-run: traduções não persistidas.");
    return { itemsRead: ids.length };
  }
  const id = context.positional[0];
  const index = entries.findIndex((entry) => entry.id === id);
  if (index < 0) throw new Error("Tradução não encontrada.");
  if (context.command === "translation:review") {
    console.log(JSON.stringify(entries[index], null, 2));
    return { itemsRead: 1 };
  }
  if (!context.option("actor") || !context.option("notes"))
    throw new Error("Decisão exige --actor e --notes.");
  const decision =
    context.command === "translation:approve"
      ? "approve"
      : context.command === "translation:reject"
        ? "reject"
        : "retry";
  entries[index] = reviewTranslation(
    entries[index],
    decision,
    context.actor,
    context.option("notes") ?? "",
    now,
  );
  if (context.apply) await saveTranslations(entries);
  else console.log("Dry-run: decisão de tradução não persistida.");
  return { itemsRead: 1, translationsApproved: decision === "approve" ? 1 : 0 };
}

export async function runStoryCommand(context: CliContext): Promise<CommandResult> {
  if (context.command.startsWith("cluster")) return clusterCommand(context);
  if (["evidence", "claims"].includes(context.command)) return evidenceCommand(context);
  return translationCommand(context);
}
