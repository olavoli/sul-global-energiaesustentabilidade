import { loadCatalog } from "./catalog";
import { loadDecisions } from "./decision-store";
import { loadInbox } from "./review-inbox";
import { loadQueue } from "./queue";
import { loadQuarantine } from "./quarantine";
import { loadCircuits } from "./retry-circuit";
import { loadRuntime } from "./runtime";
import { loadClaims, loadClusters, loadEvidencePackages } from "./story-store";
import { loadTranslations } from "./translation";

export interface DailyState {
  catalog: Awaited<ReturnType<typeof loadCatalog>>;
  queue: Awaited<ReturnType<typeof loadQueue>>;
  runtimes: Awaited<ReturnType<typeof loadRuntime>>;
  quarantine: Awaited<ReturnType<typeof loadQuarantine>>;
  circuits: Awaited<ReturnType<typeof loadCircuits>>;
  clusters: Awaited<ReturnType<typeof loadClusters>>;
  claims: Awaited<ReturnType<typeof loadClaims>>;
  packages: Awaited<ReturnType<typeof loadEvidencePackages>>;
  translations: Awaited<ReturnType<typeof loadTranslations>>;
  decisions: Awaited<ReturnType<typeof loadDecisions>>;
  inbox: Awaited<ReturnType<typeof loadInbox>>;
}

export async function loadDailyState(): Promise<DailyState> {
  const [
    catalog,
    queue,
    runtimes,
    quarantine,
    circuits,
    clusters,
    claims,
    packages,
    translations,
    decisions,
    inbox,
  ] = await Promise.all([
    loadCatalog(),
    loadQueue(),
    loadRuntime(),
    loadQuarantine(),
    loadCircuits(),
    loadClusters(),
    loadClaims(),
    loadEvidencePackages(),
    loadTranslations(),
    loadDecisions(),
    loadInbox(),
  ]);
  return {
    catalog,
    queue,
    runtimes,
    quarantine,
    circuits,
    clusters,
    claims,
    packages,
    translations,
    decisions,
    inbox,
  };
}
