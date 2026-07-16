import { createHash } from "node:crypto";

import { parseFeedDocument } from "./collectors";
import { itemFreshness } from "./freshness";
import { buildQueue, processFeedBody } from "./pipeline";
import { hasBlockingQuarantine, quarantineFromError } from "./quarantine";
import {
  sourceRuntimeSchema,
  type NewsSource,
  type QuarantineEntry,
  type QueueItem,
  type SourceRuntime,
} from "./schema";
import { requestFeed, type FeedRequestOptions } from "./transport";

export interface RealCollectionOutcome {
  sourceId: string;
  changeStatus: "first-collection" | "unchanged" | "changed" | "error" | "format-changed";
  queueItems: QueueItem[];
  runtime: SourceRuntime;
  quarantine?: QuarantineEntry;
  fetched: number;
  rejected: number;
  notModified: boolean;
  error?: string;
}

export async function collectRealSource(
  source: NewsSource,
  runtime: SourceRuntime,
  quarantine: readonly QuarantineEntry[],
  options: FeedRequestOptions & { now?: Date; maxItems?: number; actor?: string } = {},
): Promise<RealCollectionOutcome> {
  const now = options.now ?? new Date();
  const checkedAt = now.toISOString();
  if (!source.active) throw new Error("Fonte desativada não pode ser coletada.");
  if (source.trustTier === "blocked") throw new Error("Fonte bloqueada não pode ser coletada.");
  if (hasBlockingQuarantine(source.id, quarantine)) {
    throw new Error("Fonte possui quarentena pendente e não pode entrar na fila.");
  }
  try {
    if (!source.feedUrl) throw new Error("Fonte real sem feedUrl.");
    const response = await requestFeed(source.feedUrl, {
      ...options,
      etag: runtime.etag,
      lastModified: runtime.lastModified,
    });
    const baseRuntime = {
      ...runtime,
      lastCheckedAt: checkedAt,
      etag: response.etag ?? runtime.etag,
      lastModified: response.lastModified ?? runtime.lastModified,
      consecutiveFailures: 0,
      healthChecks: runtime.healthChecks + 1,
      successfulChecks: runtime.successfulChecks + 1,
      totalResponseMs: runtime.totalResponseMs + response.responseMs,
    };
    if (response.status === 304) {
      return {
        sourceId: source.id,
        changeStatus: "unchanged",
        queueItems: [],
        runtime: sourceRuntimeSchema.parse({ ...baseRuntime, changeStatus: "unchanged" }),
        fetched: 0,
        rejected: 0,
        notModified: true,
      };
    }
    const body = response.body ?? "";
    const feedHash = createHash("sha256").update(body, "utf8").digest("hex");
    if (runtime.feedHash === feedHash) {
      return {
        sourceId: source.id,
        changeStatus: "unchanged",
        queueItems: [],
        runtime: sourceRuntimeSchema.parse({ ...baseRuntime, feedHash, changeStatus: "unchanged" }),
        fetched: 0,
        rejected: 0,
        notModified: true,
      };
    }
    const parsed = parseFeedDocument(body, options.maxItems ?? 20);
    const futureItems = parsed.items.filter((item) => {
      if (!item.publishedAt) return false;
      const date = new Date(item.publishedAt);
      return !Number.isNaN(date.valueOf()) && date.valueOf() > now.valueOf() + 24 * 60 * 60 * 1_000;
    }).length;
    const missingDates = parsed.items.filter((item) => !item.publishedAt).length;
    if (parsed.items.length > 0 && futureItems >= Math.max(2, Math.ceil(parsed.items.length / 2))) {
      throw new Error("Feed contém muitos itens futuros.");
    }
    if (parsed.items.length > 0 && missingDates === parsed.items.length) {
      throw new Error("Feed apresenta ausência prolongada de datas.");
    }
    const run = processFeedBody(body, source, checkedAt, options.maxItems ?? 20);
    const queueItems = buildQueue([run], options.actor ?? "newsroom-cli");
    const missingDate = missingDates;
    const missingAuthor = parsed.items.filter((item) => !item.authors?.length).length;
    const missingDescription = parsed.items.filter((item) => !item.description).length;
    const promotionalItems = queueItems.filter(
      (item) => (item.score?.dimensions.promotionalPenalty ?? 0) < 0,
    ).length;
    const freshnessHours = queueItems.reduce(
      (sum, item) => sum + (itemFreshness(item.item, source, now).ageHours ?? 0),
      0,
    );
    const topicCounts = { ...runtime.topicCounts };
    queueItems.forEach((item) =>
      item.topics.forEach(({ topic }) => (topicCounts[topic] = (topicCounts[topic] ?? 0) + 1)),
    );
    const duplicates = queueItems.filter(({ state }) => state === "duplicate").length;
    const changeStatus = runtime.feedHash ? "changed" : "first-collection";
    const nextRuntime = sourceRuntimeSchema.parse({
      ...baseRuntime,
      feedHash,
      lastChangedAt: checkedAt,
      changeStatus,
      collections: runtime.collections + 1,
      itemsFetched: runtime.itemsFetched + parsed.items.length,
      itemsValid: runtime.itemsValid + queueItems.length,
      itemsRejected: runtime.itemsRejected + run.rejected.length,
      duplicates: runtime.duplicates + duplicates,
      missingDate: runtime.missingDate + missingDate,
      missingAuthor: runtime.missingAuthor + missingAuthor,
      missingDescription: runtime.missingDescription + missingDescription,
      promotionalItems: runtime.promotionalItems + promotionalItems,
      freshnessHoursTotal: runtime.freshnessHoursTotal + freshnessHours,
      topicCounts,
    });
    return {
      sourceId: source.id,
      changeStatus,
      queueItems,
      runtime: nextRuntime,
      fetched: parsed.items.length,
      rejected: run.rejected.length,
      notModified: false,
    };
  } catch (error) {
    const failedRuntime = sourceRuntimeSchema.parse({
      ...runtime,
      lastCheckedAt: checkedAt,
      changeStatus: /Formato alterado/i.test(error instanceof Error ? error.message : "")
        ? "format-changed"
        : "error",
      consecutiveFailures: runtime.consecutiveFailures + 1,
      healthChecks: runtime.healthChecks + 1,
    });
    const entry = quarantineFromError(source.id, error, runtime, now);
    return {
      sourceId: source.id,
      changeStatus: failedRuntime.changeStatus ?? "error",
      queueItems: [],
      runtime: sourceRuntimeSchema.parse({
        ...failedRuntime,
        quarantined: runtime.quarantined + (entry ? 1 : 0),
      }),
      quarantine: entry,
      fetched: 0,
      rejected: 0,
      notModified: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
