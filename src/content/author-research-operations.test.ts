import { afterEach, describe, expect, test } from "bun:test";
import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { parse } from "yaml";

import {
  createAuthorOnboarding,
  prepareAuthorPromotion,
  validateOnboarding,
} from "../../scripts/author-operations";
import { reviewArticle } from "../../scripts/editorial-operations";
import { createDraft } from "../../scripts/new-content";
import { evaluateResearch } from "../../scripts/research-operations";
import { articleRecords } from "./generated/articles";
import { articleLoaders } from "./generated/loaders";
import { getPublicAuthor } from "../data/authors";
import { createContentRepository } from "./repository";
import { articleFrontmatterSchema, authorSchema, type Author } from "./schema";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true })));
});

const pendingAuthor: Author = authorSchema.parse({
  slug: "autor-pendente-teste",
  displayName: "Autor pendente de teste",
  shortBio: "Perfil sintético usado somente pelos testes automatizados.",
  credentials: [],
  expertise: ["fixture editorial"],
  socialLinks: {},
  status: "pending",
  isDemo: false,
});

const onboarding = {
  slug: pendingAuthor.slug,
  displayName: pendingAuthor.displayName,
  shortBio: pendingAuthor.shortBio,
  expertise: pendingAuthor.expertise,
  role: null,
  organization: null,
  credentials: [],
  credentialsConfirmed: null,
  socialLinks: {},
  conflictsOfInterest: "Fixture sem conflito real porque não representa uma pessoa.",
  publicationAuthorized: true,
  truthConfirmed: true,
};

const article = articleFrontmatterSchema.parse({
  slug: "piloto-operacional-de-teste",
  title: "Piloto operacional estritamente sintético para testes",
  subtitle: "Estrutura automatizada sem afirmação editorial.",
  excerpt: "Registro sintético usado somente para testar os gates de autoria e pesquisa.",
  contentType: "explainer",
  status: "draft",
  draftStage: "scaffold",
  author: pendingAuthor.slug,
  category: "energia",
  tags: ["brasil"],
  createdAt: "2026-07-13",
  readingTime: 1,
  cover: { src: "/teste-pendente.jpg", alt: "Fixture visual", license: "pending" },
  featured: false,
  isDemo: false,
  sponsored: false,
  sourceUrls: [],
  sources: [],
  aiAssistance: "none",
});

const readyResearch = {
  articleSlug: article.slug,
  researchQuestion: "Pergunta sintética usada somente no teste?",
  scope: "Escopo sintético sem conteúdo factual.",
  audience: "Executor automatizado de testes.",
  keyQuestions: ["Questão estrutural de teste?"],
  requiredData: ["Dado sintético de teste"],
  requiredSourceTypes: ["fixture"],
  candidateSources: [],
  confirmedSources: [
    {
      title: "Fonte sintética de teste",
      url: "https://example.test/source",
      organization: "Fixture automatizada",
      verifiedAt: "2026-07-13",
    },
  ],
  rejectedSources: [],
  openQuestions: [],
  factChecks: [
    {
      statement: "Afirmação sintética de teste",
      status: "confirmed",
      sourceUrls: ["https://example.test/source"],
    },
  ],
  imageRequirements: {
    origin: "fixture local",
    license: "licença sintética de teste",
    authorization: "autorização sintética de teste",
    credit: "fixture",
    alt: "Imagem sintética de teste",
    width: 1200,
    height: 630,
    aspectRatio: "1200:630",
    socialVersion: "fixture social",
    usageRisk: "risco avaliado no teste",
    isDemoConfirmed: true,
  },
  conflictsOfInterestEvaluated: true,
  editorialRisks: [],
  researchStatus: "ready-for-writing",
};

