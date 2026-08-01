import {
  confidenceLevels,
  scientificGraphSchema,
  type GraphProvenance,
  type ScientificGraph,
} from "./contracts";

export interface GraphIntegrityReport {
  nodes: number;
  relations: number;
  uniqueNodeIds: boolean;
  uniqueRelationIds: boolean;
  validReferences: boolean;
  completeProvenance: boolean;
  validConfidence: boolean;
  humanReviewRepresented: boolean;
}

const confidenceRank: Record<GraphProvenance["confidence"], number> = {
  uncertain: 0,
  probable: 1,
  confirmed: 2,
};

function unique(values: string[]): boolean {
  return new Set(values).size === values.length;
}

function expectedConfidence(evidence: GraphProvenance[]): GraphProvenance["confidence"] {
  return evidence.reduce<GraphProvenance["confidence"]>(
    (highest, item) =>
      confidenceRank[item.confidence] > confidenceRank[highest] ? item.confidence : highest,
    "uncertain",
  );
}

export function validateScientificGraphIntegrity(input: ScientificGraph): GraphIntegrityReport {
  const graph = scientificGraphSchema.parse(input);
  const nodeIds = graph.nodes.map(({ id }) => id);
  const relationIds = graph.relations.map(({ id }) => id);
  const knownNodes = new Set(nodeIds);
  return {
    nodes: graph.nodes.length,
    relations: graph.relations.length,
    uniqueNodeIds: unique(nodeIds),
    uniqueRelationIds: unique(relationIds),
    validReferences:
      knownNodes.has(graph.rootNodeId) &&
      graph.relations.every(({ from, to }) => knownNodes.has(from) && knownNodes.has(to)),
    completeProvenance:
      graph.nodes.every(({ sourceRecords }) => sourceRecords.length > 0) &&
      graph.relations.every(({ sourceEvidence }) => sourceEvidence.length > 0),
    validConfidence: graph.relations.every(
      ({ confidence, sourceEvidence }) =>
        confidenceLevels.includes(confidence) && confidence === expectedConfidence(sourceEvidence),
    ),
    humanReviewRepresented: graph.relations.every(
      ({ humanStatus, history }) =>
        humanStatus === "unread" || history.some(({ status }) => status === humanStatus),
    ),
  };
}

export function assertScientificGraphIntegrity(graph: ScientificGraph): GraphIntegrityReport {
  const report = validateScientificGraphIntegrity(graph);
  const failed = Object.entries(report)
    .filter(([key, value]) => key !== "nodes" && key !== "relations" && value === false)
    .map(([key]) => key);
  if (failed.length) throw new Error(`Grafo científico inválido: ${failed.join(", ")}.`);
  return report;
}
