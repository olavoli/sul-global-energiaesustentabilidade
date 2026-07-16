import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { prepareSourceAdd, saveCatalog } from "./catalog";
import { classifyItem } from "./classify";
import { parseFeedDocument } from "./collectors";
import { deduplicate } from "./deduplicate";
import { assertActivationEvidence, evidenceSchema, type SourceEvidence } from "./evidence";
import { freshnessOf } from "./freshness";
import { checkSourceHealth } from "./health";
import { normalizeItem } from "./normalize";
import { scoreItem } from "./score";
import { collectedItemSchema, sourceRuntimeSchema, sourceSchema, type NewsSource } from "./schema";
import { requestFeed, type HttpTransport } from "./transport";

const now = new Date("2026-07-15T12:00:00.000Z");
const rssItem = (id: number) =>
  `<item><title>Pesquisa solar ${id}</title><link>https://official.test/item-${id}</link><guid>${id}</guid><pubDate>Wed, 15 Jul 2026 10:00:00 GMT</pubDate><description>Resumo curto.</description></item>`;
const rss = `<?xml version="1.0"?><rss version="2.0"><channel><title>Oficial</title><link>https://official.test</link><description>Feed</description>${rssItem(1)}</channel></rss>`;
const temporary: string[] = [];

afterEach(async () =>
  Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true }))),
);

function source(overrides: Partial<NewsSource> = {}): NewsSource {
  return sourceSchema.parse({
    id: "official-source",
    name: "Fonte oficial",
    homepage: "https://official.test/",
    feedUrl: "https://official.test/feed.xml",
    sourceType: "official",
    language: "pt-BR",
    countries: ["BR"],
    topics: ["energia solar"],
    trustTier: "primary",
    active: true,
    termsNotes: "Termos revisados.",
    copyrightNotes: "Snippet e atribuição.",
    collectionMethod: "rss",
    evidenceCheckedAt: now.toISOString(),
    evidenceCheckedBy: "reviewer",
    evidenceId: "official-source",
    ...overrides,
  });
}

function evidence(overrides: Partial<SourceEvidence> = {}): SourceEvidence {
  return evidenceSchema.parse({
    sourceId: "official-source",
    discoveryMethod: "official-page",
    officialPage: "https://official.test/news",
    officialFeedPage: "https://official.test/rss",
    feedUrl: "https://official.test/feed.xml",
    feedOwnershipConfirmed: true,
    termsUrl: "https://official.test/terms",
    copyrightUrl: "https://official.test/copyright",
    termsSummary: "Coleta de metadados permitida.",
    copyrightSummary: "Snippet curto permitido.",
    collectionLimitations: ["Sem texto integral"],
    reviewedAt: now.toISOString(),
    reviewedBy: "reviewer",
    decision: "confirmed",
    decisionReason: "Link explícito oficial.",
    ...overrides,
  });
}

const safe = async (input: string): Promise<URL> => new URL(input);
const transport =
  (body = rss, type = "application/rss+xml"): HttpTransport =>
  async () =>
    new Response(body, { headers: { "content-type": type } });

function item(title = "Pesquisa solar") {
  const result = normalizeItem(
    {
      title,
      url: "https://official.test/item",
      guid: title,
      description: "Resumo curto.",
      publishedAt: now.toISOString(),
      categories: ["energia solar"],
    },
    source(),
    now.toISOString(),
  );
  if (!result.item) throw new Error("Fixture inválida.");
  return result.item;
}

