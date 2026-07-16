import { parseFeedDocument } from "./collectors";
import { freshnessOf } from "./freshness";
import { requestFeed, FeedTransportError, type FeedRequestOptions } from "./transport";
import {
  sourceHealthSchema,
  sourceRuntimeSchema,
  type NewsSource,
  type SourceHealth,
  type SourceRuntime,
} from "./schema";

function apparentLanguage(xml: string, fallback: string): string {
  return (
    xml.match(/\bxml:lang=["']([^"']+)["']/i)?.[1] ??
    xml.match(/<language(?:\s[^>]*)?>([^<]+)<\/language>/i)?.[1]?.trim() ??
    fallback
  );
}

function newestDate(
  items: Array<{ publishedAt?: string; updatedAt?: string }>,
): string | undefined {
  const dates = items
    .flatMap((item) => [item.updatedAt, item.publishedAt])
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.valueOf()))
    .sort((first, second) => second.valueOf() - first.valueOf());
  return dates[0]?.toISOString();
}

export async function checkSourceHealth(
  source: NewsSource,
  runtime: SourceRuntime,
  options: FeedRequestOptions & { now?: Date } = {},
): Promise<SourceHealth> {
  const checkedAt = (options.now ?? new Date()).toISOString();
  if (source.trustTier === "blocked") {
    return sourceHealthSchema.parse({
      sourceId: source.id,
      status: "blocked",
      checkedAt,
      redirects: 0,
      responseMs: 0,
      approximateItems: 0,
      consecutiveFailures: runtime.consecutiveFailures,
      reasons: ["Fonte marcada como blocked no catálogo."],
    });
  }
  try {
    if (!source.feedUrl) throw new Error("Fonte sem feedUrl.");
    const response = await requestFeed(source.feedUrl, options);
    if (response.status === 304 && runtime.health) {
      return sourceHealthSchema.parse({
        ...runtime.health,
        checkedAt,
        httpStatus: 304,
        responseMs: response.responseMs,
        etag: response.etag ?? runtime.etag,
        lastModified: response.lastModified ?? runtime.lastModified,
        consecutiveFailures: 0,
        reasons: ["Servidor respondeu 304; metadados anteriores preservados."],
      });
    }
    const parsed = parseFeedDocument(response.body ?? "", 100);
    const expected = source.collectionMethod === "atom" ? "atom" : "rss";
    const newestItemAt = newestDate(parsed.items);
    const freshness = freshnessOf(newestItemAt, source, options.now ?? new Date());
    const reasons: string[] = [];
    let status: SourceHealth["status"] = "healthy";
    if (parsed.format !== expected) {
      status = "invalid";
      reasons.push(`Formato alterado: esperado ${expected}, recebido ${parsed.format}.`);
    } else if (parsed.items.length === 0 || !newestItemAt) {
      status = "degraded";
      reasons.push("Feed vazio ou sem data recente detectável.");
    } else if (freshness.band === "stale") {
      status = "stale";
      reasons.push("Item mais recente está fora da janela configurada.");
    } else reasons.push("Feed válido e dentro da política de recência.");
    return sourceHealthSchema.parse({
      sourceId: source.id,
      status,
      checkedAt,
      httpStatus: response.status,
      finalUrl: response.finalUrl,
      redirects: response.redirects,
      contentType: response.contentType,
      responseBytes: response.responseBytes,
      responseMs: response.responseMs,
      format: parsed.format,
      approximateItems: parsed.items.length,
      newestItemAt,
      apparentLanguage: apparentLanguage(response.body ?? "", source.language),
      etag: response.etag,
      lastModified: response.lastModified,
      consecutiveFailures: status === "invalid" ? runtime.consecutiveFailures + 1 : 0,
      reasons,
    });
  } catch (error) {
    const transport = error instanceof FeedTransportError ? error : undefined;
    return sourceHealthSchema.parse({
      sourceId: source.id,
      status: transport?.code === "network" ? "unknown" : "invalid",
      checkedAt,
      httpStatus: transport?.metadata.httpStatus,
      finalUrl: transport?.metadata.finalUrl,
      redirects: 0,
      contentType: transport?.metadata.contentType,
      responseBytes: transport?.metadata.responseBytes,
      responseMs: 0,
      approximateItems: 0,
      consecutiveFailures: runtime.consecutiveFailures + 1,
      reasons: [error instanceof Error ? error.message : String(error)],
    });
  }
}

export function runtimeAfterHealth(runtime: SourceRuntime, health: SourceHealth): SourceRuntime {
  const success = ["healthy", "degraded", "stale"].includes(health.status);
  return sourceRuntimeSchema.parse({
    ...runtime,
    etag: health.etag ?? runtime.etag,
    lastModified: health.lastModified ?? runtime.lastModified,
    lastCheckedAt: health.checkedAt,
    consecutiveFailures: health.consecutiveFailures,
    healthChecks: runtime.healthChecks + 1,
    successfulChecks: runtime.successfulChecks + (success ? 1 : 0),
    totalResponseMs: runtime.totalResponseMs + health.responseMs,
    health,
  });
}
