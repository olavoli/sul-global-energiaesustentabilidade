import { createHash } from "node:crypto";

import type { NewsSource, QueueItem } from "./schema";

export const NOW = "2026-07-15T12:00:00.000Z";

export function source(
  id: string,
  homepage = `https://${id}.example.test/`,
  sourceType: NewsSource["sourceType"] = "official",
): NewsSource {
  return {
    id,
    name: id,
    homepage,
    feedUrl: `${homepage}feed`,
    sourceType,
    language: "en",
    countries: ["BR"],
    topics: ["armazenamento"],
    trustTier: "primary",
    active: true,
    termsNotes: "fixture",
    copyrightNotes: "snippet",
    collectionMethod: "rss",
    evidenceCheckedAt: NOW,
    evidenceCheckedBy: "test",
    evidenceId: id,
  };
}

export function item(
  id: string,
  title: string,
  sourceId = "source-a",
  overrides: Partial<QueueItem["item"]> = {},
): QueueItem {
  const url = `https://${sourceId}.example.test/${id}`;
  return {
    id,
    state: "scored",
    item: {
      id,
      sourceId,
      sourceName: sourceId,
      originalUrl: url,
      canonicalUrl: url,
      title,
      description: "Snippet sintético de teste.",
      publishedAt: "2026-07-15T10:00:00.000Z",
      collectedAt: NOW,
      language: "en",
      authors: [],
      categories: ["storage"],
      rawCategories: ["storage"],
      contentSnippet: "Snippet sintético de teste.",
      guid: `guid-${id}`,
      hash: createHash("sha256").update(id).digest("hex"),
      collectionMethod: "rss",
      ...overrides,
    },
    topics: [{ topic: "armazenamento", score: 5, reasons: ["fixture"] }],
    score: {
      total: 60,
      dimensions: { promotionalPenalty: 0 },
      reasons: ["fixture"],
      penalties: [],
      recommendation: "review",
    },
    relatedItems: [],
    relatedSources: [],
    rejectionReasons: [],
    history: [{ to: "scored", at: NOW, actor: "test" }],
  };
}
