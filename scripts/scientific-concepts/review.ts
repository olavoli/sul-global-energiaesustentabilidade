import type { StorageAdapter } from "../newsroom/storage/contracts";
import { storageAdapter } from "../newsroom/storage/runtime";
import { conceptRelationSchema, type ConceptReviewStatus } from "./contracts";
import { conceptChecksum } from "./checksum";
import { loadConceptState, saveConceptState } from "./store";

export async function reviewConceptRelation(input: {
  id: string;
  status: Exclude<ConceptReviewStatus, "pending">;
  actor: string;
  note: string;
  now?: Date;
  adapter?: StorageAdapter;
}) {
  if (!input.actor.trim() || !input.note.trim()) throw new Error("Ator e nota são obrigatórios.");
  const adapter = input.adapter ?? storageAdapter();
  const state = await loadConceptState(adapter);
  const existing = state.relations.find(({ id }) => id === input.id);
  if (!existing) throw new Error("Relação de conceito não encontrada.");
  const at = (input.now ?? new Date()).toISOString();
  const updated = conceptRelationSchema.parse({
    ...existing,
    humanStatus: input.status,
    history: [
      ...existing.history,
      { status: input.status, actor: input.actor, note: input.note, at },
    ],
  });
  const relations = state.relations.map((item) => (item.id === updated.id ? updated : item));
  await saveConceptState({
    concepts: state.concepts,
    relations,
    taxonomyVersion: state.metadata.taxonomyVersion,
    checksum: conceptChecksum(state.concepts, relations),
    unresolvedTopics: state.metadata.unresolvedTopics,
    updatedAt: at,
    adapter,
  });
  await adapter.appendAudit({
    id: crypto.randomUUID(),
    timestamp: at,
    actor: input.actor,
    action: "concept.relation.reviewed",
    entity: "concept-relation",
    entityId: input.id,
    reason: input.note,
    origin: "human-review",
    success: true,
    version: 1,
    after: { status: input.status, generatedContent: false, published: false },
  });
  return updated;
}
