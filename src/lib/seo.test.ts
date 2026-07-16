import { describe, expect, test } from "bun:test";

import { createContentRepository } from "@/content/repository";
import type { ArticleFrontmatter } from "@/content/schema";
import { getAuthor } from "@/data/authors";
import { generateRobots, generateRss, generateSitemap } from "@/lib/distribution";
import { SEARCH_ROBOTS, articleJsonLd, breadcrumbJsonLd, resolveCanonical } from "@/lib/seo";

const baseRecord: ArticleFrontmatter = {
  slug: "publicacao-verificada",
  title: "Publicação verificada para os testes de distribuição",
  subtitle: "Uma base editorial controlada para validar SEO.",
  excerpt: "Resumo editorial usado nos testes automatizados.",
  contentType: "news",
  status: "published",
  draftStage: "review-ready",
  author: "ana-souza",
  category: "energia",
  tags: ["teste"],
  publishedAt: "2026-07-13",
  approvedAt: "2026-07-13",
  readingTime: 3,
  cover: {
    src: "/images/social/sul-global-editorial-placeholder.svg",
    alt: "Cartão editorial Sul Global",
    width: 1200,
    height: 630,
    decorative: false,
    license: "uso autorizado para teste",
  },
  featured: false,
  isDemo: false,
  sponsored: false,
  sourceUrls: [],
  sources: [
    {
      title: "Fonte regulatória de teste",
      url: "https://www.gov.br/aneel/pt-br",
      organizationOrAuthor: "ANEEL",
      verifiedAt: "2026-07-13",
      type: "regulatory",
      isDemo: false,
    },
  ],
  corrections: [],
  aiAssistance: "none",
};

function published(record: ArticleFrontmatter = baseRecord) {
  return createContentRepository([record], true).getPublishedArticles()[0];
}

describe("SEO e distribuição", () => {
  test("gera canonical absoluto para a home", () => {
    expect(resolveCanonical("/")).toMatch(/^https?:\/\//);
  });

  test("resolve canonical relativo de artigo", () => {
    expect(resolveCanonical("/artigo/publicacao-verificada")).toEndWith(
      "/artigo/publicacao-verificada",
    );
  });

  test("mantém busca como noindex, follow", () => {
    expect(SEARCH_ROBOTS).toBe("noindex, follow");
  });

  test("sitemap não inclui draft", () => {
    const draft = { ...baseRecord, slug: "rascunho", status: "draft" as const };
    const articles = createContentRepository([baseRecord, draft], true).getPublishedArticles();
    expect(generateSitemap(articles)).not.toContain("rascunho");
  });

  test("sitemap de produção não inclui conteúdo demo", () => {
    const demo = { ...baseRecord, isDemo: true };
    const articles = createContentRepository([demo], false).getPublishedArticles();
    expect(generateSitemap(articles)).not.toContain(demo.slug);
  });

  test("RSS inclui artigo publicado", () => {
    expect(generateRss([published()])).toContain(baseRecord.title);
  });

  test("RSS não inclui draft filtrado pelo repositório", () => {
    const draft = { ...baseRecord, status: "draft" as const };
    const articles = createContentRepository([draft], true).getPublishedArticles();
    expect(generateRss(articles)).not.toContain(baseRecord.title);
  });

  test("encontra autor válido", () => {
    expect(getAuthor("ana-souza")?.displayName).toBe("Ana Souza");
  });

  test("retorna ausência para autor inválido", () => {
    expect(getAuthor("autor-inexistente")).toBeUndefined();
  });

  test("robots e sitemap usam URLs absolutas", () => {
    expect(generateRobots(false)).toMatch(/Sitemap: https?:\/\//);
    expect(generateSitemap([published()])).toMatch(/<loc>https?:\/\//);
  });

  test("RSS identifica conteúdo patrocinado", () => {
    const sponsored = published({
      ...baseRecord,
      sponsored: true,
      sponsorName: "Patrocinador identificado",
    });
    expect(generateRss([sponsored])).toContain(
      "Conteúdo patrocinado por Patrocinador identificado",
    );
  });

  test("dados estruturados são coerentes e não usam domínio fictício", () => {
    const article = published();
    const payload = JSON.stringify([
      articleJsonLd(article),
      breadcrumbJsonLd([{ name: "Início", path: "/" }]),
    ]);
    expect(payload).toContain('"@type":"NewsArticle"');
    expect(payload).not.toContain("example.com");
    expect(payload).not.toContain("lovable.app");
  });
});
