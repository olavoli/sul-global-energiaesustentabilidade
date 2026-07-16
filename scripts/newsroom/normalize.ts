import { createHash } from "node:crypto";

import { collectedItemSchema, type CollectedItem, type NewsSource } from "./schema";

export const SNIPPET_LIMIT = 500;
const TRACKING_PARAMETERS = new Set(["fbclid", "gclid", "mc_cid", "mc_eid"]);

export interface RawFeedItem {
  title?: string;
  url?: string;
  guid?: string;
  description?: string;
  publishedAt?: string;
  updatedAt?: string;
  authors?: string[];
  categories?: string[];
  rights?: string;
}

export interface RejectedItem {
  sourceId: string;
  title?: string;
  reasons: string[];
}

export function normalizeText(value = ""): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

export function canonicalizeUrl(input: string): string {
  const url = new URL(input);
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error("URL usa protocolo não permitido.");
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("utm_") || TRACKING_PARAMETERS.has(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }
  url.hostname = url.hostname.toLowerCase();
  if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/$/, "");
  return url.toString();
}

function isoDate(input: string | undefined): string | undefined {
  if (!input) return undefined;
  const date = new Date(input);
  return Number.isNaN(date.valueOf()) ? undefined : date.toISOString();
}

function stableHash(parts: string[]): string {
  return createHash("sha256").update(parts.join("\u001f"), "utf8").digest("hex");
}

export function normalizeItem(
  raw: RawFeedItem,
  source: NewsSource,
  collectedAt: string,
  now = new Date(collectedAt),
): { item?: CollectedItem; rejection?: RejectedItem } {
  const title = normalizeText(raw.title);
  const reasons: string[] = [];
  if (!title) reasons.push("Título ausente.");
  let canonicalUrl: string | undefined;
  try {
    canonicalUrl = raw.url ? canonicalizeUrl(raw.url) : undefined;
  } catch {
    reasons.push("URL inválida.");
  }
  if (!raw.url) reasons.push("URL ausente.");
  const publishedAt = isoDate(raw.publishedAt);
  if (!publishedAt) reasons.push("Data de publicação inválida.");
  if (publishedAt) {
    const age = now.valueOf() - new Date(publishedAt).valueOf();
    if (age < -24 * 60 * 60 * 1_000) reasons.push("Item possui data futura.");
    if (age > 10 * 365 * 24 * 60 * 60 * 1_000) reasons.push("Item é excessivamente antigo.");
  }
  if (!source.language) reasons.push("Idioma não suportado.");
  if (reasons.length > 0 || !canonicalUrl || !publishedAt || !raw.url) {
    return { rejection: { sourceId: source.id, title: title || undefined, reasons } };
  }
  const description = normalizeText(raw.description).slice(0, SNIPPET_LIMIT);
  const authors = (raw.authors ?? []).map(normalizeText).filter(Boolean);
  const categories = (raw.categories ?? []).map(normalizeText).filter(Boolean);
  const hash = stableHash([title.toLowerCase(), canonicalUrl, description.toLowerCase()]);
  const id = stableHash([source.id, raw.guid ?? canonicalUrl]).slice(0, 24);
  const item = collectedItemSchema.parse({
    id,
    sourceId: source.id,
    sourceName: source.name,
    originalUrl: raw.url,
    canonicalUrl,
    title,
    description,
    publishedAt,
    updatedAt: isoDate(raw.updatedAt),
    collectedAt,
    language: source.language,
    authors,
    categories,
    rawCategories: raw.categories ?? [],
    contentSnippet: description,
    guid: normalizeText(raw.guid) || undefined,
    rights: normalizeText(raw.rights).slice(0, 300) || undefined,
    hash,
    collectionMethod: source.collectionMethod,
  });
  return { item };
}
