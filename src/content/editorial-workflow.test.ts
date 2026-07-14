import { afterEach, describe, expect, test } from "bun:test";
import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { stringify } from "yaml";

import { createDraft } from "../../scripts/new-content";
import { parseEditorialFile, validateArticleCollection } from "../../scripts/generate-content";
import { createContentRepository } from "./repository";
import { articleFrontmatterSchema, type ArticleFrontmatter } from "./schema";
import { articleRecords } from "./generated/articles";
import { generateSitemap } from "@/lib/distribution";
import { methodologyHead } from "@/lib/methodology";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true })));
});

const source = {
  title: "Documento oficial usado apenas no teste",
  url: "https://www.gov.br/mme/pt-br",
  organizationOrAuthor: "MME",
  verifiedAt: "2026-07-13",
  type: "official" as const,
  isDemo: false,
};

const base: ArticleFrontmatter = articleFrontmatterSchema.parse({
  slug: "conteudo-editorial-validado",
  title: "Conteúdo editorial validado para o fluxo de revisão",
  subtitle: "Subtítulo suficiente para identificar o cenário automatizado.",
  excerpt: "Resumo editorial controlado e sem afirmação factual de lançamento.",
  contentType: "news",
  status: "published",
  author: "ana-souza",
  category: "energia",
  tags: ["energia solar"],
  publishedAt: "2026-07-13",
  approvedAt: "2026-07-13",
  readingTime: 3,
  cover: {
    src: "/images/teste.jpg",
    alt: "Imagem editorial usada apenas no teste",
    license: "uso autorizado para teste",
  },
  featured: false,
  isDemo: false,
  sponsored: false,
  sourceUrls: [],
  sources: [source],
  corrections: [],
  aiAssistance: "none",
});

function parsed(overrides: Partial<ArticleFrontmatter>): ArticleFrontmatter {
  return articleFrontmatterSchema.parse({ ...base, ...overrides });
}

describe("guardrails editoriais de publicação", () => {
  test("rejeita news publicada sem fonte", () => {
    expect(() => parsed({ sources: [] })).toThrow("news publicado exige");
  });

  test("rejeita explainer publicado sem referência", () => {
    expect(() => parsed({ contentType: "explainer", sources: [] })).toThrow(
      "explainer publicado exige",
    );
  });

  test("opinion publicada exige disclosure", () => {
    expect(() => parsed({ contentType: "opinion", sources: [] })).toThrow(
      "Opinião publicada exige",
    );
  });

  test("conteúdo patrocinado exige sponsorName", () => {
    expect(() => parsed({ sponsored: true })).toThrow("sponsorName");
  });

  test("templates não entram no índice público", () => {
    expect(articleRecords.some((article) => article.slug.includes("__"))).toBeFalse();
    expect(articleRecords).toHaveLength(12);
  });

  test("draft não entra na listagem pública", () => {
    expect(createContentRepository([parsed({ status: "draft" })], false)).toMatchObject({
      getPublishedArticles: expect.any(Function),
    });
    expect(
      createContentRepository([parsed({ status: "draft" })], false).getPublishedArticles(),
    ).toHaveLength(0);
  });

  test("approved ainda não é publicado", () => {
    expect(
      createContentRepository([parsed({ status: "approved" })], false).getPublishedArticles(),
    ).toHaveLength(0);
  });

  test("scheduled futuro não é publicado", () => {
    const scheduled = parsed({ status: "scheduled", scheduledAt: "2099-01-01T12:00:00-03:00" });
    expect(createContentRepository([scheduled], false).getPublishedArticles()).toHaveLength(0);
  });

  test("correction-needed não é distribuído normalmente", () => {
    const correction = parsed({ status: "correction-needed" });
    expect(createContentRepository([correction], false).getPublishedArticles()).toHaveLength(0);
  });

  test("histórico de correção é validado", () => {
    expect(() =>
      parsed({
        updatedAt: "2026-07-13",
        corrections: [
          { type: "correction", date: "2026-07-13", reason: "", description: "Ajuste factual" },
        ],
      }),
    ).toThrow();
    expect(
      parsed({
        updatedAt: "2026-07-13",
        corrections: [
          {
            type: "correction",
            date: "2026-07-13",
            reason: "Precisão",
            description: "Descrição pública e objetiva da correção.",
          },
        ],
      }).corrections,
    ).toHaveLength(1);
  });

  test("slug duplicado é rejeitado", () => {
    expect(() => validateArticleCollection([base, base])).toThrow("Slug duplicado");
  });

  test("tag equivalente não canônica é rejeitada com sugestão", () => {
    expect(() => parsed({ tags: ["solar"] })).toThrow("energia solar");
  });

  test("demo não aparece em produção", () => {
    const demo = parsed({
      isDemo: true,
      sources: [],
      cover: { ...base.cover, license: "unknown" },
    });
    expect(createContentRepository([demo], false).getPublishedArticles()).toHaveLength(0);
  });

  test("metodologia possui metadata e canonical", () => {
    const head = methodologyHead();
    expect(head.meta.some((entry) => "title" in entry)).toBeTrue();
    expect(head.links[0]?.href).toEndWith("/metodologia");
  });

  test("sitemap inclui metodologia", () => {
    expect(generateSitemap([])).toContain("/metodologia");
  });

  test("CLI não sobrescreve arquivo existente", async () => {
    const root = await mkdtemp(join(tmpdir(), "sul-global-content-"));
    temporaryDirectories.push(root);
    const templateTarget = join(root, "content/templates/news.mdx");
    await mkdir(dirname(templateTarget), { recursive: true });
    await copyFile(join(process.cwd(), "content/templates/news.mdx"), templateTarget);
    const input = {
      type: "news" as const,
      title: "Pauta real ainda não apurada",
      slug: "pauta-real-nao-apurada",
      author: "ana-souza",
      category: "energia" as const,
      date: "2026-07-13",
      tag: "energia solar",
    };
    await createDraft(input, root);
    expect(createDraft(input, root)).rejects.toThrow("já existe");
  });

  test("validação produz erro acionável com caminho e campo", () => {
    const invalid = { ...base, slug: "Slug Inválido" };
    expect(() =>
      parseEditorialFile(
        `---\n${stringify(invalid)}---\n\nTexto.`,
        "content/articles/invalido.mdx",
      ),
    ).toThrow(/content\/articles\/invalido\.mdx[\s\S]*slug/);
  });
});
