import { loadCatalog } from "../../../scripts/newsroom/catalog";
import { buildCoverageReport } from "../../../scripts/newsroom/coverage";
import { loadDecisions, loadPitches } from "../../../scripts/newsroom/decision-store";
import { calculateAutomationMetrics } from "../../../scripts/newsroom/automation-metrics";
import {
  loadAutomationPolicy,
  resolveAutomationSwitches,
} from "../../../scripts/newsroom/automation-config";
import { dailyReportSchema } from "../../../scripts/newsroom/automation-schema";
import { loadInbox } from "../../../scripts/newsroom/review-inbox";
import { loadQueue } from "../../../scripts/newsroom/queue";
import { loadQuarantine } from "../../../scripts/newsroom/quarantine";
import { loadCircuits } from "../../../scripts/newsroom/retry-circuit";
import { loadRuns } from "../../../scripts/newsroom/run-store";
import { loadRuntime } from "../../../scripts/newsroom/runtime";
import {
  loadClaims,
  loadClusters,
  loadEvidencePackages,
} from "../../../scripts/newsroom/story-store";
import { loadTranslations } from "../../../scripts/newsroom/translation";
import type { AdminSection } from "./contracts";
import { storageAdapter } from "../../../scripts/newsroom/storage/runtime";
import { loadScientificRadar } from "../../../scripts/scientific-radar/store";
import { loadScientificGraphs } from "../../../scripts/scientific-graph/store";
import { loadMemoryState } from "../../../scripts/scientific-memory/store";
import { loadTrendState } from "../../../scripts/scientific-trends/store";
import { loadConceptState } from "../../../scripts/scientific-concepts/store";
import { loadEvidenceState } from "../../../scripts/scientific-evidence/store";
import {
  loadCanonicalEntities,
  loadDuplicateCandidates,
} from "../../../scripts/entity-resolution/store";

function sanitize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function reports(): Promise<unknown[]> {
  const page = await storageAdapter().listObjects("reports/", 50);
  return page.items
    .filter(({ key }) => key.endsWith(".json"))
    .sort((a, b) => b.key.localeCompare(a.key))
    .map(({ body }) => dailyReportSchema.parse(JSON.parse(body)));
}

export async function dashboardData(
  environment: Record<string, string | undefined>,
): Promise<Record<string, unknown>> {
  const [
    catalog,
    runtimes,
    queue,
    clusters,
    decisions,
    translations,
    quarantine,
    circuits,
    runs,
    inbox,
  ] = await Promise.all([
    loadCatalog(),
    loadRuntime(),
    loadQueue(),
    loadClusters(),
    loadDecisions(),
    loadTranslations(),
    loadQuarantine(),
    loadCircuits(),
    loadRuns(),
    loadInbox(),
  ]);
  const latest = runs.at(-1);
  const commonBlockers = decisions
    .flatMap(({ blockers }) => blockers)
    .reduce<Record<string, number>>((result, blocker) => {
      result[blocker] = (result[blocker] ?? 0) + 1;
      return result;
    }, {});
  return sanitize({
    latestRun: latest
      ? {
          id: latest.id,
          status: latest.status,
          durationMs: latest.durationMs,
          mode: latest.mode,
          finishedAt: latest.finishedAt,
        }
      : null,
    sourcesHealthy: runtimes.filter(({ health }) => health?.status === "healthy").length,
    sourcesDegraded: runtimes.filter(({ health }) =>
      ["degraded", "stale", "invalid", "unknown"].includes(health?.status ?? "unknown"),
    ).length,
    openCircuits: circuits.filter(({ state }) => state === "open").length,
    items: queue.length,
    clusters: clusters.length,
    decisions: decisions.length,
    reviewsPending: decisions.filter(({ status }) => status === "human-review-required").length,
    translationsPending: translations.filter(({ status }) =>
      ["queued", "review-required", "failed"].includes(status),
    ).length,
    quarantine: quarantine.length,
    highRisks: decisions.filter(({ riskLevel }) => ["high", "critical"].includes(riskLevel)).length,
    commonBlockers,
    coverage: buildCoverageReport(catalog, queue),
    switches: resolveAutomationSwitches(environment),
    metrics: calculateAutomationMetrics(runs, circuits, inbox),
  });
}

export async function sectionData(
  section: AdminSection,
  environment: Record<string, string | undefined>,
): Promise<unknown> {
  if (section === "dashboard") return dashboardData(environment);
  if (section === "inbox") return sanitize(await loadInbox());
  if (section === "decisions") return sanitize(await loadDecisions());
  if (section === "clusters") return sanitize(await loadClusters());
  if (section === "translations") return sanitize(await loadTranslations());
  if (section === "sources") {
    const [catalog, runtimes, circuits] = await Promise.all([
      loadCatalog(),
      loadRuntime(),
      loadCircuits(),
    ]);
    return sanitize(
      catalog.map((source) => ({
        ...source,
        runtime: runtimes.find(({ sourceId }) => sourceId === source.id),
        circuit: circuits.find(({ sourceId }) => sourceId === source.id),
      })),
    );
  }
  if (section === "quarantine") return sanitize(await loadQuarantine());
  if (section === "runs") return sanitize(await loadRuns());
  if (section === "reports") return sanitize(await reports());
  if (section === "pitches") return sanitize(await loadPitches());
  if (section === "scientific-radar") return sanitize((await loadScientificRadar()).value.items);
  if (section === "scientific-memory") {
    const memory = await loadMemoryState();
    return sanitize(Object.values(memory.entities).flat());
  }
  if (section === "scientific-trends") return sanitize((await loadTrendState()).signals);
  if (section === "scientific-concepts") {
    const state = await loadConceptState();
    return sanitize(
      state.concepts.map((concept) => ({
        ...concept,
        relations: state.relations.filter(
          ({ from, to }) => from === concept.id || to === concept.id,
        ),
      })),
    );
  }
  if (section === "scientific-evidence") return sanitize((await loadEvidenceState()).dossiers);
  if (section === "scientific-graph") return sanitize((await loadScientificGraphs()).value.items);
  if (section === "entity-resolution") {
    const [entities, candidates] = await Promise.all([
      loadCanonicalEntities(),
      loadDuplicateCandidates(),
    ]);
    return sanitize(
      candidates.value.items.map((candidate) => ({
        ...candidate,
        left: entities.value.items.find(({ id }) => id === candidate.leftEntityId),
        right: entities.value.items.find(({ id }) => id === candidate.rightEntityId),
      })),
    );
  }
  return sanitize({
    automation: await loadAutomationPolicy(),
    switches: resolveAutomationSwitches(environment),
    fullApplyFromInterface: false,
    externalCollectionFromInterface: false,
  });
}

