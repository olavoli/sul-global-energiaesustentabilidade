import {
  createStorageAdapter,
  setStorageAdapter,
  storageAdapter,
} from "./newsroom/storage/runtime";
import { loadScientificGraphs } from "./scientific-graph/store";
import { loadMemoryState } from "./scientific-memory/store";
import { planConceptGraph } from "./scientific-concepts/engine";
import { reviewConceptRelation } from "./scientific-concepts/review";
import { loadConceptState } from "./scientific-concepts/store";

const [command = "plan", ...args] = process.argv.slice(2);
const has = (name: string) => args.includes(`--${name}`);
const value = (name: string) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const environment = process.env.NEWSROOM_ENVIRONMENT ?? process.env.VITE_APP_ENV ?? "development";
if (["staging", "production"].includes(environment))
  throw new Error("Grafo de conceitos bloqueado em staging e produção.");
setStorageAdapter(
  createStorageAdapter({
    NEWSROOM_STORAGE_DRIVER: process.env.NEWSROOM_STORAGE_DRIVER,
    NEWSROOM_ENVIRONMENT: environment,
  }),
);
const adapter = storageAdapter();
if (["plan", "build", "rebuild"].includes(command)) {
  const apply = has("apply");
  if (command === "plan" && apply) throw new Error("Plan nunca persiste.");
  const [graphs, memory] = await Promise.all([
    loadScientificGraphs(adapter),
    loadMemoryState(adapter),
  ]);
  const report = await planConceptGraph({
    graphs: graphs.value.items,
    memories: Object.values(memory.entities).flat(),
    apply: command !== "plan" && apply,
    actor: value("actor"),
    adapter,
  });
  console.log(JSON.stringify(report, null, 2));
} else if (command === "list") {
  console.log(JSON.stringify((await loadConceptState(adapter)).concepts, null, 2));
} else if (command === "show") {
  const id = args.find((arg) => !arg.startsWith("--"));
  const state = await loadConceptState(adapter);
  console.log(
    JSON.stringify(
      {
        concept: state.concepts.find((item) => item.id === id),
        relations: state.relations.filter(({ from, to }) => from === id || to === id),
      },
      null,
      2,
    ),
  );
} else if (command === "stats") {
  const state = await loadConceptState(adapter);
  console.log(
    JSON.stringify(
      { concepts: state.concepts.length, relations: state.relations.length, ...state.metadata },
      null,
      2,
    ),
  );
} else if (command === "review") {
  if (!has("apply")) throw new Error("Revisão é dry-run; use --apply para confirmar.");
  const id = args.find((arg) => !arg.startsWith("--"));
  if (!id) throw new Error("ID da relação é obrigatório.");
  console.log(
    JSON.stringify(
      await reviewConceptRelation({
        id,
        status: (value("status") ?? "accepted") as "accepted" | "rejected" | "ignored",
        actor: value("actor") ?? "",
        note: value("note") ?? "",
        adapter,
      }),
      null,
      2,
    ),
  );
} else throw new Error("Comando de conceitos inválido.");
