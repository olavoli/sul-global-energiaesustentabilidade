import type { GraphNode } from "../scientific-graph/contracts";
import type { CanonicalEntity, CanonicalEntityType } from "./contracts";
import { normalizeEntityName } from "./normalize";
import { canonicalEntityId, findDuplicateCandidates } from "./resolver";

const graphType: Partial<Record<GraphNode["type"], CanonicalEntityType>> = {
  author: "author",
  institution: "institution",
  journal: "journal",
  publisher: "publisher",
  funder: "funder",
  topic: "category",
};

export function canonicalEntitiesFromGraph(
  nodes: GraphNode[],
  now = new Date(),
): CanonicalEntity[] {
  return nodes.flatMap((node) => {
    const type = graphType[node.type];
    if (!type) return [];
    return [
      {
        id: canonicalEntityId(type, node.id),
        type,
        canonicalName: node.label,
        normalizedName: normalizeEntityName(node.label),
        aliases: [],
        externalIds: node.externalIds,
        sourceNodeIds: [node.id],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ];
  });
}

export function buildResolutionState(nodes: GraphNode[], now = new Date()) {
  const entities = canonicalEntitiesFromGraph(nodes, now);
  return { entities, candidates: findDuplicateCandidates(entities, now) };
}