export async function detailData(section: AdminSection, id: string): Promise<unknown | undefined> {
  if (section === "scientific-trends")
    return (await loadTrendState()).signals.find((entry) => entry.id === id);
  if (section === "scientific-concepts") {
    const state = await loadConceptState();
    const relation = state.relations.find((entry) => entry.id === id);
    if (!relation) return undefined;
    return sanitize({
      relation,
      fromConcept: state.concepts.find(({ id: conceptId }) => conceptId === relation.from),
      toConcept: state.concepts.find(({ id: conceptId }) => conceptId === relation.to),
      automaticMerge: false,
      generatedContent: false,
    });
  }
  if (section === "scientific-evidence") {
    const state = await loadEvidenceState();
    const dossier = state.dossiers.find((entry) => entry.dossierId === id);
    if (dossier)
      return sanitize({
        dossier,
        sources: state.sources.filter(({ sourceId }) => dossier.sourceIds.includes(sourceId)),
        claims: state.claims.filter(({ claimId }) => dossier.claimIds.includes(claimId)),
        evidence: state.evidence.filter(({ evidenceId }) =>
          dossier.evidenceItemIds.includes(evidenceId),
        ),
      });
    return sanitize(
      state.sources.find(({ sourceId }) => sourceId === id) ??
        state.claims.find(({ claimId }) => claimId === id) ??
        state.evidence.find(({ evidenceId }) => evidenceId === id),
    );
  }
  if (section === "scientific-radar")
    return (await loadScientificRadar()).value.items.find((entry) => entry.id === id);
  if (section === "scientific-graph") {
    const graphs = (await loadScientificGraphs()).value.items;
    return (
      graphs.find(({ id: graphId }) => graphId === id) ??
      graphs.flatMap(({ relations }) => relations).find(({ id: relationId }) => relationId === id)
    );
  }
  if (section === "entity-resolution") {
    const [entities, candidates] = await Promise.all([
      loadCanonicalEntities(),
      loadDuplicateCandidates(),
    ]);
    const candidate = candidates.value.items.find((entry) => entry.id === id);
    if (!candidate) return undefined;
    return sanitize({
      candidate,
      left: entities.value.items.find(({ id: entityId }) => entityId === candidate.leftEntityId),
      right: entities.value.items.find(({ id: entityId }) => entityId === candidate.rightEntityId),
      automaticMerge: false,
    });
  }
  if (section === "inbox") return (await loadInbox()).find((entry) => entry.id === id);
  if (section === "decisions") {
    const decision = (await loadDecisions()).find((entry) => entry.id === id);
    if (!decision) return undefined;
    const [clusters, packages, claims, translations] = await Promise.all([
      loadClusters(),
      loadEvidencePackages(),
      loadClaims(),
      loadTranslations(),
    ]);
    return sanitize({
      decision,
      cluster: clusters.find(({ id: value }) => value === decision.clusterId),
      evidence: packages.find(({ clusterId }) => clusterId === decision.clusterId),
      claims: claims.filter(({ clusterId }) => clusterId === decision.clusterId),
      translations: translations.filter(({ clusterId }) => clusterId === decision.clusterId),
    });
  }
  if (section === "clusters") {
    const cluster = (await loadClusters()).find((entry) => entry.id === id);
    if (!cluster) return undefined;
    const [queue, packages, claims, translations] = await Promise.all([
      loadQueue(),
      loadEvidencePackages(),
      loadClaims(),
      loadTranslations(),
    ]);
    return sanitize({
      cluster,
      items: queue.filter(({ id: value }) => cluster.itemIds.includes(value)),
      evidence: packages.find(({ clusterId }) => clusterId === id),
      claims: claims.filter(({ clusterId }) => clusterId === id),
      translations: translations.filter(({ clusterId }) => clusterId === id),
    });
  }
  if (section === "translations")
    return (await loadTranslations()).find((entry) => entry.id === id);
  if (section === "sources") {
    const [catalog, runtimes, circuits] = await Promise.all([
      loadCatalog(),
      loadRuntime(),
      loadCircuits(),
    ]);
    const source = catalog.find((entry) => entry.id === id);
    if (!source) return undefined;
    return sanitize({
      source,
      runtime: runtimes.find(({ sourceId }) => sourceId === id),
      circuit: circuits.find(({ sourceId }) => sourceId === id),
    });
  }
  if (section === "runs") return (await loadRuns()).find((entry) => entry.id === id);
  if (section === "pitches") return (await loadPitches()).find((entry) => entry.id === id);
  return undefined;
}
