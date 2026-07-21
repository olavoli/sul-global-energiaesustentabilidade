import { createHash } from "node:crypto";
import type { CanonicalEntity, DuplicateCandidate, ResolutionRule } from "./contracts";
import { normalizeEntityName, normalizeExternalId } from "./normalize";

const precedence: Array<[ResolutionRule, 100 | 95 | 80 | 60]> = [
  ["orcid", 100],
  ["ror", 100],
  ["doi", 100],
  ["issn", 95],
  ["openalex", 95],
  ["crossref", 95],
  ["normalized-name", 80],
  ["known-alias", 60],
];
const stableId = (prefix: string, parts: string[]) =>
  `${prefix}-${createHash("sha256").update(parts.join("\u001f")).digest("hex").slice(0, 16)}`;

function values(entity: CanonicalEntity, rule: ResolutionRule): string[] {
  if (rule === "normalized-name") return [entity.normalizedName];
  if (rule === "known-alias") return entity.aliases.map(normalizeEntityName);
  const value = entity.externalIds[rule];
  return value ? [normalizeExternalId(rule, value)] : [];
}

export function explainDeterministicMatch(left: CanonicalEntity, right: CanonicalEntity) {
  if (left.type !== right.type || left.id === right.id) return undefined;
  for (const [rule, confidence] of precedence) {
    const leftValues = values(left, rule);
    const rightValues = values(right, rule);
    const shared = leftValues.find((value) => value && rightValues.includes(value));
    if (!shared && rule === "known-alias") {
      const leftName = left.normalizedName;
      const rightName = right.normalizedName;
      const alias = leftValues.includes(rightName)
        ? rightName
        : rightValues.includes(leftName)
          ? leftName
          : undefined;
      if (!alias) continue;
      return {
        rule,
        confidence,
        evidence: [alias],
        explanation: `Alias conhecido corresponde ao nome normalizado (${alias}).`,
      };
    }
    if (!shared) continue;
    return {
      rule,
      confidence,
      evidence: [shared],
      explanation: `${rule} idêntico após normalização determinística (${shared}).`,
    };
  }
  return undefined;
}

export function findDuplicateCandidates(
  entities: CanonicalEntity[],
  now = new Date(),
): DuplicateCandidate[] {
  const candidates: DuplicateCandidate[] = [];
  for (let leftIndex = 0; leftIndex < entities.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < entities.length; rightIndex += 1) {
      const left = entities[leftIndex];
      const right = entities[rightIndex];
      const match = explainDeterministicMatch(left, right);
      if (!match) continue;
      const pair = [left.id, right.id].sort();
      candidates.push({
        id: stableId("duplicate", [...pair, match.rule]),
        entityType: left.type,
        leftEntityId: pair[0],
        rightEntityId: pair[1],
        ...match,
        status: "pending",
        detectedAt: now.toISOString(),
        history: [],
      });
    }
  }
  return candidates;
}

export function canonicalEntityId(type: CanonicalEntity["type"], sourceRecordId: string) {
  return stableId(type, ["source-record", sourceRecordId]);
}
