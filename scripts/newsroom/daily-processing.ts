import type { AutomationPolicy } from "./automation-config";
import type { DailyState } from "./daily-state";
import { clusterQueue } from "./clustering";
import { saveDecisions, mergeEvaluations } from "./decision-store";
import { buildEvidencePackages } from "./evidence-packages";
import { orchestrate } from "./orchestrator";
import type { EditorialPolicy } from "./orchestrator-schema";
import { buildInbox, mergeInbox, saveInbox } from "./review-inbox";
import { saveStoryState } from "./story-store";
import { queueTranslation, saveTranslations } from "./translation";

export interface ProcessingCounters {
  clusters: number;
  translationsQueued: number;
  decisionsCreated: number;
  decisionsUpdated: number;
  reviewsPending: number;
}

export async function runDailyProcessing(
  state: DailyState,
  input: {
    automation: AutomationPolicy;
    editorial: EditorialPolicy;
    actor: string;
    now: Date;
    persist: boolean;
    translationEnabled: boolean;
    orchestrationEnabled: boolean;
  },
): Promise<{ state: DailyState; counters: ProcessingCounters }> {
  let { clusters, claims, packages, translations, decisions, inbox } = state;
  const clusteredIds = new Set(clusters.flatMap(({ itemIds }) => itemIds));
  if (state.queue.some(({ id }) => !clusteredIds.has(id))) {
    clusters = clusterQueue(state.queue, state.catalog, input.now.toISOString());
    const built = buildEvidencePackages(
      clusters,
      state.queue,
      state.catalog,
      input.now.toISOString(),
    );
    claims = built.claims;
    packages = built.packages;
    if (input.persist) await saveStoryState(clusters, claims, packages, input.now.toISOString());
  }
  const beforeTranslations = translations.length;
  if (input.translationEnabled) {
    for (const cluster of clusters.slice(0, input.automation.budgets.translationsQueued))
      translations = await queueTranslation(
        cluster,
        translations,
        input.now.toISOString(),
        input.actor,
      );
    if (input.persist) await saveTranslations(translations);
  }
  let decisionsCreated = 0;
  let decisionsUpdated = 0;
  if (input.orchestrationEnabled || !input.persist) {
    const evaluated = clusters
      .slice(0, input.automation.budgets.decisionsGenerated)
      .map((cluster) => {
        const evidence = packages.find(({ clusterId }) => clusterId === cluster.id);
        if (!evidence) throw new Error(`Pacote ausente: ${cluster.id}.`);
        return orchestrate({
          cluster,
          evidence,
          claims: claims.filter(({ clusterId }) => clusterId === cluster.id),
          translations: translations.filter(({ clusterId }) => clusterId === cluster.id),
          sources: state.catalog,
          policy: input.editorial,
        });
      });
    const previousIds = new Set(decisions.map(({ id }) => id));
    decisionsCreated = evaluated.filter(({ id }) => !previousIds.has(id)).length;
    decisionsUpdated = evaluated.filter(({ id }) => previousIds.has(id)).length;
    decisions = mergeEvaluations(decisions, evaluated);
    inbox = mergeInbox(inbox, buildInbox(decisions, clusters, packages, translations));
    if (input.persist)
      await Promise.all([saveDecisions(decisions, input.editorial.version), saveInbox(inbox)]);
  }
  return {
    state: { ...state, clusters, claims, packages, translations, decisions, inbox },
    counters: {
      clusters: clusters.length,
      translationsQueued: translations.length - beforeTranslations,
      decisionsCreated,
      decisionsUpdated,
      reviewsPending: decisions.filter(({ status }) => status === "human-review-required").length,
    },
  };
}