describe("onboarding e autoria real", () => {
  test("autor pending pode assinar draft", async () => {
    const root = await mkdtemp(join(tmpdir(), "sul-global-author-"));
    temporaryDirectories.push(root);
    const template = join(root, "content/templates/explainer.mdx");
    await mkdir(dirname(template), { recursive: true });
    await copyFile(join(process.cwd(), "content/templates/explainer.mdx"), template);
    const target = await createDraft(
      {
        type: "explainer",
        title: "Draft sintético para autoria pendente",
        slug: "draft-sintetico-autoria-pendente",
        author: pendingAuthor.slug,
        category: "energia",
        date: "2026-07-13",
        tag: "brasil",
      },
      root,
      { [pendingAuthor.slug]: pendingAuthor },
    );
    expect(target).toEndWith("draft-sintetico-autoria-pendente.mdx");
  });

  test("autor pending não pode publicar", () => {
    expect(
      reviewArticle(article, { [pendingAuthor.slug]: pendingAuthor }).blockers.join(" "),
    ).toContain("não está verificado");
  });

  test("autor verified exige verifiedAt", () => {
    expect(() => authorSchema.parse({ ...pendingAuthor, status: "verified" })).toThrow(
      "verifiedAt",
    );
  });

  test("autor demo não pode assinar conteúdo real", () => {
    const demo = authorSchema.parse({ ...pendingAuthor, status: "demo", isDemo: true });
    expect(reviewArticle(article, { [demo.slug]: demo }).blockers).not.toHaveLength(0);
  });

  test("onboarding vazio não é válido", () => {
    expect(validateOnboarding({}).valid).toBeFalse();
  });

  test("onboarding não é publicado", () => {
    expect(JSON.stringify(articleRecords)).not.toContain("publicationAuthorized");
    expect(JSON.stringify(articleLoaders)).not.toContain("author-onboarding");
    expect(getPublicAuthor("autoria-pendente", false)).toBeUndefined();
  });

  test("autor não é verificado automaticamente", () => {
    validateOnboarding(onboarding);
    expect(pendingAuthor.status).toBe("pending");
  });

  test("promoção é dry-run por padrão e não altera origem", () => {
    const promoted = prepareAuthorPromotion(
      pendingAuthor,
      onboarding,
      "2026-07-13",
      "revisor-teste",
    );
    expect(promoted.status).toBe("verified");
    expect(pendingAuthor.status).toBe("pending");
    expect(promoted.shortBio).toBe(pendingAuthor.shortBio);
  });

  test("CLI não sobrescreve onboarding existente", async () => {
    const root = await mkdtemp(join(tmpdir(), "sul-global-onboarding-"));
    temporaryDirectories.push(root);
    const template = join(root, "content/templates/author-onboarding.yml");
    await mkdir(dirname(template), { recursive: true });
    await copyFile(join(process.cwd(), "content/templates/author-onboarding.yml"), template);
    await createAuthorOnboarding("autor-teste", root);
    expect(createAuthorOnboarding("autor-teste", root)).rejects.toThrow("já existe");
  });

  test("dados internos são removidos do perfil público", () => {
    const publicProfile = authorSchema.parse({ ...pendingAuthor, truthConfirmed: true });
    expect("truthConfirmed" in publicProfile).toBeFalse();
  });
});

describe("briefing e gate de pesquisa", () => {
  test("artigo piloto permanece invisível", () => {
    expect(createContentRepository([article], false).getPublishedArticles()).toHaveLength(0);
  });

  test("pesquisa não iniciada bloqueia review", async () => {
    const raw = parse(
      await Bun.file(
        "content/research/rascunho-como-funciona-matriz-eletrica-brasileira.yml",
      ).text(),
    );
    expect(evaluateResearch(raw).readyForWriting).toBeFalse();
  });

  test("pesquisa pronta permite redação, não publicação", () => {
    const report = evaluateResearch(readyResearch);
    expect(report.readyForWriting).toBeTrue();
    expect(report.nextAction).toContain("draft factual");
  });

  test("fonte candidata não vale como confirmada", () => {
    const report = evaluateResearch({
      ...readyResearch,
      candidateSources: readyResearch.confirmedSources,
      confirmedSources: [],
    });
    expect(report.blockers.join(" ")).toContain("fonte real");
  });

  test("fonte rejeitada não vale como confirmada", () => {
    const report = evaluateResearch({
      ...readyResearch,
      confirmedSources: [],
      rejectedSources: [
        { title: "Rejeitada de teste", url: "https://example.test/rejected", reason: "Fixture" },
      ],
    });
    expect(report.confirmedCount).toBe(0);
  });

  test("fact-check pendente bloqueia review", () => {
    const factChecks = [{ ...readyResearch.factChecks[0], status: "pending" }];
    expect(evaluateResearch({ ...readyResearch, factChecks }).blockers.join(" ")).toContain(
      "fact-checks",
    );
  });

  test("imagem sem licença bloqueia review", () => {
    const imageRequirements = { ...readyResearch.imageRequirements, license: null };
    expect(evaluateResearch({ ...readyResearch, imageRequirements }).blockers.join(" ")).toContain(
      "licença",
    );
  });

  test("briefing não entra no bundle", () => {
    expect(JSON.stringify(articleRecords)).not.toContain("researchStatus");
    expect(JSON.stringify(articleLoaders)).not.toContain("content/research");
  });
});
