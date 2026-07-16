import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";

import {
  articleFrontmatterSchema,
  type ArticleFrontmatter,
  type ArticleStatus,
  type Author,
} from "../src/content/schema";
import { authors } from "../src/data/authors";
import { parseEditorialFile, type ParsedEditorialFile } from "./generate-content";
import { evaluateResearch, loadResearchBrief, type ResearchReport } from "./research-operations";

export const allowedTransitions: Readonly<Record<ArticleStatus, readonly ArticleStatus[]>> = {
  draft: ["review"],
  review: ["approved"],
  approved: ["published", "scheduled"],
  scheduled: ["published"],
  published: ["correction-needed", "archived"],
  "correction-needed": ["review"],
  archived: [],
};

export interface OperationContext {
  now: Date;
  officialProduction: boolean;
}

export interface ReviewReport {
  slug: string;
  blockers: string[];
  warnings: string[];
  checks: string[];
}

export async function loadEditorialFiles(root = process.cwd()): Promise<ParsedEditorialFile[]> {
  const directory = resolve(root, "content/articles");
  const names = (await readdir(directory)).filter((name) => name.endsWith(".mdx")).sort();
  return Promise.all(
    names.map(async (name) => {
      const path = join(directory, name);
      const parsed = parseEditorialFile(await readFile(path, "utf8"), relative(root, path));
      if (basename(name, ".mdx") !== parsed.frontmatter.slug) {
        throw new Error(`${name}: nome do arquivo diferente do slug.`);
      }
      return parsed;
    }),
  );
}

export function reviewArticle(
  article: ArticleFrontmatter,
  authorDirectory: Readonly<Record<string, Author>> = authors,
): ReviewReport {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const checks = ["schema válido", "slug e taxonomia válidos"];
  const author = authorDirectory[article.author];

  if (!author) blockers.push("Autor inexistente.");
  else if (!article.isDemo && author.status !== "verified") {
    blockers.push(`Autor ${article.author} não está verificado.`);
  } else checks.push(`autoria ${author.status}`);

  if (
    ["news", "explainer", "analysis"].includes(article.contentType) &&
    article.sources.length === 0
  ) {
    blockers.push(`${article.contentType} exige fonte estruturada antes da publicação.`);
  }
  if (article.sources.some((source) => source.isDemo))
    blockers.push("Fonte demo não sustenta conteúdo real.");
  if (!article.cover.license || ["unknown", "pending"].includes(article.cover.license)) {
    blockers.push("Imagem sem licença verificável.");
  }
  if (article.cover.src.includes("pendente")) warnings.push("Imagem ainda usa caminho provisório.");
  if (/\[RASCUNHO\]|provisóri|pendente/i.test(article.title))
    blockers.push("Título ainda é provisório.");
  if (!article.canonicalUrl) warnings.push("Canonical será derivado automaticamente do slug.");
  if (article.sourceUrls.length > 0) warnings.push("sourceUrls legado deve migrar para sources.");
  if (article.sponsored && !article.sponsorName) blockers.push("Patrocínio exige sponsorName.");
  if (article.aiAssistance === "substantial" && !article.aiDisclosure) {
    blockers.push("Uso substancial de IA exige disclosure.");
  }
  if (article.corrections.length > 0) checks.push("histórico de correções validado");
  checks.push(`${article.sources.length} fonte(s) estruturada(s)`);
  return { slug: article.slug, blockers, warnings, checks };
}

export function publishCheck(
  article: ArticleFrontmatter,
  context: OperationContext,
  authorDirectory: Readonly<Record<string, Author>> = authors,
): ReviewReport {
  const report = reviewArticle(article, authorDirectory);
  if (!article.isDemo && !["approved", "scheduled"].includes(article.status)) {
    report.blockers.push("Publicação exige estado approved ou scheduled elegível.");
  }
  if (article.isDemo)
    report.blockers.push("Conteúdo demo não pode ser tratado como publicação real.");
  if (!context.officialProduction) {
    report.blockers.push("Ambiente oficial e URL pública configurada são obrigatórios.");
  }
  if (article.status === "scheduled" && article.scheduledAt) {
    if (new Date(article.scheduledAt) > context.now) {
      report.blockers.push("Data agendada ainda não foi alcançada.");
    }
  }
  return report;
}

export function listArticles(files: readonly ParsedEditorialFile[]): string {
  const header =
    "slug | título | tipo | status | autor | categoria | demo | fontes | data | warnings";
  const rows = files.map(({ frontmatter: article }) => {
    const warnings =
      reviewArticle(article).warnings.length + reviewArticle(article).blockers.length;
    return [
      article.slug,
      article.title,
      article.contentType,
      article.status,
      article.author,
      article.category,
      article.isDemo ? "sim" : "não",
      String(article.sources.length),
      article.publishedAt ?? article.createdAt ?? "—",
      String(warnings),
    ].join(" | ");
  });
  return [header, ...rows].join("\n");
}

