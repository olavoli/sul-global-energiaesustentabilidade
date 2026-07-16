import { describe, expect, test } from "bun:test";

import { prepareSourceAdd } from "./catalog";
import { validateCollectionSelection } from "./commands";
import { buildCoverageReport } from "./coverage";
import { freshnessOf } from "./freshness";
import { checkSourceHealth, runtimeAfterHealth } from "./health";
import { collectRealSource } from "./real-collection";
import { sourceRuntimeSchema, sourceSchema, type NewsSource } from "./schema";
import { FeedTransportError, requestFeed, type HttpTransport } from "./transport";

const now = new Date("2026-07-15T12:00:00.000Z");
const rss = `<?xml version="1.0"?><rss version="2.0"><channel><title>Fonte</title><link>https://example.test</link><description>Feed</description><item><title>Eficiência energética avança</title><link>https://example.test/noticia</link><guid>n-1</guid><pubDate>Wed, 15 Jul 2026 10:00:00 GMT</pubDate><description>Resumo próprio e curto.</description></item></channel></rss>`;

function source(overrides: Partial<NewsSource> = {}): NewsSource {
  return sourceSchema.parse({
    id: "fonte-oficial",
    name: "Fonte oficial",
    homepage: "https://example.test/",
    feedUrl: "https://example.test/feed.xml",
    sourceType: "official",
    language: "pt-BR",
    countries: ["BR"],
    topics: ["eficiência energética"],
    trustTier: "primary",
    active: true,
    termsNotes: "Termos revisados localmente.",
    copyrightNotes: "Somente metadados e snippet.",
    collectionMethod: "rss",
    evidenceCheckedAt: now.toISOString(),
    evidenceCheckedBy: "reviewer",
    evidenceId: "fonte-oficial",
    ...overrides,
  });
}

const safe = async (input: string): Promise<URL> => new URL(input);
const response = (body = rss, headers: Record<string, string> = {}): Response =>
  new Response(body, {
    status: 200,
    headers: { "content-type": "application/rss+xml", ...headers },
  });

describe("fontes reais controladas", () => {
  test("fonte ativa sem evidência é recusada", () => {
    expect(() => source({ evidenceCheckedAt: undefined, evidenceCheckedBy: undefined })).toThrow();
  });

  test("cadastro duplicado por id ou feed é recusado", () => {
    const existing = source();
    expect(() => prepareSourceAdd(existing, [existing])).toThrow("ID já cadastrado");
    expect(() => prepareSourceAdd(source({ id: "outra-fonte" }), [existing])).toThrow(
      "Feed já cadastrado",
    );
  });

  test("ETag e Last-Modified são enviados e preservados", async () => {
    let headers: Headers | undefined;
    const transport: HttpTransport = async (_url, init) => {
      headers = new Headers(init.headers);
      return response(rss, { etag: '"v2"', "last-modified": "Wed, 15 Jul 2026 11:00:00 GMT" });
    };
    const result = await requestFeed("https://example.test/feed.xml", {
      transport,
      urlSafety: safe,
      etag: '"v1"',
      lastModified: "Tue, 14 Jul 2026 11:00:00 GMT",
    });
    expect(headers?.get("if-none-match")).toBe('"v1"');
    expect(headers?.get("if-modified-since")).toContain("14 Jul");
    expect(result.etag).toBe('"v2"');
  });

  test("304 não duplica itens", async () => {
    const transport: HttpTransport = async () =>
      new Response(null, { status: 304, headers: { etag: '"v1"' } });
    const runtime = sourceRuntimeSchema.parse({ sourceId: "fonte-oficial", etag: '"v1"' });
    const result = await collectRealSource(source(), runtime, [], {
      transport,
      urlSafety: safe,
      now,
    });
    expect(result.notModified).toBe(true);
    expect(result.queueItems).toHaveLength(0);
  });

  test("health valida RSS, data, idioma e cache", async () => {
    const transport: HttpTransport = async () => response(rss, { etag: '"ok"' });
    const runtime = sourceRuntimeSchema.parse({ sourceId: "fonte-oficial" });
    const health = await checkSourceHealth(source(), runtime, { transport, urlSafety: safe, now });
    expect(health.status).toBe("healthy");
    expect(health.format).toBe("rss");
    expect(health.approximateItems).toBe(1);
    expect(runtimeAfterHealth(runtime, health).etag).toBe('"ok"');
  });

  test("fonte acadêmica antiga pode ser background, sem rejeição absoluta", () => {
    const academic = source({ sourceType: "academic" });
    expect(freshnessOf("2025-12-01T00:00:00.000Z", academic, now).band).toBe("background");
  });

  test("XML inválido resulta em erro e quarentena", async () => {
    const transport: HttpTransport = async () => response("<rss><broken>");
    const runtime = sourceRuntimeSchema.parse({ sourceId: "fonte-oficial" });
    const result = await collectRealSource(source(), runtime, [], {
      transport,
      urlSafety: safe,
      now,
    });
    expect(result.error).toBeDefined();
    expect(result.quarantine?.reasonCode).toBe("invalid-xml");
  });

  test("resposta excessiva é bloqueada", async () => {
    const transport: HttpTransport = async () => response("x".repeat(101));
    await expect(
      requestFeed("https://example.test/feed.xml", { transport, urlSafety: safe, maxBytes: 100 }),
    ).rejects.toMatchObject({ code: "too-large" });
  });

  test("redirect para outro domínio é suspeito", async () => {
    const transport: HttpTransport = async () =>
      new Response(null, { status: 302, headers: { location: "https://other.test/feed" } });
    await expect(
      requestFeed("https://example.test/feed.xml", { transport, urlSafety: safe }),
    ).rejects.toBeInstanceOf(FeedTransportError);
  });

  test("coleta ampla exige confirmação explícita", () => {
    const base = {
      command: "collect",
      args: ["--all"],
      positional: [],
      apply: false,
      actor: "x",
      option: () => undefined,
    };
    expect(() => validateCollectionSelection({ ...base, has: (name) => name === "all" })).toThrow(
      "--confirm-all",
    );
  });

  test("cobertura vazia informa lacunas sem inventar metas", () => {
    const report = buildCoverageReport([]);
    expect(report.alerts.join(" ")).toContain("Catálogo real vazio");
    expect(report.alerts.join(" ")).toContain("fontes primárias");
  });
});