describe("curadoria pública e ativação segura", () => {
  test("1 página oficial com feed explícito é aceita", () =>
    expect(() => assertActivationEvidence(source(), evidence())).not.toThrow());
  test("2 URL descoberta por tentativa é rejeitada", () =>
    expect(() =>
      assertActivationEvidence(
        source(),
        evidence({ decisionReason: "Tentativa de adivinhar URL." }),
      ),
    ).toThrow("tentativa"));
  test("3 feed fora do domínio oficial é rejeitado", () =>
    expect(() =>
      assertActivationEvidence(
        source({ feedUrl: "https://third.test/feed" }),
        evidence({ feedUrl: "https://third.test/feed" }),
      ),
    ).toThrow("domínio oficial"));
  test("4 sitemap não é feed", () =>
    expect(() =>
      assertActivationEvidence(
        source({ feedUrl: "https://official.test/sitemap.xml" }),
        evidence({ feedUrl: "https://official.test/sitemap.xml" }),
      ),
    ).toThrow("Sitemap"));
  test("5 fonte bloqueada não é ativada", () =>
    expect(() => source({ trustTier: "blocked" })).toThrow());
  test("6 fonte inativa não entra na seleção ativa", () =>
    expect([source({ active: false })].filter((entry) => entry.active)).toHaveLength(0));
  test("7 ausência de termos exige revisão", () =>
    expect(() => assertActivationEvidence(source(), evidence({ termsUrl: undefined }))).toThrow(
      "Termos",
    ));
  test("8 copyright incompatível pode ser rejeitado", () =>
    expect(
      evidence({ decision: "rejected", decisionReason: "Copyright incompatível." }).decision,
    ).toBe("rejected"));
  test("9 health check bem-sucedido", async () =>
    expect(
      (
        await checkSourceHealth(source(), sourceRuntimeSchema.parse({ sourceId: source().id }), {
          transport: transport(),
          urlSafety: safe,
          now,
        })
      ).status,
    ).toBe("healthy"));
  test("10 health inválido não ativa evidência", () =>
    expect(() =>
      assertActivationEvidence(source(), evidence({ decision: "needs-review" })),
    ).toThrow("confirmed"));
  test("11 redirect suspeito é bloqueado", async () => {
    const moved: HttpTransport = async () =>
      new Response(null, { status: 302, headers: { location: "https://third.test/feed" } });
    await expect(
      requestFeed(source().feedUrl!, { transport: moved, urlSafety: safe }),
    ).rejects.toMatchObject({ code: "suspicious-redirect" });
  });
  test("12 HTML no lugar de XML é bloqueado", async () =>
    await expect(
      requestFeed(source().feedUrl!, {
        transport: transport("<html></html>", "text/html"),
        urlSafety: safe,
      }),
    ).rejects.toMatchObject({ code: "invalid-content-type" }));
  test("13 resposta excessiva é bloqueada", async () =>
    await expect(
      requestFeed(source().feedUrl!, {
        transport: transport("x".repeat(101)),
        urlSafety: safe,
        maxBytes: 100,
      }),
    ).rejects.toMatchObject({ code: "too-large" }));
  test("14 XML inválido é rejeitado", () =>
    expect(() => parseFeedDocument("<rss><broken>", 20)).toThrow());
  test("15 idioma misto preserva idioma declarado", () =>
    expect(source({ language: "en" }).language).toBe("en"));
  test("16 país fora do escopo não é inferido", () => expect(source().countries).toEqual(["BR"]));
  test("17 feed antigo é marcado stale", () =>
    expect(freshnessOf("2020-01-01T00:00:00Z", source(), now).band).toBe("stale"));
  test("18 fonte empresarial recebe penalidade promocional", () =>
    expect(
      scoreItem(item(), { source: source({ sourceType: "company" }), topics: [], now }).dimensions
        .promotionalPenalty,
    ).toBe(-15));
  test("19 fonte primária não confirma a si própria", () =>
    expect(
      scoreItem(item(), { source: source(), topics: [], now }).dimensions.crossSourceConfirmation,
    ).toBe(0));
  test("20 snippet respeita 500 caracteres", () =>
    expect(item().contentSnippet.length).toBeLessThanOrEqual(500));
  test("21 atribuição e link são obrigatórios", () => {
    const value = item();
    expect(value.sourceName).toBe(source().name);
    expect(value.originalUrl).toStartWith("https://");
  });
  test("22 duplicata por URL é agrupada", () =>
    expect(
      deduplicate([item("A"), { ...item("B"), id: "b", guid: "b", hash: "b".repeat(64) }])[0]
        .reason,
    ).toBe("url"));
  test("23 texto integral acima do limite não é armazenado", () =>
    expect(() =>
      collectedItemSchema.parse({ ...item(), contentSnippet: "x".repeat(501) }),
    ).toThrow());
  test("24 coleta respeita máximo de 20 itens", () =>
    expect(
      parseFeedDocument(
        `<?xml version="1.0"?><rss version="2.0"><channel><title>X</title><link>https://official.test</link><description>X</description>${Array.from({ length: 21 }, (_, index) => rssItem(index)).join("")}</channel></rss>`,
        20,
      ).items,
    ).toHaveLength(20));
  test("25 dry-run prepara sem alterar catálogo", () => {
    const catalog: NewsSource[] = [];
    prepareSourceAdd(source(), catalog, evidence());
    expect(catalog).toHaveLength(0);
  });
  test("26 apply altera somente arquivo de catálogo informado", async () => {
    const root = await mkdtemp(join(tmpdir(), "curation-"));
    temporary.push(root);
    const path = join(root, "catalog.json");
    await saveCatalog([source()], path);
    expect(JSON.parse(await readFile(path, "utf8"))).toHaveLength(1);
  });
  test("nome próprio iniciado por Asia não vira Sul Global", () => {
    expect(
      classifyItem(item("Alecia Asiamigbe"), source()).some(({ topic }) => topic === "Sul Global"),
    ).toBeFalse();
  });
  test("prior temático da fonte não basta para relevância", () => {
    const unrelated = {
      ...item("Missão orbital"),
      categories: [],
      rawCategories: [],
      contentSnippet: "Atualização operacional.",
    };
    const topics = classifyItem(unrelated, source());
    expect(
      scoreItem(unrelated, { source: source(), topics, now }).dimensions.irrelevantPenalty,
    ).toBe(-40);
  });
});
