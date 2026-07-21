import { createHash } from "node:crypto";
import type { ScientificGraph } from "../scientific-graph/contracts";
import type { EntityMemory } from "../scientific-memory/contracts";
import {
  conceptSchema,
  conceptRelationSchema,
  type Concept,
  type ConceptRelation,
} from "./contracts";
import { exactConcept, type ConceptTaxonomy } from "./taxonomy";

const epoch = "1970-01-01T00:00:00.000Z";
const relationId = (type: string, from: string, to: string) =>
  `concept-relation-${createHash("sha256").update(`${type}:${from}:${to}`).digest("hex").slice(0, 16)}`;
type Provenance = ConceptRelation["provenance"][number];

function relation(
  type: ConceptRelation["type"],
  from: string,
  to: string,
  provenance: Provenance,
): ConceptRelation {
  return conceptRelationSchema.parse({
    schemaVersion: 1,
    id: relationId(type, from, to),
    type,
    from,
    to,
    confidence: 100,
    provenance: [provenance],
    humanStatus: "pending",
    history: [],
    observedAt: provenance.observedAt,
  });
}

export function buildConceptGraph(input: {
  taxonomy: ConceptTaxonomy;
  graphs: ScientificGraph[];
  memories?: EntityMemory[];
}) {
  const relations = new Map<string, ConceptRelation>();
  const observed = new Set<string>();
  const unresolved = new Set<string>();
  const put = (item: ConceptRelation) => relations.set(item.id, item);
  for (const graph of input.graphs) {
    const root = graph.nodes.find(({ id }) => id === graph.rootNodeId);
    for (const topic of graph.nodes.filter(({ type }) => type === "topic")) {
      const concept = exactConcept(input.taxonomy, topic.label);
      if (!concept) {
        unresolved.add(topic.label);
        continue;
      }
      observed.add(concept.id);
      const evidence: Provenance = {
        sourceType: "scientific-graph",
        sourceId: topic.id,
        evidence: `exact-alias:${topic.label}`,
        observedAt: graph.updatedAt,
      };
      put(relation("paper-concept", root?.id ?? graph.scientificWorkId, concept.id, evidence));
      put(relation("concept-dossier", concept.id, graph.scientificWorkId, evidence));
    }
  }
  for (const memory of input.memories ?? []) {
    if (memory.type !== "category") continue;
    const concept = exactConcept(input.taxonomy, memory.name);
    if (!concept) continue;
    observed.add(concept.id);
    put(
      relation("concept-timeline", concept.id, memory.id, {
        sourceType: "scientific-memory",
        sourceId: memory.id,
        evidence: `exact-alias:${memory.name}`,
        observedAt: memory.updatedAt,
      }),
    );
  }
  for (const entry of input.taxonomy.concepts.filter(({ id }) => observed.has(id)))
    for (const target of entry.relations) observed.add(target);
  for (const concept of input.taxonomy.concepts.filter(({ id }) => observed.has(id))) {
    const provenance: Provenance = {
      sourceType: "controlled-taxonomy",
      sourceId: input.taxonomy.taxonomyVersion,
      evidence: concept.id,
      observedAt: epoch,
    };
    put(relation("concept-theme", concept.id, concept.themeId, provenance));
    for (const target of concept.relations)
      put(relation("concept-concept", concept.id, target, provenance));
  }
  const values = [...relations.values()].sort((a, b) => a.id.localeCompare(b.id));
  const concepts: Concept[] = input.taxonomy.concepts
    .filter(({ id }) => observed.has(id))
    .map((entry) => {
      const own = values.filter(({ from, to }) => from === entry.id || to === entry.id);
      const last =
        own
          .map(({ observedAt }) => observedAt)
          .sort()
          .at(-1) ?? epoch;
      return conceptSchema.parse({
        schemaVersion: 1,
        id: entry.id,
        label: entry.label,
        aliases: [...new Set([entry.label, ...entry.aliases])].sort(),
        category: entry.category,
        confidence: 100,
        origin: "controlled-taxonomy",
        provenance: [
          {
            sourceType: "controlled-taxonomy",
            sourceId: input.taxonomy.taxonomyVersion,
            evidence: entry.id,
            observedAt: epoch,
          },
          ...own.flatMap(({ provenance }) => provenance),
        ],
        observedRelationIds: own.map(({ id }) => id).sort(),
        taxonomyVersion: input.taxonomy.taxonomyVersion,
        updatedAt: last,
      });
    })
    .sort((a, b) => a.id.localeCompare(b.id));
  return { concepts, relations: values, unresolvedTopics: [...unresolved].sort() };
}
