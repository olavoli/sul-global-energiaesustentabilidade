import type { StorageAdapter } from "../newsroom/storage/contracts";
import { storageAdapter } from "../newsroom/storage/runtime";
import { graphDocumentSchema, type ScientificGraph } from "./contracts";
import {
  scientificDossiersDocumentSchema,
  type ScientificDossier,
} from "../scientific-radar/contracts";
import { DOSSIERS_KEY, loadScientificDossiers } from "../scientific-radar/store";
import { assertScientificGraphIntegrity } from "./validation";

export const GRAPH_KEY = "scientific-graph/graphs";
const empty = { schemaVersion: 1 as const, items: [] as ScientificGraph[] };

export async function loadScientificGraphs(adapter: StorageAdapter = storageAdapter()) {
  return adapter.getDocument(GRAPH_KEY, graphDocumentSchema, empty);
}

export async function persistScientificGraph(
  graph: ScientificGraph,
  adapter: StorageAdapter = storageAdapter(),
  actor = "scientific-graph-cli",
): Promise<"persisted" | "unchanged"> {
  assertScientificGraphIntegrity(graph);
  const current = await loadScientificGraphs(adapter);
  const existing = current.value.items.find(({ id }) => id === graph.id);
  if (
    existing &&
    existing.nodes
      .map(({ id }) => id)
      .sort()
      .join("|") ===
      graph.nodes
        .map(({ id }) => id)
        .sort()
        .join("|") &&
    existing.relations
      .map(({ id }) => id)
      .sort()
      .join("|") ===
      graph.relations
        .map(({ id }) => id)
        .sort()
        .join("|")
  ) {
    return "unchanged";
  }
  const dossiers = await loadScientificDossiers(adapter);
  const dossier = dossiers.value.items.find(
    ({ scientificWorkId }) => scientificWorkId === graph.scientificWorkId,
  );
  if (!dossier) throw new Error("Dossiê científico não encontrado.");
  const items = [...current.value.items.filter(({ id }) => id !== graph.id), graph];
  const updated: ScientificDossier = scientificDossiersDocumentSchema.shape.items.element.parse({
    ...dossier,
    graphId: graph.id,
    relatedWorkIds: graph.nodes
      .filter(({ type }) => type === "scientific-work")
      .map(({ id }) => id)
      .filter((id) => id !== graph.rootNodeId),
    authorIds: graph.nodes.filter(({ type }) => type === "author").map(({ id }) => id),
    institutionIds: graph.nodes.filter(({ type }) => type === "institution").map(({ id }) => id),
    topicIds: graph.nodes.filter(({ type }) => type === "topic").map(({ id }) => id),
    graphWarnings: graph.warnings,
    graphUpdatedAt: graph.updatedAt,
  });
  const dossierItems = dossiers.value.items.map((entry) =>
    entry.id === updated.id ? updated : entry,
  );
  graphDocumentSchema.parse({ schemaVersion: 1, items });
  scientificDossiersDocumentSchema.parse({ schemaVersion: 2, items: dossierItems });
  await adapter.transaction([
    { key: GRAPH_KEY, value: { schemaVersion: 1, items }, expectedVersion: current.version },
    {
      key: DOSSIERS_KEY,
      value: { schemaVersion: 2, items: dossierItems },
      expectedVersion: dossiers.version,
    },
  ]);
  await adapter.appendAudit({
    id: crypto.randomUUID(),
    timestamp: graph.updatedAt,
    actor: sanitizedAuditActor(actor),
    action: "scientific-graph:persist",
    entity: "scientific-graph",
    entityId: graph.id,
    reason: "Persistência humana autorizada do primeiro grafo científico.",
    origin: "local-supervised",
    success: true,
    version: 1,
    after: {
      scientificWorkId: graph.scientificWorkId,
      nodes: graph.nodes.length,
      relations: graph.relations.length,
      generatedContent: false,
    },
  });
  return "persisted";
}

export function sanitizedAuditActor(actor: string): string {
  const value = actor.trim();
  if (!value || /[\\/:=]|api[_-]?key|secret|token|cookie|session/i.test(value))
    return "local-operator";
  return value.replace(/[^\p{L}\p{N}@._-]+/gu, "-").slice(0, 80) || "local-operator";
}
