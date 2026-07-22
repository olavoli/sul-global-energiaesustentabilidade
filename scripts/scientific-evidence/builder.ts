import type { ScientificWork, ScientificDossier } from "../scientific-radar/contracts";
import type { ScientificGraph } from "../scientific-graph/contracts";
import {
  evidenceDossierSchema,
  evidenceSourceSchema,
  type EvidenceClaim,
  type EvidenceItem,
} from "./contracts";
import { evidenceId } from "./ids";
import { evidenceReadiness } from "./readiness";

export function buildEvidenceScaffold(input: {
  work: ScientificWork;
  dossier: ScientificDossier;
  graph: ScientificGraph;
  now?: Date;
}) {
  if (
    input.dossier.scientificWorkId !== input.work.id ||
    input.graph.scientificWorkId !== input.work.id
  )
    throw new Error("Objetos científicos incompatíveis.");
  if (
    !input.work.crossrefValidated ||
    input.work.retracted ||
    input.work.warnings.some(({ severity, resolved }) => severity === "blocker" && !resolved)
  )
    throw new Error("Trabalho científico bloqueado.");
  if (!input.dossier.graphId || input.dossier.generatedContent)
    throw new Error("Dossiê estrutural incompatível.");
  const at = (input.now ?? new Date()).toISOString();
  const source = evidenceSourceSchema.parse({
    sourceId: evidenceId("evidence-source", `${input.work.id}:metadata`),
    type: "official-metadata",
    title: input.work.title,
    url: input.work.officialLinks.doi,
    doi: input.work.doi,
    publisher: input.work.publisher ?? undefined,
    authors: input.work.authors,
    publicationDate: input.work.publicationDate,
    license: input.work.license ?? "unknown",
    accessType: "metadata-only",
    retrievedAt: at,
    verifiedAt: at,
    provenance: [
      {
        source: "scientific-radar",
        sourceId: input.work.id,
        retrievedAt: at,
        method: "persisted-metadata",
      },
    ],
    warnings: input.work.warnings.map(({ code }) => code),
    humanStatus: "unread",
  });
  const relationTypes = new Set([
    "cites",
    "cited-by",
    "related-to",
    "version-of",
    "corrects",
    "retracts",
  ]);
  const relatedEvidence = input.graph.relations
    .filter(({ type }) => relationTypes.has(type))
    .map(({ type, from, to }) => ({
      relationType: type as "cites",
      workId: from === input.graph.rootNodeId ? to : from,
      classification: "uninterpreted" as const,
    }));
  const empty = { claims: [] as EvidenceClaim[], evidence: [] as EvidenceItem[] };
  const base = evidenceDossierSchema.parse({
    schemaVersion: 1,
    dossierId: evidenceId("evidence-dossier", input.dossier.id),
    scientificWorkId: input.work.id,
    graphId: input.dossier.graphId,
    status: "scaffold",
    sourceAccess: {
      licenseConfirmed: input.work.license === "cc-by",
      accessType: "metadata-only",
      officialUrl: input.work.officialLinks.doi,
    },
    sourceIds: [source.sourceId],
    claimIds: [],
    evidenceItemIds: [],
    limitations: [],
    uncertainties: input.work.warnings.map(({ code, message }) => ({
      type: code,
      statement: message,
    })),
    contradictions: [],
    relatedEvidence,
    terminology: [],
    methodologyNotes: [],
    dataNotes: [],
    statisticalNotes: [],
    funding: [],
    conflictsOfInterest: [],
    copyright: {
      license: input.work.license ?? "unknown",
      fullTextStored: false,
      figuresStored: false,
      tablesStored: false,
      excerptLimit: 500,
    },
    openQuestions: [],
    factChecks: [],
    editorialQuestions: [],
    humanReview: { completed: false, reviewer: null, reviewedAt: null },
    readiness: { level: "incomplete", checklist: [] },
    history: [
      {
        action: "scaffold-created",
        actor: "system",
        note: "Metadados persistidos; sem coleta externa.",
        at,
      },
    ],
    createdAt: at,
    updatedAt: at,
  });
  const dossier = evidenceDossierSchema.parse({
    ...base,
    readiness: evidenceReadiness({ dossier: base, sources: [source], ...empty }),
  });
  return { dossier, sources: [source], ...empty };
}
