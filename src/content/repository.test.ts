import { describe, expect, test } from "bun:test";

import { parseEditorialFile, validateArticleCollection } from "../../scripts/generate-content";
import {
  articleFrontmatterSchema,
  canonicalSourceUrls,
  sourceUrlDivergence,
  type ArticleFrontmatter,
} from "./schema";
import { createContentRepository } from "./repository";

const baseArticle: ArticleFrontmatter = {
  slug: "artigo-valido",
  title: "Artigo editorial válido para teste",
  subtitle: "Contexto editorial suficiente para o cenário.",
  excerpt: "Resumo pesquisável sobre energia solar e transição.",
  contentType: "explainer",
  status: "published",
  draftStage: "review-ready",
  author: "ana-souza",
  category: "energia",
  tags: ["energia solar", "transição"],
  publishedAt: "2026-07-13",
  approvedAt: "2026-07-13",
  readingTime: 4,
  cover: {
    src: "/imagem.jpg",
    alt: "Painéis solares em campo aberto",
    width: 1200,
    height: 630,
    decorative: false,
    license: "uso autorizado para teste",
  },
  featured: true,
  isDemo: false,
  sponsored: false,
  sources: [
    {
      title: "Fonte técnica de teste",
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

describe("frontmatter editorial", () => {
  test("aceita frontmatter válido", () => {
    expect(articleFrontmatterSchema.parse(baseArticle).slug).toBe("artigo-valido");
  });

  test("rejeita frontmatter inválido", () => {
    expect(() =>
      articleFrontmatterSchema.parse({ ...baseArticle, cover: { ...baseArticle.cover, alt: "" } }),
    ).toThrow();
  });

  test("detecta slug duplicado", () => {
    expect(() => validateArticleCollection([baseArticle, baseArticle])).toThrow("Slug duplicado");
  });

  test("exige patrocinador identificado", () => {
    expect(() => articleFrontmatterSchema.parse({ ...baseArticle, sponsored: true })).toThrow();
  });

  test("rejeita JavaScript no corpo MDX", () => {
    const source = `---\n${JSON.stringify(baseArticle)}\n---\n\n{alert('não')}`;
    expect(() => parseEditorialFile(source)).toThrow("JavaScript");
  });

  test("aceita artigo novo somente com sources e preserva sua ordem", () => {
    const secondSource = {
      ...baseArticle.sources[0],
      title: "Segunda fonte técnica",
      url: "https://www.gov.br/mme/pt-br",
    };
    const parsed = articleFrontmatterSchema.parse({
      ...baseArticle,
      sources: [...baseArticle.sources, secondSource],
    });
    expect(parsed.sourceUrls).toBeUndefined();
    expect(canonicalSourceUrls(parsed)).toEqual([
      "https://www.gov.br/aneel/pt-br",
      "https://www.gov.br/mme/pt-br",
    ]);
  });

  test("aceita sourceUrls legado durante a transição", () => {
    const sourceUrls = [baseArticle.sources[0].url];
    const parsed = articleFrontmatterSchema.parse({ ...baseArticle, sourceUrls });
    expect(parsed.sourceUrls).toEqual(sourceUrls);
    expect(canonicalSourceUrls(parsed)).toEqual(sourceUrls);
  });

  test("fallback legado funciona quando ainda não há sources estruturadas", () => {
    const legacy = articleFrontmatterSchema.parse({
      ...baseArticle,
      status: "draft",
      sources: [],
      sourceUrls: ["https://example.test/fonte-legada"],
    });
    expect(canonicalSourceUrls(legacy)).toEqual(["https://example.test/fonte-legada"]);
  });

  test("detecta divergência sem perder nenhuma URL", () => {
    const legacyOnly = "https://example.test/fonte-legada-adicional";
    const parsed = articleFrontmatterSchema.parse({
      ...baseArticle,
      sourceUrls: [baseArticle.sources[0].url, legacyOnly],
    });
    expect(sourceUrlDivergence(parsed)).toMatchObject({
      onlyLegacy: [legacyOnly],
      onlyStructured: [],
      sameOrder: false,
    });
    expect(new Set([...canonicalSourceUrls(parsed), ...(parsed.sourceUrls ?? [])]).size).toBe(2);
  });
});

describe("repositório editorial", () => {
  test("não lista drafts publicamente", () => {
    const draft = { ...baseArticle, slug: "rascunho", status: "draft" as const };
    expect(createContentRepository([baseArticle, draft], true).getPublishedArticles()).toHaveLength(
      1,
    );
  });

  test("bloqueia demo em produção por padrão", () => {
    const demo = { ...baseArticle, isDemo: true };
    expect(createContentRepository([demo], false).getPublishedArticles()).toHaveLength(0);
  });

  test("recupera artigo por slug e retorna ausência esperada", () => {
    const repository = createContentRepository([baseArticle], true);
    expect(repository.getArticleBySlug("artigo-valido")?.title).toBe(baseArticle.title);
    expect(repository.getArticleBySlug("inexistente")).toBeUndefined();
  });

  test("filtra por categoria", () => {
    const other = { ...baseArticle, slug: "outra-categoria", category: "ciencia" as const };
    expect(
      createContentRepository([baseArticle, other], true).getArticlesByCategory("energia"),
    ).toHaveLength(1);
  });

  test("pesquisa somente o índice resumido", () => {
    const results = createContentRepository([baseArticle], true).searchArticles("solar");
    expect(results.map((article) => article.slug)).toEqual(["artigo-valido"]);
  });

  test("ordena os mais recentes por publicação e desempata pelo slug", () => {
    const older = { ...baseArticle, slug: "artigo-anterior", publishedAt: "2026-07-12" };
    const tiedLater = { ...baseArticle, slug: "zeta-no-mesmo-dia" };
    const tiedFirst = { ...baseArticle, slug: "alfa-no-mesmo-dia" };

    expect(
      createContentRepository([older, tiedLater, tiedFirst], true)
        .getLatestArticles()
        .map(({ slug }) => slug),
    ).toEqual(["alfa-no-mesmo-dia", "zeta-no-mesmo-dia", "artigo-anterior"]);
  });
});
