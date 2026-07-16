import { buildEvidencePackage } from "./evidence-packages";
import { loadEditorialPolicy } from "./editorial-policy";
import { orchestrate, type OrchestratorInput } from "./orchestrator";
import { clusterQueue } from "./clustering";
import { NOW, item, source } from "./story-test-fixtures";
import type { TranslationEntry } from "./translation-schema";

export async function orchestratorFixture(
  title = "NASA battery storage research",
): Promise<OrchestratorInput> {
  const sources = [source("source-a", "https://source-a.example.test/")];
  const queue = [item("item-a", title)];
  const cluster = clusterQueue(queue, sources, NOW)[0];
  const evidence = buildEvidencePackage(cluster, queue, sources, NOW);
  return {
    cluster,
    evidence,
    claims: evidence.claims,
    translations: [],
    sources,
    policy: await loadEditorialPolicy(),
  };
}

export function pendingTranslation(clusterId: string): TranslationEntry {
  return {
    id: "translation-0123456789abcdef",
    clusterId,
    sourceLanguage: "en",
    targetLanguage: "pt-BR",
    sourceText: "NASA battery storage research",
    translatedText: "Pesquisa da NASA sobre armazenamento de bateria",
    provider: "fixture",
    providerVersion: "fixture-v1",
    status: "review-required",
    glossaryVersion: "pt-BR-energy-v1",
    qualityChecks: [],
    createdAt: NOW,
    updatedAt: NOW,
    attempts: 1,
    history: [],
  };
}

export async function evaluatedFixture(title?: string) {
  const input = await orchestratorFixture(title);
  return { input, decision: orchestrate(input) };
}
