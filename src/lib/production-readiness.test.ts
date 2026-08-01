import { describe, expect, test } from "bun:test";

import { resolveEnvironment } from "@/config/environment";
import { createContentRepository } from "@/content/repository";
import type { ArticleFrontmatter } from "@/content/schema";
import { generateRss, generateSitemap } from "@/lib/distribution";
import { applySecurityHeaders, contentSecurityPolicy } from "@/lib/security-headers";
import { readFile } from "node:fs/promises";

const realRecord: ArticleFrontmatter = {
  slug: "conteudo-real-validado",
  title: "Conteúdo editorial real validado para teste",
  subtitle: "Registro controlado sem publicação externa.",
  excerpt: "Valida que conteúdo não demonstrativo pode integrar o repositório.",
  contentType: "analysis",
  status: "published",
  draftStage: "review-ready",
  author: "ana-souza",
  category: "energia",
  tags: ["validação"],
  publishedAt: "2026-07-13",
  approvedAt: "2026-07-13",
  readingTime: 2,
  cover: {
    src: "/favicon.ico",
    alt: "Ativo local de teste",
    decorative: false,
    license: "uso autorizado para teste",
  },
  featured: false,
  isDemo: false,
  sponsored: false,
  sourceUrls: [],
  sources: [
    {
      title: "Fonte oficial de teste",
      url: "https://www.gov.br/mme/pt-br",
      organizationOrAuthor: "MME",
      verifiedAt: "2026-07-13",
      type: "official",
      isDemo: false,
    },
  ],
  corrections: [],
  aiAssistance: "none",
};

describe("preparação para produção", () => {
  test("build genérico é preview e não indexável", () => {
    const config = resolveEnvironment({ mode: "production" });
    expect(config.name).toBe("preview");
    expect(config.indexingEnabled).toBeFalse();
  });

  test("produção exige URL pública explícita", () => {
    expect(() => resolveEnvironment({ appEnvironment: "production" })).toThrow();
  });

  test("produção rejeita conteúdo demo", () => {
    expect(() =>
      resolveEnvironment({
        appEnvironment: "production",
        publicSiteUrl: "https://www.gov.br",
        allowDemoContent: "true",
      }),
    ).toThrow();
  });

  test("staging expõe somente fixtures rotuladas para validação externa", () => {
    const config = resolveEnvironment({
      appEnvironment: "staging",
      publicSiteUrl: "https://staging.example.test",
    });
    expect(config.demoContentEnabled).toBeTrue();
    expect(config.indexingEnabled).toBeFalse();
  });

  test("repositório público não materializa filtro temporal no escopo global", async () => {
    const source = await readFile("src/content/repository.ts", "utf8");
    expect(source).toContain("function requestContentRepository()");
    expect(source).not.toMatch(/export const contentRepository = createContentRepository/);
  });

  test("conteúdo real validado é publicável pelo repositório", () => {
    expect(createContentRepository([realRecord], false).getPublishedArticles()).toHaveLength(1);
  });

  test("distribuição não oficial não lista conteúdo", () => {
    const article = createContentRepository([realRecord], false).getPublishedArticles();
    expect(generateSitemap(article, false)).not.toContain(realRecord.slug);
    expect(generateRss(article, false)).not.toContain(realRecord.title);
  });

  test("CSP bloqueia embedding e não usa unsafe-eval", () => {
    const policy = contentSecurityPolicy();
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).not.toContain("unsafe-eval");
  });

  test("headers essenciais são aplicados", async () => {
    const response = applySecurityHeaders(
      new Response("ok"),
      new Request("http://127.0.0.1:4173/"),
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(await response.text()).toBe("ok");
  });
});
