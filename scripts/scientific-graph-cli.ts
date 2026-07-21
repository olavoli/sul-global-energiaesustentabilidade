import {
  createStorageAdapter,
  setStorageAdapter,
  storageAdapter,
} from "./newsroom/storage/runtime";
import { loadScientificDossiers, loadScientificRadar } from "./scientific-radar/store";
import { buildScientificGraph } from "./scientific-graph/builder";
import { loadScientificGraphs, persistScientificGraph } from "./scientific-graph/store";
import { reviewGraphRelation } from "./scientific-graph/review";

const args = process.argv.slice(2);
const command = args[0] ?? "list";
const id = args[1];
const option = (name: string) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const apply = args.includes("--apply");

async function main() {
  if (["production", "staging"].includes(process.env.NEWSROOM_ENVIRONMENT ?? ""))
    throw new Error("Grafo científico bloqueado em produção e staging.");
  setStorageAdapter(
    createStorageAdapter({
      NEWSROOM_STORAGE_DRIVER: process.env.NEWSROOM_STORAGE_DRIVER,
      NEWSROOM_ENVIRONMENT: process.env.NEWSROOM_ENVIRONMENT ?? "development",
    }),
  );
  if (command === "list")
    return console.log(
      JSON.stringify(
        (await loadScientificGraphs()).value.items.map(
          ({ id: graphId, scientificWorkId, nodes, relations }) => ({
            graphId,
            scientificWorkId,
            nodes: nodes.length,
            relations: relations.length,
          }),
        ),
        null,
        2,
      ),
    );
  if (command === "show") {
    const graph = (await loadScientificGraphs()).value.items.find(({ id: value }) => value === id);
    if (!graph) throw new Error("Grafo não encontrado.");
    return console.log(JSON.stringify(graph, null, 2));
  }
  if (command === "stats") {
    const items = (await loadScientificGraphs()).value.items;
    return console.log(
      JSON.stringify(
        {
          graphs: items.length,
          nodes: items.reduce((n, g) => n + g.nodes.length, 0),
          relations: items.reduce((n, g) => n + g.relations.length, 0),
        },
        null,
        2,
      ),
    );
  }
  if (command === "review") {
    if (!apply) throw new Error("Revisão é dry-run; use --apply após decisão humana.");
    const status = option("status") as
      | "reviewed"
      | "accepted"
      | "rejected"
      | "needs-context"
      | undefined;
    if (!id || !status) throw new Error("Relação e --status são obrigatórios.");
    const result = await reviewGraphRelation({
      relationId: id,
      status,
      actor: option("actor") ?? "operador-local",
      note: option("note") ?? "Revisão supervisionada.",
    });
    return console.log(JSON.stringify(result, null, 2));
  }
  if (!["plan", "build"].includes(command) || !id)
    throw new Error("Comando ou scientificWorkId inválido.");
  const radar = (await loadScientificRadar()).value.items.find(({ id: value }) => value === id);
  const dossier = (await loadScientificDossiers()).value.items.find(
    ({ scientificWorkId }) => scientificWorkId === id,
  );
  if (!radar || !dossier) throw new Error("Trabalho ou dossiê não encontrado.");
  if (command === "plan")
    return console.log(
      JSON.stringify(
        {
          scientificWorkId: id,
          doi: radar.doi,
          limits: {
            references: 20,
            citing: 20,
            related: 10,
            authors: 20,
            institutions: 20,
            topics: 20,
            nodes: 100,
            relations: 150,
          },
          mode: "dry-run",
          sources: ["OpenAlex", "Crossref"],
        },
        null,
        2,
      ),
    );
  const report = await buildScientificGraph(radar, dossier);
  if (apply) {
    const outcome = await persistScientificGraph(
      report.graph,
      storageAdapter(),
      option("actor") ?? "operador-local",
    );
    report.persisted = outcome === "persisted";
    if (outcome === "unchanged") report.graph.warnings.push("grafo-idempotente-sem-alteração");
  }
  console.log(JSON.stringify(report, null, 2));
}

try {
  await main();
} catch (error) {
  console.error(`[erro] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
