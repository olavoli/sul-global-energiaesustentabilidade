import { describe, expect, test } from "bun:test";
import { runProductionSmoke, type SmokeFetcher } from "./production-smoke";

const officialOrigin = "https://sulglobalenergia.com.br";
const demoArticle = "/artigo/hidrogenio-verde-no-brasil-promessa-e-realidade";

function fixtureFetch(requests: Request[]): SmokeFetcher {
  return async (input, init) => {
    const request = new Request(input, init);
    requests.push(request);
    const path = new URL(request.url).pathname;
    const headers = new Headers({ "content-type": "text/html; charset=utf-8" });
    if (path === "/") {
      return new Response(
        `<html><head><link rel="canonical" href="${officialOrigin}/"></head></html>`,
        { status: 200, headers },
      );
    }
    if (path === "/robots.txt") {
      return new Response(`User-agent: *\nAllow: /\nSitemap: ${officialOrigin}/sitemap.xml`, {
        status: 200,
      });
    }
    if (path === "/sitemap.xml") {
      return new Response(`<urlset><url><loc>${officialOrigin}/</loc></url></urlset>`, {
        status: 200,
      });
    }
    if (path === "/rss.xml") {
      return new Response('<rss version="2.0"><channel></channel></rss>', { status: 200 });
    }
    if (path === "/busca") {
      return new Response('<meta name="robots" content="noindex, follow">', { status: 200 });
    }
    if (path === "/admin/newsroom") {
      return new Response(null, {
        status: 302,
        headers: { location: "/admin/login?unavailable=true" },
      });
    }
    if (path === "/admin/login") {
      return new Response('<meta name="robots" content="noindex, nofollow">', { status: 200 });
    }
    return new Response("not found", { status: 404 });
  };
}

describe("smoke de produção", () => {
  test("recusa URL diferente da origem oficial antes de acessar a rede", async () => {
    let requested = false;
    await expect(
      runProductionSmoke({
        baseUrl: "https://example.com",
        confirmation: "PRODUCTION-READ-ONLY",
        fetcher: async () => {
          requested = true;
          return new Response();
        },
      }),
    ).rejects.toThrow("recusou alvo diferente");
    expect(requested).toBeFalse();
  });

  test("recusa execução sem confirmação explícita antes de acessar a rede", async () => {
    let requested = false;
    await expect(
      runProductionSmoke({
        baseUrl: officialOrigin,
        confirmation: "",
        fetcher: async () => {
          requested = true;
          return new Response();
        },
      }),
    ).rejects.toThrow("PRODUCTION-READ-ONLY");
    expect(requested).toBeFalse();
  });

  test("usa somente GET e valida indexação, feeds, busca, admin e 404", async () => {
    const requests: Request[] = [];
    const checks = await runProductionSmoke({
      baseUrl: officialOrigin,
      confirmation: "PRODUCTION-READ-ONLY",
      fetcher: fixtureFetch(requests),
    });
    expect(checks.every(({ ok }) => ok)).toBeTrue();
    expect(requests.every(({ method }) => method === "GET")).toBeTrue();
    expect(
      requests.map(({ url }) => new URL(url).origin).every((origin) => origin === officialOrigin),
    ).toBeTrue();
    expect(requests.map(({ url }) => new URL(url).pathname)).not.toContain(demoArticle);
  });
});
