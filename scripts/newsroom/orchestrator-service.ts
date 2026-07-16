import { loadCatalog } from "./catalog";
import { loadEditorialPolicy } from "./editorial-policy";
import { orchestrate } from "./orchestrator";
import type { EditorialDecision } from "./orchestrator-schema";
import { loadClaims, loadClusters, loadEvidencePackages } from "./story-store";
import { loadTranslations } from "./translation";

export async function evaluateAll(): Promise<{
  policyVersion: string;
  decisions: EditorialDecision[];
}> {
  const [clusters, claims, packages, translations, sources, policy] = await Promise.all([
    loadClusters(),
    loadClaims(),
    loadEvidencePackages(),
    loadTranslations(),
    loadCatalog(),
    loadEditorialPolicy(),
  ]);
  const decisions = clusters.map((cluster) => {
    const evidence = packages.find(({ clusterId }) => clusterId === cluster.id);
    if (!evidence) throw new Error(`Pacote de evidência ausente: ${cluster.id}.`);
    return orchestrate({
      cluster,
      evidence,
      claims: claims.filter(({ clusterId }) => clusterId === cluster.id),
      translations: translations.filter(({ clusterId }) => clusterId === cluster.id),
      sources,
      policy,
    });
  });
  return { policyVersion: policy.version, decisions };
}
