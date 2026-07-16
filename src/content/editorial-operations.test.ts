import { describe, expect, test } from "bun:test";

import { stringify } from "yaml";

import {
  listArticles,
  prepareStatusChange,
  publishCheck,
  reviewArticle,
  type OperationContext,
} from "../../scripts/editorial-operations";
import { parseEditorialFile } from "../../scripts/generate-content";
import { generateRss, generateSitemap } from "@/lib/distribution";
import { createContentRepository } from "./repository";
import { articleFrontmatterSchema, type ArticleFrontmatter, type Author } from "./schema";

const context: OperationContext = {
  now: new Date("2026-07-13T12:00:00-03:00"),
  officialProduction: true,
};

const verifiedAuthor: Author = {
  slug: "autor-verificado",
  displayName: "Autor validado de teste",
  role: "Fixture de teste",
  shortBio: "Registro usado somente para validar o fluxo automatizado.",
  isDemo: false,
  status: "verified",
  verifiedAt: "2026-07-13",
  credentials: [],
  expertise: [],
  socialLinks: {},
};

const authorDirectory = { [verifiedAuthor.slug]: verifiedAuthor };

const base: ArticleFrontmatter = articleFrontmatterSchema.parse({
  slug: "operacao-editorial-controlada",
  title: "Operação editorial controlada para teste automatizado",
  subtitle: "Registro sintético sem afirmações editoriais reais.",
  excerpt: "Fixture usada exclusivamente para validar transições e distribuição.",
  contentType: "news",
  status: "approved",
  author: verifiedAuthor.slug,
  category: "energia",
  tags: ["brasil"],
  createdAt: "2026-07-13",
  approvedAt: "2026-07-13",
  readingTime: 2,
  cover: {
    src: "/images/teste.jpg",
    alt: "Imagem controlada de teste",
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
});

function article(overrides: Partial<ArticleFrontmatter> = {}): ArticleFrontmatter {
  return articleFrontmatterSchema.parse({ ...base, ...overrides });
}

function mdx(record: ArticleFrontmatter): string {
  return `---\n${stringify(record)}---\n\nTexto estrutural de teste.`;
}

describe("operação editorial diária", () => {
  test("aceita transição válida", () => {
    const draft = article({ status: "draft", draftStage: "review-ready", approvedAt: undefined });
    const result = prepareStatusChange(mdx(draft), "review", context, authorDirectory, {
      readyForWriting: true,
      blockers: [],
    });
    expect(parseEditorialFile(result.content).frontmatter.status).toBe("review");
  });

  test("rejeita transição inválida", () => {
    const draft = article({ status: "draft", approvedAt: undefined });
    expect(() => prepareStatusChange(mdx(draft), "published", context, authorDirectory)).toThrow(
      "Transição inválida",
    );
  });

  test("publicação sem aprovação falha", () => {
    const draft = article({ status: "draft", approvedAt: undefined });
    expect(publishCheck(draft, context, authorDirectory).blockers.join(" ")).toContain("approved");
  });

  test("publicação sem fonte falha", () => {
    const draft = articleFrontmatterSchema.parse({ ...base, status: "draft", sources: [] });
    expect(reviewArticle(draft, authorDirectory).blockers.join(" ")).toContain("fonte estruturada");
  });

  test("publicação sem licença de imagem falha", () => {
    const draft = articleFrontmatterSchema.parse({
      ...base,
      status: "draft",
      cover: { ...base.cover, license: "pending" },
    });
    expect(reviewArticle(draft, authorDirectory).blockers.join(" ")).toContain("licença");
  });

  test("demo não vira real por troca de status", () => {
    const demo = articleFrontmatterSchema.parse({
      ...base,
      author: "ana-souza",
      status: "published",
      publishedAt: "2026-07-13",
      isDemo: true,
      sources: [],
      cover: { ...base.cover, license: "unknown" },
    });
    const result = prepareStatusChange(mdx(demo), "archived", context);
    expect(parseEditorialFile(result.content).frontmatter.isDemo).toBeTrue();
  });

  test("conteúdo real draft não aparece", () => {
    expect(
      createContentRepository(
        [article({ author: "ana-souza", status: "draft" })],
        false,
      ).getPublishedArticles(),
    ).toHaveLength(0);
  });

  test("produção com zero conteúdos reais funciona", () => {
    expect(createContentRepository([], false).getPublishedArticles()).toEqual([]);
  });

  test("produção com um artigo real funciona", () => {
    const published = article({
      author: "ana-souza",
      status: "published",
      publishedAt: "2026-07-13",
    });
    expect(createContentRepository([published], false).getPublishedArticles()).toHaveLength(1);
  });

  test("produção com vários artigos reais funciona", () => {
    const first = article({ author: "ana-souza", status: "published", publishedAt: "2026-07-13" });
    const second = { ...first, slug: "segunda-operacao-editorial" };
    expect(createContentRepository([first, second], false).getPublishedArticles()).toHaveLength(2);
  });

  test("RSS exclui drafts", () => {
    const records = [article({ author: "ana-souza", status: "draft" })];
    expect(
      generateRss(createContentRepository(records, false).getPublishedArticles()),
    ).not.toContain(base.title);
  });

  test("sitemap exclui drafts", () => {
    const records = [article({ author: "ana-souza", status: "draft" })];
    expect(
      generateSitemap(createContentRepository(records, false).getPublishedArticles()),
    ).not.toContain(base.slug);
  });

  test("CLI lista status", () => {
    const parsed = parseEditorialFile(mdx(article()), "content/articles/fixture.mdx");
    expect(listArticles([parsed])).toContain("approved");
  });

  test("review reporta bloqueadores", () => {
    const pilot = articleFrontmatterSchema.parse({
      ...base,
      status: "draft",
      author: "autoria-pendente",
      sources: [],
      cover: { ...base.cover, license: "pending" },
      title: "[RASCUNHO] Pauta ainda não apurada",
    });
    expect(reviewArticle(pilot).blockers.length).toBeGreaterThan(2);
  });

  test("publish-check não altera o registro", () => {
    const before = JSON.stringify(base);
    publishCheck(base, context, authorDirectory);
    expect(JSON.stringify(base)).toBe(before);
  });

  test("autor demo bloqueia conteúdo real", () => {
    const realWithDemoAuthor = article({ author: "ana-souza", status: "draft" });
    expect(reviewArticle(realWithDemoAuthor).blockers.join(" ")).toContain("não está verificado");
  });

  test("autor verified permite revisão", () => {
    expect(reviewArticle(base, authorDirectory).blockers).toHaveLength(0);
  });

  test("artigo piloto permanece invisível", async () => {
    const source = await Bun.file(
      "content/articles/rascunho-como-funciona-matriz-eletrica-brasileira.mdx",
    ).text();
    const pilot = parseEditorialFile(source).frontmatter;
    expect(pilot.status).toBe("draft");
    expect(createContentRepository([pilot], false).getPublishedArticles()).toHaveLength(0);
  });
});
