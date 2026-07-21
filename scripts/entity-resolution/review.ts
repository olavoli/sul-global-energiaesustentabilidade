import type { StorageAdapter } from "../newsroom/storage/contracts";
import { storageAdapter } from "../newsroom/storage/runtime";
import { loadDuplicateCandidates, DUPLICATE_CANDIDATES_KEY } from "./store";
import { duplicateCandidatesDocumentSchema } from "./contracts";

export async function reviewDuplicateCandidate(input: {
  id: string;
  status: "accepted" | "ignored";
  actor: string;
  note: string;
  now?: Date;
  adapter?: StorageAdapter;
}) {
  const adapter = input.adapter ?? storageAdapter();
  const document = await loadDuplicateCandidates(adapter);
  const index = document.value.items.findIndex(({ id }) => id === input.id);
  if (index < 0) throw new Error("Possível duplicata não encontrada.");
  const at = (input.now ?? new Date()).toISOString();
  const current = document.value.items[index];
  const updated = {
    ...current,
    status: input.status,
    history: [
      ...current.history,
      { status: input.status, actor: input.actor, note: input.note, at },
    ],
  };
  const items = [...document.value.items];
  items[index] = updated;
  await adapter.putDocument(
    {
      key: DUPLICATE_CANDIDATES_KEY,
      value: { schemaVersion: 1, items },
      expectedVersion: document.version,
    },
    duplicateCandidatesDocumentSchema,
  );
  await adapter.appendAudit({
    id: crypto.randomUUID(),
    timestamp: at,
    actor: input.actor,
    action: `entity-resolution:${input.status}`,
    entity: "duplicate-candidate",
    entityId: input.id,
    reason: input.note,
    origin: "editorial-console",
    success: true,
    version: document.version + 1,
    after: {
      id: input.id,
      status: input.status,
      mergedAutomatically: false,
      generatedContent: false,
    },
  });
  return updated;
}