function setYamlField(source: string, field: string, value: string): string {
  const expression = new RegExp(`^${field}:.*$`, "m");
  if (expression.test(source)) return source.replace(expression, `${field}: ${value}`);
  return source.replace(/^status:.*$/m, (status) => `${status}\n${field}: ${value}`);
}

export function prepareStatusChange(
  source: string,
  target: ArticleStatus,
  context: OperationContext,
  authorDirectory: Readonly<Record<string, Author>> = authors,
  researchReport?: Pick<ResearchReport, "readyForWriting" | "blockers">,
): { content: string; summary: string } {
  const current = parseEditorialFile(source).frontmatter;
  if (!allowedTransitions[current.status].includes(target)) {
    throw new Error(`Transição inválida: ${current.status} → ${target}.`);
  }
  if (
    !current.isDemo &&
    target !== "draft" &&
    authorDirectory[current.author]?.status !== "verified"
  ) {
    throw new Error("Conteúdo real exige autor verified antes de sair de draft.");
  }
  if (!current.isDemo && current.status === "draft" && target === "review") {
    if (!researchReport?.readyForWriting) {
      throw new Error(
        `Pesquisa ainda não permite review: ${researchReport?.blockers.join(" ") ?? "briefing ausente."}`,
      );
    }
    if (current.draftStage !== "review-ready") {
      throw new Error("Draft deve estar em draftStage: review-ready antes do review.");
    }
    const report = reviewArticle(current, authorDirectory);
    if (report.blockers.length > 0) throw new Error(report.blockers.join("\n"));
  }

  let content = setYamlField(source, "status", target);
  const today = context.now.toISOString().slice(0, 10);
  if (target === "approved") content = setYamlField(content, "approvedAt", today);
  if (target === "published") {
    const report = publishCheck(current, context, authorDirectory);
    if (report.blockers.length > 0) throw new Error(report.blockers.join("\n"));
    content = setYamlField(content, "publishedAt", current.publishedAt ?? today);
  }
  if (target === "scheduled" && !current.scheduledAt) {
    throw new Error("Agendamento exige scheduledAt preenchido antes da transição.");
  }
  const parsedCandidate = parseEditorialFile(content).frontmatter;
  if (parsedCandidate.isDemo !== current.isDemo)
    throw new Error("A transição não pode alterar isDemo.");
  articleFrontmatterSchema.parse(parsedCandidate);
  return { content, summary: `${current.slug}: ${current.status} → ${target}; isDemo preservado.` };
}

function defaultContext(): OperationContext {
  const url = process.env.VITE_PUBLIC_SITE_URL;
  const publicUrl = Boolean(url && /^https:\/\//.test(url) && !url.includes("localhost"));
  return {
    now: new Date(),
    officialProduction: process.env.VITE_APP_ENV === "production" && publicUrl,
  };
}

function formatReport(report: ReviewReport): string {
  return [
    `Artigo: ${report.slug}`,
    ...report.checks.map((item) => `[ok] ${item}`),
    ...report.warnings.map((item) => `[warning] ${item}`),
    ...report.blockers.map((item) => `[erro] ${item}`),
    `Resumo: ${report.blockers.length} erro(s), ${report.warnings.length} warning(s).`,
  ].join("\n");
}

async function main(): Promise<void> {
  const [command, slug, target, ...options] = process.argv.slice(2);
  const files = await loadEditorialFiles();
  if (command === "list") return console.log(listArticles(files));
  const file = files.find((candidate) => candidate.frontmatter.slug === slug);
  if (!file) throw new Error(`Artigo não encontrado: ${slug ?? "(slug ausente)"}.`);
  if (command === "review") return console.log(formatReport(reviewArticle(file.frontmatter)));
  if (command === "publish-check") {
    const report = publishCheck(file.frontmatter, defaultContext());
    console.log(formatReport(report));
    if (report.blockers.length > 0) process.exitCode = 1;
    return;
  }
  if (command === "status") {
    if (!target) throw new Error("Informe o novo status.");
    const researchReport =
      file.frontmatter.status === "draft" && target === "review" && !file.frontmatter.isDemo
        ? evaluateResearch(await loadResearchBrief(file.frontmatter.slug))
        : undefined;
    const result = prepareStatusChange(
      await readFile(file.path, "utf8"),
      target as ArticleStatus,
      defaultContext(),
      authors,
      researchReport,
    );
    console.log(result.summary);
    if (!options.includes("--apply")) return console.log("Dry-run: use --apply para gravar.");
    await writeFile(file.path, result.content, "utf8");
    console.log("Status gravado. Revise o diff antes de continuar.");
    return;
  }
  throw new Error("Comando inválido. Use list, review, status ou publish-check.");
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(`[erro] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
