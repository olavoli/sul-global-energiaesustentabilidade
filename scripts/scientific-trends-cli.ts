import {
  createStorageAdapter,
  setStorageAdapter,
  storageAdapter,
} from "./newsroom/storage/runtime";
import { loadMemoryState } from "./scientific-memory/store";
import { planTrends } from "./scientific-trends/engine";
import { syncTrendDossiers } from "./scientific-trends/dossier-sync";
import { trendFixtures } from "./scientific-trends/fixtures";
import { reviewTrend } from "./scientific-trends/review";
import { loadTrendState } from "./scientific-trends/store";

const [command = "plan", ...args] = process.argv.slice(2);
const has = (name: string) => args.includes(`--${name}`);
const value = (name: string) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const environment = process.env.NEWSROOM_ENVIRONMENT ?? process.env.VITE_APP_ENV ?? "development";
if (["staging", "production"].includes(environment))
  throw new Error("Tendências científicas bloqueadas em staging e produção.");
setStorageAdapter(
  createStorageAdapter({
    NEWSROOM_STORAGE_DRIVER: process.env.NEWSROOM_STORAGE_DRIVER,
    NEWSROOM_ENVIRONMENT: environment,
  }),
);
const adapter = storageAdapter();
const apply = has("apply");
if (["plan", "build", "rebuild"].includes(command)) {
  if (command === "plan" && apply) throw new Error("Plan nunca persiste.");
  const memories = has("fixtures")
    ? trendFixtures.map(({ memory }) => memory)
    : Object.values((await loadMemoryState(adapter)).entities).flat();
  const report = await planTrends(memories, {
    mode: command === "rebuild" ? "rebuild" : "incremental",
    apply: command !== "plan" && apply,
    actor: value("actor"),
    adapter,
  });
  const dossiersUpdated =
    command !== "plan" && apply && report.changed
      ? await syncTrendDossiers(report.signals, adapter)
      : 0;
  console.log(
    JSON.stringify(
      {
        ...report,
        dossiersUpdated,
        signals: report.signals.map(
          ({ id, entityId, status, confidence, coverageScore, warnings }) => ({
            id,
            entityId,
            status,
            confidence,
            coverageScore,
            warnings: warnings.map(({ code }) => code),
          }),
        ),
      },
      null,
      2,
    ),
  );
} else if (command === "list") {
  console.log(JSON.stringify((await loadTrendState(adapter)).signals, null, 2));
} else if (command === "show") {
  const id = args.find((arg) => !arg.startsWith("--"));
  console.log(
    JSON.stringify(
      (await loadTrendState(adapter)).signals.find((item) => item.id === id) ?? null,
      null,
      2,
    ),
  );
} else if (command === "stats") {
  const state = await loadTrendState(adapter);
  const statuses = state.signals.reduce<Record<string, number>>((result, signal) => {
    result[signal.status] = (result[signal.status] ?? 0) + 1;
    return result;
  }, {});
  console.log(
    JSON.stringify(
      { signals: state.signals.length, checksum: state.metadata.checksum, statuses },
      null,
      2,
    ),
  );
} else if (command === "review") {
  if (!apply) throw new Error("Revisão é dry-run; use --apply para confirmar.");
  const id = args.find((arg) => !arg.startsWith("--"));
  if (!id) throw new Error("ID do sinal é obrigatório.");
  console.log(
    JSON.stringify(
      await reviewTrend({
        id,
        action: (value("action") ?? "reviewed") as "reviewed",
        actor: value("actor") ?? "",
        note: value("note") ?? "",
        now: new Date(),
        adapter,
      }),
      null,
      2,
    ),
  );
} else throw new Error("Comando de tendência inválido.");
