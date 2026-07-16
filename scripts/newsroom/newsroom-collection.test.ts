import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";

import { LocalFixtureCollector, RssCollector, parseAtom, parseRss } from "./collectors";
import { classifyItem } from "./classify";
import { deduplicate } from "./deduplicate";
import { normalizeItem, type RawFeedItem } from "./normalize";
import { collectSource } from "./pipeline";
import { readBoundedResponse, validateExternalUrl } from "./security";
import { sourceSchema, type CollectedItem, type NewsSource } from "./schema";

function source(overrides: Partial<NewsSource> = {}): NewsSource {
  return sourceSchema.parse({
    id: "fixture-source",
    name: "Fonte sintética de teste",
    homepage: "https://fixture.example.test/",
    sourceType: "research-institute",
    language: "pt-BR",
    countries: ["BR"],
    topics: ["energia solar"],
    trustTier: "contextual",
    active: true,
    termsNotes: "Fixture sem fonte real.",
    copyrightNotes: "Texto sintético.",
    collectionMethod: "local-fixture",
    ...overrides,
  });
}

const raw: RawFeedItem = {
  title: "Pesquisa solar sintética no Brasil",
  url: "https://fixture.example.test/item?utm_source=test",
  guid: "fixture-guid",
  description: "Snippet sintético sobre energia solar.",
  publishedAt: "2026-07-15T10:00:00Z",
  categories: ["energia solar"],
};

function item(overrides: Partial<CollectedItem> = {}): CollectedItem {
  const result = normalizeItem(raw, source(), "2026-07-15T12:00:00Z");
  if (!result.item) throw new Error("Fixture inválida.");
  return { ...result.item, ...overrides };
}

describe("coleta RSS/Atom segura e offline", () => {
  test("fonte inativa não é coletada", async () => {
    const collector = new LocalFixtureCollector(resolve("newsroom/fixtures/rss.xml"), "rss");
    expect(collector.collect(source({ active: false }))).rejects.toThrow("inativa");
  });

  test("fonte bloqueada não é coletada", async () => {
    const collector = new RssCollector();
    expect(collector.collect(source({ active: false, trustTier: "blocked" }))).rejects.toThrow(
      "bloqueada",
    );
  });

  test("feed RSS válido é normalizado", async () => {
    const run = await collectSource(source(), {
      fixturePath: resolve("newsroom/fixtures/rss.xml"),
      collectedAt: "2026-07-15T13:00:00Z",
    });
    expect(run.accepted).toHaveLength(1);
    expect(run.accepted[0].canonicalUrl).not.toContain("utm_source");
    expect(run.accepted[0].contentSnippet.length).toBeLessThanOrEqual(500);
  });

  test("Atom válido é normalizado", async () => {
    const atomSource = source({ id: "fixture-atom", topics: ["Sul Global"] });
    const run = await collectSource(atomSource, {
      fixturePath: resolve("newsroom/fixtures/atom.xml"),
      collectedAt: "2026-07-15T13:00:00Z",
    });
    expect(run.accepted[0].title).toContain("pesquisa solar");
    expect(run.accepted[0].authors).toEqual(["Robô de fixture"]);
  });

  test("XML inválido é rejeitado", () => {
    expect(() => parseRss("<rss><channel><item></rss>")).toThrow("inválido");
    expect(() => parseAtom("<feed><entry></feed>")).toThrow("inválido");
  });

  test("URL privada é bloqueada antes da coleta", () => {
    expect(() => validateExternalUrl("http://127.0.0.1/feed.xml")).toThrow("privado");
    expect(() => validateExternalUrl("http://localhost/feed.xml")).toThrow("privado");
  });

  test("resposta excessiva é bloqueada", async () => {
    const response = new Response("curto", { headers: { "content-length": "1000001" } });
    expect(readBoundedResponse(response)).rejects.toThrow("excede");
  });

  test("item sem URL vai para rejeição auditável", () => {
    expect(
      normalizeItem({ ...raw, url: undefined }, source(), "2026-07-15T12:00:00Z").rejection
        ?.reasons,
    ).toContain("URL ausente.");
  });

  test("item sem título vai para rejeição auditável", () => {
    expect(
      normalizeItem({ ...raw, title: "" }, source(), "2026-07-15T12:00:00Z").rejection?.reasons,
    ).toContain("Título ausente.");
  });

  test("GUID duplicado é agrupado", () => {
    const second = item({ id: "second", canonicalUrl: "https://fixture.example.test/outro" });
    expect(deduplicate([item(), second])[0].reason).toBe("guid");
  });

  test("URL duplicada é agrupada", () => {
    const second = item({ id: "second", guid: "outro-guid" });
    expect(deduplicate([item(), second])[0].reason).toBe("url");
  });

  test("título semelhante e data próxima são marcados", () => {
    const second = item({
      id: "second",
      guid: "outro-guid",
      canonicalUrl: "https://fixture.example.test/outro",
      hash: "a".repeat(64),
      title: "Pesquisa solar sintética no Brasil avança",
    });
    expect(deduplicate([item(), second])[0].reason).toBe("similar-title");
  });

  test("classificação temática é explicável", () => {
    const result = classifyItem(item(), source());
    expect(result[0].topic).toBe("energia solar");
    expect(result[0].reasons.join(" ")).toContain("título");
  });
});
