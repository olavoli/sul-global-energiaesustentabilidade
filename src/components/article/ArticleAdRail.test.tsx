import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { ArticleAdRail } from "./ArticleAdRail";
import {
  ADSTERRA_FRAME_PATH,
  createAdsterraFrameResponse,
  hasArticleAdSpace,
} from "@/lib/advertising/adsterra";
import { applySecurityHeaders, contentSecurityPolicy } from "@/lib/security-headers";

test("SSR não emite iframe, script, preconnect ou URL de rede publicitária", () => {
  const html = renderToString(<ArticleAdRail articleKey="fixture" />);
  expect(html).not.toContain("<iframe");
  expect(html).not.toContain("<script");
  expect(html).not.toContain("bicea.org");
  expect(html).not.toContain("preconnect");
});

test("telas estreitas nunca são elegíveis e falta de espaço também bloqueia desktop", () => {
  for (const width of [390, 768, 1024, 1280, 1366]) {
    expect(hasArticleAdSpace(false, 100, width)).toBeFalse();
  }
  expect(hasArticleAdSpace(true, 1000, 1440)).toBeTrue();
  expect(hasArticleAdSpace(true, 1257, 1440)).toBeFalse();
  expect(hasArticleAdSpace(true, -1, 1920)).toBeFalse();
  expect(hasArticleAdSpace(true, 1736, 1920)).toBeTrue();
});

test("somente uma instância é integrada no layout compartilhado, sem alterar a largura editorial", () => {
  const route = readFileSync("src/routes/artigo.$slug.tsx", "utf8");
  expect(route.match(/<ArticleAdRail\b/g)).toHaveLength(1);
  expect(route).toContain("max-w-[72ch]");
});

test("recurso isolado contém exclusivamente a unidade 160x600_1 fornecida", async () => {
  const request = new Request(`https://example.test${ADSTERRA_FRAME_PATH}`);
  const response = createAdsterraFrameResponse(request);
  expect(response?.status).toBe(200);
  const html = await response!.text();
  expect(html.match(/<script src=/g)).toHaveLength(1);
  expect(html).toContain('src="https://bicea.org/22/b5a35db3ccd7e9e06392b002636eb4d5"');
  expect(html).toContain("'format' : 'iframe'");
  expect(html).toContain("'width' : 160");
  expect(html).toContain("'height' : 600");
  expect(html).not.toMatch(/NativeBanner|SocialBar|Popunder|Smartlink/i);
  expect(response?.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  expect(response?.headers.get("cache-control")).toBe("no-store");
  expect(createAdsterraFrameResponse(new Request("https://example.test/"))).toBeUndefined();
  expect(createAdsterraFrameResponse(new Request(request.url, { method: "POST" }))?.status).toBe(
    405,
  );
  expect(
    await createAdsterraFrameResponse(new Request(request.url, { method: "HEAD" }))?.text(),
  ).toBe("");
});

test("CSP confina permissões publicitárias ao iframe, preservando as outras páginas", () => {
  const article = applySecurityHeaders(
    new Response("ok"),
    new Request("https://example.test/artigo/fixture"),
  );
  expect(article.headers.get("content-security-policy")).toContain(
    "frame-src https://challenges.cloudflare.com 'self'",
  );
  expect(article.headers.get("content-security-policy")).not.toContain("bicea.org");
  const home = applySecurityHeaders(new Response("ok"), new Request("https://example.test/"));
  expect(home.headers.get("content-security-policy")).toBe(contentSecurityPolicy());
  const frame = applySecurityHeaders(
    new Response("ok"),
    new Request(`https://example.test${ADSTERRA_FRAME_PATH}`),
  );
  expect(frame.headers.get("content-security-policy")).toContain(
    "script-src 'unsafe-inline' https://bicea.org",
  );
  expect(frame.headers.get("content-security-policy")).not.toContain("unsafe-eval");
  expect(frame.headers.get("x-frame-options")).toBe("SAMEORIGIN");
  expect(frame.headers.get("content-security-policy")).toContain(
    "sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox",
  );
  expect(article.headers.get("x-frame-options")).toBe("DENY");
});
