import type { CollectedItem } from "./schema";

export type DuplicateReason = "guid" | "url" | "hash" | "similar-title";
export interface DuplicateMatch {
  primaryId: string;
  relatedId: string;
  reason: DuplicateReason;
  relation: "duplicate" | "republication" | "possible-update";
}

function titleTokens(title: string): Set<string> {
  return new Set(
    title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2),
  );
}

export function titleSimilarity(first: string, second: string): number {
  const left = titleTokens(first);
  const right = titleTokens(second);
  const union = new Set([...left, ...right]);
  if (union.size === 0) return 0;
  return [...left].filter((token) => right.has(token)).length / union.size;
}

function compare(primary: CollectedItem, candidate: CollectedItem): DuplicateMatch | undefined {
  let reason: DuplicateReason | undefined;
  if (primary.guid && candidate.guid && primary.guid === candidate.guid) reason = "guid";
  else if (primary.canonicalUrl === candidate.canonicalUrl) reason = "url";
  else if (primary.hash === candidate.hash) reason = "hash";
  else {
    const hours =
      Math.abs(
        new Date(primary.publishedAt).valueOf() - new Date(candidate.publishedAt).valueOf(),
      ) / 3_600_000;
    if (hours <= 72 && titleSimilarity(primary.title, candidate.title) >= 0.72)
      reason = "similar-title";
  }
  if (!reason) return undefined;
  const sameSource = primary.sourceId === candidate.sourceId;
  const newer = new Date(candidate.publishedAt) > new Date(primary.publishedAt);
  return {
    primaryId: primary.id,
    relatedId: candidate.id,
    reason,
    relation: sameSource && newer ? "possible-update" : sameSource ? "duplicate" : "republication",
  };
}

export function deduplicate(items: readonly CollectedItem[]): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];
  for (let candidateIndex = 1; candidateIndex < items.length; candidateIndex += 1) {
    for (let primaryIndex = 0; primaryIndex < candidateIndex; primaryIndex += 1) {
      const match = compare(items[primaryIndex], items[candidateIndex]);
      if (match) {
        matches.push(match);
        break;
      }
    }
  }
  return matches;
}
