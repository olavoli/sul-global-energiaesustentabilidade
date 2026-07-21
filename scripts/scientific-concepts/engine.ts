import type { StorageAdapter } from "../newsroom/storage/contracts";
import { storageAdapter } from "../newsroom/storage/runtime";
import type { ScientificGraph } from "../scientific-graph/contracts";
import type { EntityMemory } from "../scientific-memory/contracts";
import { buildConceptGraph } from "./builder";
import { conceptChecksum } from "./checksum";
import { loadConceptState, saveConceptState } from "./store";
import { loadConceptTaxonomy, type ConceptTaxonomy } from "./taxonomy";

export async function planConceptGraph(input: {
  graphs: ScientificGraph[];
  memories?: EntityMemory[];
  taxonomy?: ConceptTaxonomy;
  apply?: boolean;
  actor?: string;
  now?: Date;
  adapter?: StorageAdapter;
}) {
  const adapter = input.adapter ?? storageAdapter();
  const taxonomy = input.taxonomy ?? (await loadConceptTaxonomy());
  const built = buildConceptGraph({ taxonomy, graphs: input.graphs, memories: input.memories });
  const current = await loadConceptState(adapter);
  const relations = built.relations.map((relation) => {
    const reviewed = current.relations.find(({ id }) => id === relation.id);
    return reviewed?.history.length
      ? { ...relation, humanStatus: reviewed.humanStatus, history: reviewed.history }
      : relation;
  });
  const checksum = conceptChecksum(built.concepts, relations);
  const changed = current.metadata.checksum !== checksum;
  if (input.apply && changed) {
    if (!input.actor?.trim()) throw new Error("Ator é obrigatório para persistir conceitos.");
    const at = (input.now ?? new Date()).toISOString();
    await saveConceptState({
      ...built,
      relations,
      taxonomyVersion: taxonomy.taxonomyVersion,
      checksum,
      updatedAt: at,
      adapter,
    });
    await adapter.appendAudit({
      id: crypto.randomUUID(),
      timestamp: at,
      actor: input.actor,
      action: "concept.graph.updated",
      entity: "scientific-concept-graph",
      entityId: checksum.slice(0, 16),
      reason: "Resolução exata por taxonomia controlada.",
      origin: "local-supervised",
      success: true,
      version: 1,
      after: {
        concepts: built.concepts.length,
        relations: built.relations.length,
        generatedContent: false,
        published: false,
      },
    });
  }
  return { ...built, relations, checksum, changed, persisted: Boolean(input.apply && changed) };
}
