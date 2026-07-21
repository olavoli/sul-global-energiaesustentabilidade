import type { StorageAdapter } from "../newsroom/storage/contracts";
import { storageAdapter } from "../newsroom/storage/runtime";
import { graphDocumentSchema, graphRelationSchema, type GraphRelation } from "./contracts";
import { GRAPH_KEY, loadScientificGraphs } from "./store";

export async function reviewGraphRelation(
  input: {
    relationId: string;
    status: "reviewed" | "accepted" | "rejected" | "needs-context";
    actor: string;
    note: string;
    now?: Date;
  },
  adapter: StorageAdapter = storageAdapter(),
): Promise<GraphRelation> {
  if (!input.actor.trim() || !input.note.trim()) throw new Error("Ator e nota são obrigatórios.");
  const current = await loadScientificGraphs(adapter);
  let reviewed: GraphRelation | undefined;
  const items = current.value.items.map((graph) => ({
    ...graph,
    relations: graph.relations.map((relation) => {
      if (relation.id !== input.relationId) return relation;
      reviewed = graphRelationSchema.parse({
        ...relation,
        humanStatus: input.status,
        history: [
          ...relation.history,
          {
            status: input.status,
            actor: input.actor.trim(),
            note: input.note.trim(),
            at: (input.now ?? new Date()).toISOString(),
          },
        ],
      });
      return reviewed;
    }),
  }));
  if (!reviewed) throw new Error("Relação científica não encontrada.");
  await adapter.putDocument(
    { key: GRAPH_KEY, value: { schemaVersion: 1, items }, expectedVersion: current.version },
    graphDocumentSchema,
  );
  return reviewed;
}
