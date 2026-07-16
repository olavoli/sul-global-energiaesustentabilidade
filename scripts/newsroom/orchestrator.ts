import { createHash } from "node:crypto";

import { evaluateReadiness } from "./editorial-readiness";
import { evaluateRisks, highestRisk, sourceBlocked } from "./orchestrator-risk";
import type { EditorialDecision, EditorialPolicy } from "./orchestrator-schema";
import type { NewsSource } from "./schema";
import type { ClaimCandidate, EvidencePackage, StoryCluster } from "./story-schema";
import type { TranslationEntry } from "./translation-schema";

export interface OrchestratorInput {
  cluster: StoryCluster;
  evidence: EvidencePackage;
  claims: ClaimCandidate[];
  translations: TranslationEntry[];
  sources: NewsSource[];
  policy: EditorialPolicy;
}

export const ORCHESTRATOR_VERSION = "deterministic-orchestrator-1.2";

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function orchestrate(input: OrchestratorInput): EditorialDecision {
  const { cluster, evidence, claims, translations, sources, policy } = input;
  const relevantTranslations = translations.filter(({ clusterId }) => clusterId === cluster.id);
  const risks = evaluateRisks(cluster, evidence, claims, relevantTranslations, sources, policy);
  const riskLevel = highestRisk(risks);
  const blockers: string[] = [];
  if (!evidence.sources.length) blockers.push("missing-source");
  if (evidence.sources.some(({ url }) => !url)) blockers.push("missing-original-url");
  if (claims.some(({ sourceIds }) => !sourceIds.length)) blockers.push("unattributed-claim");
  if (evidence.contradictions.length) blockers.push("unreviewed-contradiction");
  if (relevantTranslations.some(({ status }) => !["approved", "not-required"].includes(status)))
    blockers.push("unreviewed-translation");
  if (riskLevel === "critical" && policy.thresholds.criticalRiskBlocks)
    blockers.push("critical-risk");
  if (sourceBlocked(cluster, sources)) blockers.push("blocked-source");
  if (claims.some(({ text }) => text.length > 500)) blockers.push("snippet-policy-violation");
  if (Number.isNaN(new Date(cluster.firstPublishedAt).valueOf())) blockers.push("invalid-date");
  if (
    evidence.promotionalSignals.length &&
    cluster.clusterScore < policy.thresholds.minimumTopicScore
  )
    blockers.push("promotional-only");
  if (!cluster.topics.length) blockers.push("insufficient-topic-evidence");
  if (risks.privacy.level === "critical") blockers.push("sensitive-personal-data");
  const finalBlockers = unique(blockers);
  const warnings = unique([
    ...(cluster.independentSourceCount < 2 ? ["single-source", "no-independent-confirmation"] : []),
    ...(risks.image.level === "unknown" ? ["image-license-unknown"] : []),
  ]);
  const readiness = evaluateReadiness(
    cluster,
    evidence,
    relevantTranslations,
    risks,
    finalBlockers,
  );
  const inputFingerprint = sha(
    JSON.stringify({
      orchestratorVersion: ORCHESTRATOR_VERSION,
      cluster,
      evidence,
      claims,
      translations: relevantTranslations,
      policy,
    }),
  );
  const id = `decision-${sha(`${cluster.id}|${policy.version}|${inputFingerprint}`).slice(0, 16)}`;
  const confidence = finalBlockers.length || cluster.independentSourceCount < 2 ? "low" : "medium";
  const recommendation: EditorialDecision["recommendation"] =
    riskLevel === "critical"
      ? "urgent-human-review"
      : finalBlockers.includes("unreviewed-translation")
        ? "request-translation-review"
        : finalBlockers.some((value) =>
              ["missing-source", "insufficient-topic-evidence", "promotional-only"].includes(value),
            )
          ? "reject"
          : cluster.independentSourceCount < 2
            ? "request-more-sources"
            : cluster.clusterScore >= policy.thresholds.priorityScore
              ? "prepare-pitch"
              : "human-review";
  const requiredActions = unique([
    ...readiness.overallReady.requiredActions,
    ...(cluster.independentSourceCount < 2 ? ["Buscar fonte institucional independente."] : []),
    ...(finalBlockers.includes("unreviewed-translation")
      ? ["Revisar tradução comparando com o original."]
      : []),
    ...(riskLevel === "critical" ? ["Executar revisão humana urgente e especializada."] : []),
  ]);
  const createdAt = cluster.lastUpdatedAt;
  return {
    id,
    clusterId: cluster.id,
    evidencePackageId: evidence.id,
    topics: cluster.topics,
    createdAt,
    updatedAt: createdAt,
    policyVersion: policy.version,
    inputFingerprint,
    status: "human-review-required",
    recommendation,
    confidence,
    riskLevel,
    blockers: finalBlockers,
    warnings,
    evidenceStrength: Math.min(
      100,
      25 + evidence.sources.length * 20 + evidence.confirmations.length * 20,
    ),
    sourceDiversity: Math.min(100, cluster.independentSourceCount * 35),
    geographicRelevance:
      cluster.topics.includes("Sul Global") || cluster.countries.some((country) => country !== "US")
        ? 80
        : 20,
    topicRelevance: Math.min(100, cluster.topics.length * 15),
    novelty: cluster.itemIds.length === 1 ? 70 : 50,
    educationalPotential: cluster.topics.some((topic) =>
      /pesquisa|eficiência|sustentabilidade/.test(topic),
    )
      ? 70
      : 40,
    publicInterest: cluster.clusterScore >= 60 ? 70 : 40,
    urgency: cluster.recommendation === "priority" ? 60 : 30,
    promotionalRisk: evidence.promotionalSignals.length ? "medium" : "low",
    legalRisk: risks.legal.level,
    reputationalRisk: risks.reputational.level,
    factualRisk: risks.factual.level,
    translationRisk: risks.translation.level,
    imageRisk: risks.image.level,
    decisionReasons: [
      `Política aplicada: ${policy.version}.`,
      `Orquestrador: ${ORCHESTRATOR_VERSION}.`,
      `Recomendação ${recommendation} derivada de ${finalBlockers.length} bloqueador(es) e risco ${riskLevel}.`,
      `Fontes independentes: ${cluster.independentSourceCount}; confiança não representa veracidade.`,
    ],
    requiredActions,
    risks,
    readiness,
    history: [
      {
        action: "evaluated",
        at: createdAt,
        actor: "deterministic-orchestrator",
        notes: `Política ${policy.version}; nenhuma publicação ou pauta automática.`,
      },
    ],
  };
}
