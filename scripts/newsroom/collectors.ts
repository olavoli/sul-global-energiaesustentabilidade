import { readFile } from "node:fs/promises";

import { fetchFeed } from "./security";
import { normalizeItem, normalizeText, type RawFeedItem, type RejectedItem } from "./normalize";
import type { CollectedItem, NewsSource } from "./schema";

export interface CollectionResult {
  accepted: CollectedItem[];
  rejected: RejectedItem[];
}

export interface SourceCollector {
  collect(source: NewsSource, maxItems?: number): Promise<RawFeedItem[]>;
  normalize(items: RawFeedItem[], source: NewsSource, collectedAt: string): CollectionResult;
}

function tag(block: string, names: string[]): string | undefined {
  for (const name of names) {
    const match = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
    if (match) return normalizeText(match[1]);
  }
  return undefined;
}

function tags(block: string, name: string): string[] {
  return [...block.matchAll(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "gi"))]
    .map((match) => normalizeText(match[1]))
    .filter(Boolean);
}

function blocks(xml: string, name: string): string[] {
  return [...xml.matchAll(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "gi"))].map(
    (match) => match[1],
  );
}

function requireWellFormedEnvelope(xml: string, kind: "rss" | "atom"): void {
  const trimmed = xml.trim();
  const child = kind === "rss" ? "item" : "entry";
  const openChildren = trimmed.match(new RegExp(`<${child}(?:\\s|>)`, "gi"))?.length ?? 0;
  const closeChildren = trimmed.match(new RegExp(`</${child}>`, "gi"))?.length ?? 0;
  const valid =
    kind === "rss"
      ? /<rss(?:\s|>)/i.test(trimmed) &&
        /<channel(?:\s|>)/i.test(trimmed) &&
        /<\/channel>\s*<\/rss>\s*$/i.test(trimmed)
      : /<feed(?:\s|>)/i.test(trimmed) && /<\/feed>\s*$/i.test(trimmed);
  if (!valid || openChildren !== closeChildren)
    throw new Error(`XML ${kind.toUpperCase()} inválido.`);
}

export function parseRss(xml: string, maxItems = 50): RawFeedItem[] {
  requireWellFormedEnvelope(xml, "rss");
  return blocks(xml, "item")
    .slice(0, maxItems)
    .map((item) => ({
      title: tag(item, ["title"]),
      url: tag(item, ["link"]),
      guid: tag(item, ["guid"]),
      description: tag(item, ["description", "content:encoded"]),
      publishedAt: tag(item, ["pubDate", "dc:date"]),
      updatedAt: tag(item, ["atom:updated"]),
      authors: tags(item, "(?:dc:creator|author)"),
      categories: tags(item, "category"),
      rights: tag(item, ["copyright", "dc:rights"]),
    }));
}

function atomLink(entry: string): string | undefined {
  const links = [...entry.matchAll(/<link\b([^>]*?)(?:\/>|>\s*<\/link>)/gi)];
  for (const [, attributes] of links) {
    const relation = attributes.match(/\brel=["']([^"']+)["']/i)?.[1] ?? "alternate";
    const href = attributes.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (href && relation === "alternate") return normalizeText(href);
  }
  return undefined;
}

function atomCategories(entry: string): string[] {
  return [...entry.matchAll(/<category\b[^>]*\bterm=["']([^"']+)["'][^>]*\/?\s*>/gi)].map((match) =>
    normalizeText(match[1]),
  );
}

export function parseAtom(xml: string, maxItems = 50): RawFeedItem[] {
  requireWellFormedEnvelope(xml, "atom");
  return blocks(xml, "entry")
    .slice(0, maxItems)
    .map((entry) => ({
      title: tag(entry, ["title"]),
      url: atomLink(entry),
      guid: tag(entry, ["id"]),
      description: tag(entry, ["summary", "content"]),
      publishedAt: tag(entry, ["published", "updated"]),
      updatedAt: tag(entry, ["updated"]),
      authors: blocks(entry, "author")
        .map((author) => tag(author, ["name"]) ?? "")
        .filter(Boolean),
      categories: atomCategories(entry),
      rights: tag(entry, ["rights"]),
    }));
}

export function detectFeedFormat(xml: string): "rss" | "atom" {
  const trimmed = xml.trim();
  if (/<rss(?:\s|>)/i.test(trimmed)) return "rss";
  if (/<feed(?:\s|>)/i.test(trimmed)) return "atom";
  throw new Error("Formato RSS/Atom não reconhecido.");
}

export function parseFeedDocument(
  xml: string,
  maxItems = 50,
): {
  format: "rss" | "atom";
  items: RawFeedItem[];
} {
  const format = detectFeedFormat(xml);
  return { format, items: format === "rss" ? parseRss(xml, maxItems) : parseAtom(xml, maxItems) };
}

function normalizeAll(
  items: RawFeedItem[],
  source: NewsSource,
  collectedAt: string,
): CollectionResult {
  const accepted: CollectedItem[] = [];
  const rejected: RejectedItem[] = [];
  for (const raw of items) {
    const result = normalizeItem(raw, source, collectedAt);
    if (result.item) accepted.push(result.item);
    if (result.rejection) rejected.push(result.rejection);
  }
  return { accepted, rejected };
}

abstract class FeedCollector implements SourceCollector {
  abstract collect(source: NewsSource, maxItems?: number): Promise<RawFeedItem[]>;
  normalize(items: RawFeedItem[], source: NewsSource, collectedAt: string): CollectionResult {
    return normalizeAll(items, source, collectedAt);
  }
  protected ensureCollectable(source: NewsSource): void {
    if (source.trustTier === "blocked") throw new Error("Fonte bloqueada não pode ser coletada.");
    if (!source.active) throw new Error("Fonte inativa não pode ser coletada.");
  }
}

export class RssCollector extends FeedCollector {
  async collect(source: NewsSource, maxItems = 50): Promise<RawFeedItem[]> {
    this.ensureCollectable(source);
    if (!source.feedUrl) throw new Error("Fonte RSS sem feedUrl.");
    return parseRss(await fetchFeed(source.feedUrl), maxItems);
  }
}

export class AtomCollector extends FeedCollector {
  async collect(source: NewsSource, maxItems = 50): Promise<RawFeedItem[]> {
    this.ensureCollectable(source);
    if (!source.feedUrl) throw new Error("Fonte Atom sem feedUrl.");
    return parseAtom(await fetchFeed(source.feedUrl), maxItems);
  }
}

export class LocalFixtureCollector extends FeedCollector {
  constructor(
    private readonly path: string,
    private readonly format: "rss" | "atom",
  ) {
    super();
  }
  async collect(source: NewsSource, maxItems = 50): Promise<RawFeedItem[]> {
    this.ensureCollectable(source);
    const xml = await readFile(this.path, "utf8");
    return this.format === "rss" ? parseRss(xml, maxItems) : parseAtom(xml, maxItems);
  }
}
