import type { StorageAdapter } from "../newsroom/storage/contracts";
import { storageAdapter } from "../newsroom/storage/runtime";
import {
  evidenceClaimSchema,
  evidenceItemSchema,
  evidenceSourceSchema,
  type HumanEvidenceStatus,
} from "./contracts";
import { evidenceChecksum } from "./checksum";
import { loadEvidenceState, saveEvidenceState } from "./store";
export async function reviewEvidence(input: {
  id: string;
  status: HumanEvidenceStatus;
  actor: string;
  note: string;
  now?: Date;
  adapter?: StorageAdapter;
}) {
  if (!input.actor.trim() || !input.note.trim())
    throw new Error("Ator e justificativa são obrigatórios.");
  const adapter = input.adapter ?? storageAdapter();
  const state = await loadEvidenceState(adapter);
  const at = (input.now ?? new Date()).toISOString();
  let found = false;
  const sources = state.sources.map((item) =>
    item.sourceId === input.id
      ? ((found = true),
        evidenceSourceSchema.parse({
          ...item,
          humanStatus: input.status,
          verifiedAt: input.status === "verified" ? at : item.verifiedAt,
        }))
      : item,
  );
  const claims = state.claims.map((item) =>
    item.claimId === input.id
      ? ((found = true),
        evidenceClaimSchema.parse({
          ...item,
          humanStatus: input.status,
          history: [
            ...item.history,
            { action: input.status, actor: input.actor, note: input.note, at },
          ],
        }))
      : item,
  );
  const evidence = state.evidence.map((item) =>
    item.evidenceId === input.id
      ? ((found = true), evidenceItemSchema.parse({ ...item, humanStatus: input.status }))
      : item,
  );
  if (!found) throw new Error("Fonte, claim ou evidência não encontrada.");
  const next = { dossiers: state.dossiers, sources, claims, evidence };
  const checksum = evidenceChecksum(next);
  await saveEvidenceState({ ...next, checksum, at, changed: true, adapter });
  await adapter.appendAudit({
    id: crypto.randomUUID(),
    timestamp: at,
    actor: input.actor,
    action: "evidence.reviewed",
    entity: "scientific-evidence",
    entityId: input.id,
    reason: input.note,
    origin: "human-review",
    success: true,
    version: 1,
    after: { status: input.status, generatedContent: false, published: false },
  });
  return { id: input.id, status: input.status };
}
