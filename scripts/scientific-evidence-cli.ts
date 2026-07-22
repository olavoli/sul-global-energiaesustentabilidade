import {
  createStorageAdapter,
  setStorageAdapter,
  storageAdapter,
} from "./newsroom/storage/runtime";
import { loadScientificRadar, loadScientificDossiers } from "./scientific-radar/store";
import { loadScientificGraphs } from "./scientific-graph/store";
import { persistCollectedEvidence, planEvidence } from "./scientific-evidence/engine";
import { loadEvidenceState } from "./scientific-evidence/store";
import { reviewEvidence } from "./scientific-evidence/review";
import { collectAuthorizedCrossref } from "./scientific-evidence/collector";
const [command = "plan", ...args] = process.argv.slice(2);
const id = args.find((arg) => !arg.startsWith("--"));
const has = (name: string) => args.includes(`--${name}`);
const value = (name: string) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const environment = process.env.NEWSROOM_ENVIRONMENT ?? process.env.VITE_APP_ENV ?? "development";
if (["staging", "production"].includes(environment))
  throw new Error("Dossiê de evidências bloqueado em staging e produção.");
setStorageAdapter(
  createStorageAdapter({
    NEWSROOM_STORAGE_DRIVER: process.env.NEWSROOM_STORAGE_DRIVER,
    NEWSROOM_ENVIRONMENT: environment,
  }),
);
const adapter = storageAdapter();
if (["plan", "collect"].includes(command)) {
  if (command === "collect" && process.env.SCIENTIFIC_EVIDENCE_COLLECTION_AUTHORIZED !== "true")
    throw new Error("Coleta externa não autorizada. Use o checkpoint humano.");
  if (command === "collect") {
    const collected = await collectAuthorizedCrossref();
    if (has("apply")) {
      if (process.env.SCIENTIFIC_EVIDENCE_PERSISTENCE_AUTHORIZED !== "true")
        throw new Error("Persistência não autorizada.");
      const [radar, dossiers, graphs] = await Promise.all([
        loadScientificRadar(adapter),
        loadScientificDossiers(adapter),
        loadScientificGraphs(adapter),
      ]);
      const structuralDossier = dossiers.value.items.find((item) => item.id === id);
      if (!structuralDossier) throw new Error("Dossiê não encontrado.");
      const work = radar.value.items.find((item) => item.id === structuralDossier.scientificWorkId);
      const graph = graphs.value.items.find((item) => item.id === structuralDossier.graphId);
      if (!work || !graph) throw new Error("Trabalho ou grafo não encontrado.");
      console.log(
        JSON.stringify(
          await persistCollectedEvidence({
            work,
            dossier: structuralDossier,
            graph,
            collected,
            actor: value("actor") ?? "human-authorized",
            adapter,
          }),
          null,
          2,
        ),
      );
    } else console.log(JSON.stringify(collected, null, 2));
    process.exit(0);
  }
  const [radar, dossiers, graphs] = await Promise.all([
    loadScientificRadar(adapter),
    loadScientificDossiers(adapter),
    loadScientificGraphs(adapter),
  ]);
  const dossier = dossiers.value.items.find((item) => item.id === id);
  if (!dossier) throw new Error("Dossiê não encontrado.");
  const work = radar.value.items.find((item) => item.id === dossier.scientificWorkId);
  const graph = graphs.value.items.find((item) => item.id === dossier.graphId);
  if (!work || !graph) throw new Error("Trabalho ou grafo não encontrado.");
  console.log(
    JSON.stringify(
      await planEvidence({
        work,
        dossier,
        graph,
        apply: has("apply"),
        actor: value("actor"),
        adapter,
      }),
      null,
      2,
    ),
  );
} else if (command === "list")
  console.log(JSON.stringify((await loadEvidenceState(adapter)).dossiers, null, 2));
else if (command === "show" || command === "validate") {
  const state = await loadEvidenceState(adapter);
  const dossier = state.dossiers.find((item) => item.dossierId === id);
  if (!dossier) throw new Error("Dossiê não encontrado.");
  console.log(
    JSON.stringify(
      {
        dossier,
        sources: state.sources.filter(({ sourceId }) => dossier.sourceIds.includes(sourceId)),
        claims: state.claims.filter(({ claimId }) => dossier.claimIds.includes(claimId)),
        evidence: state.evidence.filter(({ evidenceId }) =>
          dossier.evidenceItemIds.includes(evidenceId),
        ),
      },
      null,
      2,
    ),
  );
} else if (command === "review") {
  if (!has("apply")) throw new Error("Revisão é dry-run; use --apply.");
  console.log(
    JSON.stringify(
      await reviewEvidence({
        id: id ?? "",
        status: (value("status") ?? "verified") as "verified",
        actor: value("actor") ?? "",
        note: value("note") ?? "",
        adapter,
      }),
      null,
      2,
    ),
  );
} else if (command === "stats") {
  const state = await loadEvidenceState(adapter);
  console.log(
    JSON.stringify(
      {
        dossiers: state.dossiers.length,
        sources: state.sources.length,
        claims: state.claims.length,
        evidence: state.evidence.length,
        checksum: state.metadata.checksum,
      },
      null,
      2,
    ),
  );
} else throw new Error("Comando de evidências inválido.");
