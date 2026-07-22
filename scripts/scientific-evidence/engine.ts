import type { StorageAdapter } from "../newsroom/storage/contracts";
import { storageAdapter } from "../newsroom/storage/runtime";
import type { ScientificWork, ScientificDossier } from "../scientific-radar/contracts";
import type { ScientificGraph } from "../scientific-graph/contracts";
import { buildEvidenceScaffold } from "./builder";
import type { collectAuthorizedCrossref } from "./collector";
import { evidenceDossierSchema } from "./contracts";
import { evidenceChecksum } from "./checksum";
import { loadEvidenceState, saveEvidenceState } from "./store";
export async function planEvidence(input: {
  work: ScientificWork;
  dossier: ScientificDossier;
  graph: ScientificGraph;
  apply?: boolean;
  actor?: string;
  now?: Date;
  adapter?: StorageAdapter;
}) {
  const adapter = input.adapter ?? storageAdapter();
  const built = buildEvidenceScaffold(input);
  const current = await loadEvidenceState(adapter);
  const dossiers = [
    ...current.dossiers.filter(({ dossierId }) => dossierId !== built.dossier.dossierId),
    built.dossier,
  ];
  const sources = [
    ...current.sources.filter(
      ({ sourceId }) => !built.sources.some((item) => item.sourceId === sourceId),
    ),
    ...built.sources,
  ];
  const state = { dossiers, sources, claims: current.claims, evidence: current.evidence };
  const checksum = evidenceChecksum(state);
  const changed = checksum !== current.metadata.checksum;
  if (input.apply && changed) {
    if (!input.actor?.trim()) throw new Error("Ator é obrigatório.");
    const at = (input.now ?? new Date()).toISOString();
    await saveEvidenceState({ ...state, checksum, at, changed, adapter });
    await adapter.appendAudit({
      id: crypto.randomUUID(),
      timestamp: at,
      actor: input.actor,
      action: "evidence.dossier.created",
      entity: "scientific-evidence",
      entityId: built.dossier.dossierId,
      reason: "Scaffold local sem conteúdo externo.",
      origin: "local-supervised",
      success: true,
      version: 1,
      after: { generatedContent: false, published: false, claims: 0, evidence: 0 },
    });
  }
  return { ...state, checksum, changed, persisted: Boolean(input.apply && changed) };
}

type CollectedEvidence = Awaited<ReturnType<typeof collectAuthorizedCrossref>>;

export async function persistCollectedEvidence(input: {
  work: ScientificWork;
  dossier: ScientificDossier;
  graph: ScientificGraph;
  collected: CollectedEvidence;
  actor: string;
  now?: Date;
  adapter?: StorageAdapter;
}) {
  if (!input.actor.trim()) throw new Error("Ator é obrigatório.");
  if (input.work.doi?.toLowerCase() !== "10.1002/advs.202510481")
    throw new Error("Somente o DOI piloto está autorizado.");
  if (input.collected.source.doi !== input.work.doi || input.collected.abstractStored)
    throw new Error("Fonte coletada incompatível ou conteúdo integral presente.");
  if (input.collected.claims.length !== 5 || input.collected.evidence.length !== 5)
    throw new Error("A persistência exige exatamente 5 claims e 5 evidências.");
  const excerptCharacters = input.collected.evidence.reduce(
    (total, item) => total + item.shortExcerpt.length,
    0,
  );
  if (
    excerptCharacters > 2_500 ||
    input.collected.evidence.some((item) => item.shortExcerpt.length > 500)
  )
    throw new Error("Limite autorizado de excerpts excedido.");
  const now = input.now ?? new Date();
  const at = now.toISOString();
  const scaffold = buildEvidenceScaffold({ ...input, now });
  const dossier = evidenceDossierSchema.parse({
    ...scaffold.dossier,
    status: "evidence-review",
    sourceAccess: {
      licenseConfirmed: true,
      accessType: "open",
      officialUrl: input.collected.source.url,
    },
    sourceIds: [input.collected.source.sourceId],
    claimIds: input.collected.claims.map(({ claimId }) => claimId),
    evidenceItemIds: input.collected.evidence.map(({ evidenceId }) => evidenceId),
    relatedEvidence: [],
    limitations: [
      {
        type: "abstract-only",
        statement: "Cobertura limitada ao abstract JATS oficial obtido via Crossref.",
        sourceId: input.collected.source.sourceId,
      },
      {
        type: "publisher-full-text-unavailable",
        statement:
          "HTML/XML integral da Wiley não acessado devido ao HTTP 403; challenge não contornado.",
        sourceId: input.collected.source.sourceId,
      },
    ],
    readiness: {
      level: "incomplete",
      checklist: [
        {
          key: "human-claim-review",
          satisfied: false,
          note: "Cinco claims candidate aguardam revisão humana.",
        },
        {
          key: "authorized-full-text-review",
          satisfied: false,
          note: "Conteúdo integral não revisado por fonte autorizada.",
        },
      ],
    },
    history: [
      ...scaffold.dossier.history,
      {
        action: "abstract-evidence-collected",
        actor: input.actor,
        note: "Crossref JATS; cobertura limitada; sem resposta bruta ou abstract integral.",
        at,
      },
    ],
    updatedAt: at,
  });
  const current = await loadEvidenceState(input.adapter ?? storageAdapter());
  const previousSource = current.sources.find(
    ({ sourceId, checksum }) =>
      sourceId === input.collected.source.sourceId && checksum === input.collected.source.checksum,
  );
  const previousDossier = current.dossiers.find(({ dossierId }) => dossierId === dossier.dossierId);
  const stableSource = previousSource ?? input.collected.source;
  const stableDossier =
    previousSource &&
    previousDossier?.relatedEvidence.length === 0 &&
    previousDossier.createdAt <= previousDossier.updatedAt
      ? previousDossier
      : dossier;
  const state = {
    dossiers: [
      ...current.dossiers.filter((item) => item.dossierId !== stableDossier.dossierId),
      stableDossier,
    ],
    sources: [stableSource],
    claims: input.collected.claims,
    evidence: input.collected.evidence,
  };
  const bytes = Buffer.byteLength(JSON.stringify(state), "utf8");
  if (bytes > 20_000) throw new Error(`Dossiê estruturado excede 20 KB (${bytes} bytes).`);
  const checksum = evidenceChecksum(state);
  const changed = checksum !== current.metadata.checksum;
  const adapter = input.adapter ?? storageAdapter();
  if (changed) {
    await saveEvidenceState({
      ...state,
      checksum,
      at,
      changed,
      mode: "crossref-abstract",
      adapter,
    });
    await adapter.appendAudit({
      id: crypto.randomUUID(),
      timestamp: at,
      actor: input.actor,
      action: "evidence.dossier.persisted",
      entity: "scientific-evidence",
      entityId: dossier.dossierId,
      reason: "Persistência local supervisionada do abstract oficial.",
      origin: "local-supervised",
      success: true,
      version: 1,
      after: { sources: 1, claims: 5, evidence: 5, coverage: "abstract-only", published: false },
    });
  }
  return { ...state, checksum, changed, persisted: changed, bytes, excerptCharacters };
}
