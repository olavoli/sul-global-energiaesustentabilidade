import { createHash } from "node:crypto";

import type { EditorialDecision, Pitch } from "./orchestrator-schema";
import type { EvidencePackage, StoryCluster } from "./story-schema";
import type { TranslationEntry } from "./translation-schema";

export function createPitch(
  decision: EditorialDecision,
  cluster: StoryCluster,
  evidence: EvidencePackage,
  translations: TranslationEntry[],
  actor: string,
  now: string,
): Pitch {
  if (decision.status !== "approved-for-pitch" || decision.humanDecision !== "approve-for-pitch")
    throw new Error("Pauta exige decisão humana approve-for-pitch persistida.");
  if (!actor.trim()) throw new Error("Criação de pauta exige --actor.");
  const id = `pitch-${createHash("sha256").update(decision.id).digest("hex").slice(0, 16)}`;
  const primarySourceId = cluster.primarySourceCandidate?.sourceId;
  return {
    id,
    decisionId: decision.id,
    clusterId: cluster.id,
    provisionalTitle: cluster.canonicalTitle,
    contentTypeSuggestion: "explainer",
    centralQuestion:
      "O que as fontes originais permitem afirmar e o que ainda precisa ser verificado?",
    audience: "Público interessado em energia, sustentabilidade, ciência e tecnologia.",
    whyItMatters: cluster.topics.map((topic) => `Relevância temática candidata: ${topic}.`),
    knownFacts: [],
    unverifiedClaims: evidence.claims.map(({ text }) => text),
    primarySources: evidence.sources
      .filter(({ id: sourceId }) => sourceId === primarySourceId)
      .map(({ url }) => url),
    secondarySources: evidence.sources
      .filter(({ id: sourceId }) => sourceId !== primarySourceId)
      .map(({ url }) => url),
    uncertainties: evidence.uncertainties,
    requiredFactChecks: evidence.pendingQuestions,
    translationNotes: translations
      .filter(({ clusterId }) => clusterId === cluster.id)
      .map(({ id: translationId, status }) => `${translationId}: ${status}.`),
    imageRequirements: ["Selecionar somente mídia licenciada; nenhuma imagem foi baixada."],
    legalReviewNeeded: ["high", "critical"].includes(decision.legalRisk),
    editorialRisks: Object.entries(decision.risks)
      .filter(([, value]) => ["high", "critical"].includes(value.level))
      .map(([category, value]) => `${category}: ${value.reasons.join(" ")}`),
    suggestedSections: [
      "Contexto e definições",
      "Evidências e limitações",
      "Pontos que exigem verificação",
    ],
    createdAt: now,
    createdBy: actor,
    updatedAt: now,
    status: "proposed",
    history: [
      {
        action: "pitch-created",
        at: now,
        actor,
        reason: "Decisão humana aprovada; pauta não é artigo.",
      },
    ],
  };
}

export function updatePitch(
  pitch: Pitch,
  actor: string,
  reason: string,
  now: string,
  status?: Pitch["status"],
): Pitch {
  if (!actor.trim() || !reason.trim()) throw new Error("Atualização exige ator e motivo.");
  return {
    ...pitch,
    status: status ?? pitch.status,
    updatedAt: now,
    history: [...pitch.history, { action: "pitch-updated", at: now, actor, reason }],
  };
}
