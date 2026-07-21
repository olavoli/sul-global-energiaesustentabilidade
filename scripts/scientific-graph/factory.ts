import { normalizeDoi } from "../scientific-radar/sources";
import {
  graphNodeSchema,
  graphRelationSchema,
  type GraphNode,
  type GraphProvenance,
  type GraphRelation,
} from "./contracts";
import { normalizeExternalId, stableGraphId } from "./ids";
import { stringValue, type SourceRecord } from "./sources";

export function nested(value: unknown): SourceRecord {
  return value && typeof value === "object" ? (value as SourceRecord) : {};
}
export function arrayStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.flatMap((item) => (stringValue(item) ? [stringValue(item)!] : []))
    : [];
}
function endpoint(record: SourceRecord): string {
  return stringValue(record.id) ?? "https://api.openalex.org/works";
}
export function oaProvenance(
  record: SourceRecord,
  now: string,
  method: string,
  confidence: GraphProvenance["confidence"] = "probable",
): GraphProvenance {
  return {
    source: "openalex",
    endpoint: endpoint(record),
    externalId: normalizeExternalId(endpoint(record)),
    retrievedAt: now,
    normalization: method,
    confidence,
  };
}
export function crossrefProvenance(doi: string, now: string): GraphProvenance {
  return {
    source: "crossref",
    endpoint: `https://api.crossref.org/works/${encodeURIComponent(doi)}`,
    externalId: doi,
    retrievedAt: now,
    normalization: "DOI canônico",
    confidence: "confirmed",
  };
}
export async function graphNode(
  type: GraphNode["type"],
  key: string,
  label: string,
  externalIds: Record<string, string>,
  sourceRecords: GraphProvenance[],
  now: string,
  metadata: GraphNode["metadata"] = {},
  warnings: string[] = [],
): Promise<GraphNode> {
  return graphNodeSchema.parse({
    id: await stableGraphId("sgn", `${type}:${key}`),
    type,
    label,
    externalIds,
    sourceRecords,
    firstSeenAt: now,
    lastCheckedAt: now,
    warnings,
    status: warnings.includes("trabalho-retratado") ? "blocked" : "active",
    metadata,
  });
}
export async function graphRelation(
  from: string,
  to: string,
  type: GraphRelation["type"],
  evidence: GraphProvenance[],
  now: string,
  warnings: string[] = [],
): Promise<GraphRelation> {
  const confidence = evidence.some(({ confidence: value }) => value === "confirmed")
    ? "confirmed"
    : evidence.some(({ confidence: value }) => value === "probable")
      ? "probable"
      : "uncertain";
  return graphRelationSchema.parse({
    id: await stableGraphId("sgr", `${from}:${to}:${type}`),
    from,
    to,
    type,
    source: [...new Set(evidence.map(({ source }) => source))],
    sourceEvidence: evidence,
    detectedAt: now,
    confidence,
    humanStatus: "unread",
    warnings,
    history: [],
  });
}
export function workIdentity(record: SourceRecord): {
  key: string;
  doi?: string;
  openAlex?: string;
  title: string;
} {
  const doiRaw = stringValue(record.doi);
  const doi = doiRaw ? normalizeDoi(doiRaw) : undefined;
  const openAlex = stringValue(record.id)?.replace(/^https?:\/\/openalex\.org\//i, "");
  const title =
    stringValue(record.display_name) ??
    stringValue(record.title) ??
    openAlex ??
    doi ??
    "Trabalho sem título";
  return { key: doi ?? openAlex ?? title.toLocaleLowerCase("en"), doi, openAlex, title };
}
