import {
  createStorageAdapter,
  setStorageAdapter,
  storageAdapter,
} from "./newsroom/storage/runtime";
import { loadScientificRadar } from "./scientific-radar/store";
import { syncDossierHistoricalContexts } from "./scientific-memory/dossier-sync";
import { rebuildScientificMemory, updateScientificMemory } from "./scientific-memory/engine";
import { loadMemoryState } from "./scientific-memory/store";

const [command = "stats", ...args] = process.argv.slice(2);
const option = (name: string) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const environment = process.env.NEWSROOM_ENVIRONMENT ?? process.env.VITE_APP_ENV ?? "development";
if (["production", "staging"].includes(environment))
  throw new Error("Memória científica bloqueada em produção e staging.");
if (!["update", "rebuild", "stats"].includes(command)) throw new Error("Comando inválido.");
setStorageAdapter(
  createStorageAdapter({
    NEWSROOM_STORAGE_DRIVER: process.env.NEWSROOM_STORAGE_DRIVER,
    NEWSROOM_ENVIRONMENT: environment,
  }),
);

const adapter = storageAdapter();
if (command === "stats") {
  const state = await loadMemoryState(adapter);
  console.log(
    JSON.stringify(
      {
        articles: state.metadata.articleCount,
        entities: state.metadata.entityCount,
        timelines: state.timeline.years.length,
        checksum: state.metadata.checksum,
      },
      null,
      2,
    ),
  );
} else {
  const works = (await loadScientificRadar(adapter)).value.items;
  const actor = option("actor") ?? "operador-local";
  const report =
    command === "rebuild"
      ? await rebuildScientificMemory(works, actor, adapter)
      : await updateScientificMemory(works, actor, adapter);
  const dossiersUpdated = report.changed ? await syncDossierHistoricalContexts(works, adapter) : 0;
  console.log(JSON.stringify({ ...report, dossiersUpdated }, null, 2));
}
