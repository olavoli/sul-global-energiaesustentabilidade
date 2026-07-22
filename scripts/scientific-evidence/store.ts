import { z } from "zod";
import type { StorageAdapter } from "../newsroom/storage/contracts";
import { storageAdapter } from "../newsroom/storage/runtime";
import {
  evidenceClaimSchema,
  evidenceDossierSchema,
  evidenceItemSchema,
  evidenceSourceSchema,
  type EvidenceClaim,
  type EvidenceDossier,
  type EvidenceItem,
  type EvidenceSource,
} from "./contracts";

export const EVIDENCE_KEYS = {
  dossiers: "scientific-evidence/dossiers",
  sources: "scientific-evidence/sources",
  claims: "scientific-evidence/claims",
  evidence: "scientific-evidence/evidence",
  runs: "scientific-evidence/runs",
  metadata: "scientific-evidence/metadata",
} as const;
const docs = {
  dossiers: z.object({ schemaVersion: z.literal(1), items: z.array(evidenceDossierSchema) }),
  sources: z.object({ schemaVersion: z.literal(1), items: z.array(evidenceSourceSchema) }),
  claims: z.object({ schemaVersion: z.literal(1), items: z.array(evidenceClaimSchema) }),
  evidence: z.object({ schemaVersion: z.literal(1), items: z.array(evidenceItemSchema) }),
};
const runSchema = z.object({
  schemaVersion: z.literal(1),
  items: z.array(
    z.object({ id: z.string(), mode: z.string(), at: z.iso.datetime(), changed: z.boolean() }),
  ),
});
const metadataSchema = z.object({
  schemaVersion: z.literal(1),
  checksum: z.string(),
  updatedAt: z.iso.datetime().nullable(),
});
export async function loadEvidenceState(adapter: StorageAdapter = storageAdapter()) {
  const [dossiers, sources, claims, evidence, runs, metadata] = await Promise.all([
    adapter.getDocument(EVIDENCE_KEYS.dossiers, docs.dossiers, { schemaVersion: 1, items: [] }),
    adapter.getDocument(EVIDENCE_KEYS.sources, docs.sources, { schemaVersion: 1, items: [] }),
    adapter.getDocument(EVIDENCE_KEYS.claims, docs.claims, { schemaVersion: 1, items: [] }),
    adapter.getDocument(EVIDENCE_KEYS.evidence, docs.evidence, { schemaVersion: 1, items: [] }),
    adapter.getDocument(EVIDENCE_KEYS.runs, runSchema, { schemaVersion: 1, items: [] }),
    adapter.getDocument(EVIDENCE_KEYS.metadata, metadataSchema, {
      schemaVersion: 1,
      checksum: "0".repeat(64),
      updatedAt: null,
    }),
  ]);
  return {
    dossiers: dossiers.value.items,
    sources: sources.value.items,
    claims: claims.value.items,
    evidence: evidence.value.items,
    runs: runs.value.items,
    metadata: metadata.value,
    versions: {
      dossiers: dossiers.version,
      sources: sources.version,
      claims: claims.version,
      evidence: evidence.version,
      runs: runs.version,
      metadata: metadata.version,
    },
  };
}
export async function saveEvidenceState(input: {
  dossiers: EvidenceDossier[];
  sources: EvidenceSource[];
  claims: EvidenceClaim[];
  evidence: EvidenceItem[];
  checksum: string;
  at: string;
  changed: boolean;
  mode?: string;
  adapter?: StorageAdapter;
}) {
  const adapter = input.adapter ?? storageAdapter();
  const current = await loadEvidenceState(adapter);
  await adapter.transaction([
    {
      key: EVIDENCE_KEYS.dossiers,
      value: { schemaVersion: 1, items: input.dossiers },
      expectedVersion: current.versions.dossiers,
    },
    {
      key: EVIDENCE_KEYS.sources,
      value: { schemaVersion: 1, items: input.sources },
      expectedVersion: current.versions.sources,
    },
    {
      key: EVIDENCE_KEYS.claims,
      value: { schemaVersion: 1, items: input.claims },
      expectedVersion: current.versions.claims,
    },
    {
      key: EVIDENCE_KEYS.evidence,
      value: { schemaVersion: 1, items: input.evidence },
      expectedVersion: current.versions.evidence,
    },
    {
      key: EVIDENCE_KEYS.runs,
      value: {
        schemaVersion: 1,
        items: [
          ...current.runs,
          {
            id: crypto.randomUUID(),
            mode: input.mode ?? "local-scaffold",
            at: input.at,
            changed: input.changed,
          },
        ],
      },
      expectedVersion: current.versions.runs,
    },
    {
      key: EVIDENCE_KEYS.metadata,
      value: { schemaVersion: 1, checksum: input.checksum, updatedAt: input.at },
      expectedVersion: current.versions.metadata,
    },
  ]);
}
