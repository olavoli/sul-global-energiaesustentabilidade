import { resolve } from "node:path";

import { loadDocument, saveDocument } from "./atomic-store";
import {
  claimDocumentSchema,
  clusterDocumentSchema,
  evidenceDocumentSchema,
  type ClaimCandidate,
  type EvidencePackage,
  type StoryCluster,
} from "./story-schema";

const CLUSTERS = resolve("newsroom/clusters.json");
const CLAIMS = resolve("newsroom/claims.json");
const EVIDENCE = resolve("newsroom/evidence-packages.json");

export async function loadClusters(): Promise<StoryCluster[]> {
  return (
    await loadDocument(CLUSTERS, clusterDocumentSchema, {
      version: 1,
      generatedAt: new Date(0).toISOString(),
      clusters: [],
    })
  ).clusters;
}

export async function saveStoryState(
  clusters: StoryCluster[],
  claims: ClaimCandidate[],
  packages: EvidencePackage[],
  now: string,
): Promise<void> {
  await saveDocument(CLUSTERS, clusterDocumentSchema, { version: 1, generatedAt: now, clusters });
  await saveDocument(CLAIMS, claimDocumentSchema, { version: 1, claims });
  await saveDocument(EVIDENCE, evidenceDocumentSchema, { version: 1, packages });
}

export async function loadClaims(): Promise<ClaimCandidate[]> {
  return (await loadDocument(CLAIMS, claimDocumentSchema, { version: 1, claims: [] })).claims;
}

export async function loadEvidencePackages(): Promise<EvidencePackage[]> {
  return (await loadDocument(EVIDENCE, evidenceDocumentSchema, { version: 1, packages: [] }))
    .packages;
}
