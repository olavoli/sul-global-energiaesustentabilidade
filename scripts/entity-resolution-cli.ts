import { createStorageAdapter, setStorageAdapter } from "./newsroom/storage/runtime";
import { loadScientificGraphs } from "./scientific-graph/store";
import { buildResolutionState } from "./entity-resolution/graph-import";
import { saveResolutionState } from "./entity-resolution/store";
import { reviewDuplicateCandidate } from "./entity-resolution/review";

const [command = "plan", id, ...args] = process.argv.slice(2);
const apply = args.includes("--apply");
const option = (name: string) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

const environment = process.env.NEWSROOM_ENVIRONMENT ?? process.env.VITE_APP_ENV ?? "development";
if (["production", "staging"].includes(environment))
  throw new Error("Resolução de entidades bloqueada em produção e staging.");
setStorageAdapter(
  createStorageAdapter({
    NEWSROOM_STORAGE_DRIVER: process.env.NEWSROOM_STORAGE_DRIVER,
    NEWSROOM_ENVIRONMENT: environment,
  }),
);

if (!["plan", "build", "review"].includes(command)) throw new Error("Comando inválido.");

if (command === "review") {
  if (!apply || !id) throw new Error("Revisão exige ID e --apply.");
  const status = option("status") as "accepted" | "ignored";
  if (!["accepted", "ignored"].includes(status)) throw new Error("Status inválido.");
  console.log(
    JSON.stringify(
      await reviewDuplicateCandidate({
        id,
        status,
        actor: option("actor") ?? "operador-local",
        note: option("note") ?? "Revisão humana supervisionada.",
      }),
      null,
      2,
    ),
  );
} else {
  const graphs = (await loadScientificGraphs()).value.items;
  const graph = id ? graphs.find(({ id: graphId }) => graphId === id) : graphs[0];
  if (!graph) throw new Error("Grafo científico não encontrado.");
  const state = buildResolutionState(graph.nodes);
  if (command === "build" && apply) await saveResolutionState(state.entities, state.candidates);
  console.log(
    JSON.stringify(
      {
        graphId: graph.id,
        entities: state.entities.length,
        candidates: state.candidates.length,
        automaticMerges: 0,
        mode: command === "build" && apply ? "persisted-local" : "dry-run",
      },
      null,
      2,
    ),
  );
}
