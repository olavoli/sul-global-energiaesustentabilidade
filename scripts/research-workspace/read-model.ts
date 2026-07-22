import { loadCanonicalEntities } from "../entity-resolution/store";
import { loadConceptState } from "../scientific-concepts/store";
import { loadEvidenceState } from "../scientific-evidence/store";
import { loadScientificGraphs } from "../scientific-graph/store";
import { loadMemoryState } from "../scientific-memory/store";
import { loadScientificDossiers, loadScientificRadar } from "../scientific-radar/store";
import { loadTrendState } from "../scientific-trends/store";
import type { ModuleState, ResearchWorkspace } from "./contracts";
import { emptyChecklist, loadResearchChecklists, loadResearchNotes } from "./store";

type Loaded<T> = { value?: T; state: ModuleState };
export async function settleResearchModule<T>(
  loader: () => Promise<T>,
  count: (value: T) => number,
): Promise<Loaded<T>> {
  try {
    const value = await loader();
    return { value, state: { available: true, count: count(value) } };
  } catch (error) {
    return {
      state: {
        available: false,
        count: 0,
        error: error instanceof Error ? error.name : "Unavailable",
      },
    };
  }
}

export async function buildResearchWorkspace(
  workId: string,
): Promise<ResearchWorkspace | undefined> {
  const [radar, dossiers, evidence, graphs, concepts, memory, trends, identities, notes, checks] =
    await Promise.all([
      settleResearchModule(loadScientificRadar, ({ value }) => value.items.length),
      settleResearchModule(loadScientificDossiers, ({ value }) => value.items.length),
      settleResearchModule(loadEvidenceState, ({ dossiers: items }) => items.length),
      settleResearchModule(loadScientificGraphs, ({ value }) => value.items.length),
      settleResearchModule(loadConceptState, ({ concepts: items }) => items.length),
      settleResearchModule(
        loadMemoryState,
        ({ entities }) => Object.values(entities).flat().length,
      ),
      settleResearchModule(loadTrendState, ({ signals }) => signals.length),
      settleResearchModule(loadCanonicalEntities, ({ value }) => value.items.length),
      settleResearchModule(loadResearchNotes, ({ value }) => value.notes.length),
      settleResearchModule(loadResearchChecklists, ({ value }) => value.checklists.length),
    ]);
  const work = radar.value?.value.items.find(({ id }) => id === workId);
  if (!work) return undefined;
  const dossier = dossiers.value?.value.items.find(
    ({ scientificWorkId }) => scientificWorkId === workId,
  );
  const graph = graphs.value?.value.items.find(
    ({ scientificWorkId }) => scientificWorkId === workId,
  );
  const graphNodeIds = new Set(graph?.nodes.map(({ id }) => id) ?? []);
  const memoryItems = Object.values(memory.value?.entities ?? {})
    .flat()
    .filter(({ sources }) => sources.includes(workId));
  const memoryIds = new Set(memoryItems.map(({ id }) => id));
  const trendIds = new Set(dossier?.trendSignalIds ?? []);
  const trendItems = (trends.value?.signals ?? []).filter(
    ({ id, sourceMemoryIds }) =>
      trendIds.has(id) || sourceMemoryIds.some((source) => memoryIds.has(source)),
  );
  const conceptRelations = (concepts.value?.relations ?? []).filter(
    ({ from, to }) =>
      from === workId ||
      to === workId ||
      from === dossier?.id ||
      to === dossier?.id ||
      graphNodeIds.has(from) ||
      graphNodeIds.has(to) ||
      memoryIds.has(from) ||
      memoryIds.has(to),
  );
  const conceptIds = new Set(conceptRelations.flatMap(({ from, to }) => [from, to]));
  const conceptItems = (concepts.value?.concepts ?? [])
    .filter(({ id }) => conceptIds.has(id))
    .map((concept) => ({
      ...concept,
      relations: conceptRelations.filter(
        ({ from, to }) => from === concept.id || to === concept.id,
      ),
    }));
  const evidenceDossier = evidence.value?.dossiers.find(
    ({ scientificWorkId }) => scientificWorkId === workId,
  );
  const evidenceBundle = evidenceDossier
    ? {
        dossier: evidenceDossier,
        sources:
          evidence.value?.sources.filter(({ sourceId }) =>
            evidenceDossier.sourceIds.includes(sourceId),
          ) ?? [],
        claims:
          evidence.value?.claims.filter(({ claimId }) =>
            evidenceDossier.claimIds.includes(claimId),
          ) ?? [],
        evidence:
          evidence.value?.evidence.filter(({ evidenceId }) =>
            evidenceDossier.evidenceItemIds.includes(evidenceId),
          ) ?? [],
      }
    : undefined;
  return {
    workId,
    work,
    dossier,
    evidence: evidenceBundle,
    graph,
    concepts: conceptItems,
    memory: memoryItems,
    trends: trendItems,
    identities: (identities.value?.value.items ?? []).filter(({ sourceNodeIds }) =>
      sourceNodeIds.some((id) => graphNodeIds.has(id)),
    ),
    notes: notes.value?.value.notes.filter((note) => note.workId === workId) ?? [],
    checklist:
      checks.value?.value.checklists.find((item) => item.workId === workId) ??
      emptyChecklist(workId),
    modules: {
      radar: radar.state,
      dossier: dossiers.state,
      evidence: evidence.state,
      graph: graphs.state,
      concepts: concepts.state,
      memory: memory.state,
      trends: trends.state,
      identities: identities.state,
      notes: notes.state,
      checklist: checks.state,
    },
    restrictions: { generatedContent: false, publication: false, artificialIntelligence: false },
  };
}
