import { translationSchema, translationLocales } from "../src/content/translation-schema";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { isScalar, parseDocument } from "yaml";

import {
  articleFrontmatterSchema,
  sourceUrlDivergence,
  type ArticleFrontmatter,
  type ArticleStatus,
  type Author,
} from "../src/content/schema";
import { authors } from "../src/data/authors";
import { parseEditorialFile, type ParsedEditorialFile } from "./generate-content";
import {
  evaluateResearch,
  loadResearchBrief,
  residualRiskApprovalSchema,
  type ResidualRiskApproval,
  type ResearchReport,
} from "./research-operations";

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
  const paths = names.map((name) => join(directory, name));
  for (const locale of translationLocales) {
    const translatedDirectory = resolve(root, "content/translations", locale);
    if (existsSync(translatedDirectory))
      paths.push(
        ...(await readdir(translatedDirectory))
          .filter((name) => name.endsWith(".mdx"))
          .sort()
          .map((name) => join(translatedDirectory, name)),
      );
  }
  return Promise.all(
    paths.map(async (path) => {
      const name = basename(path);
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
  riskApproval?: ResidualRiskApproval,
): ReviewReport {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const checks = ["schema válido", "slug e taxonomia válidos"];
  if (
    "locale" in article &&
    translationSchema.parse(article).translationReview.status === "pending"
  )
    warnings.push("Tradução completa em draft; revisão editorial humana ainda pendente.");
  const decision = riskApproval ? residualRiskApprovalSchema.parse(riskApproval) : undefined;
  if (
    decision &&
    (decision.articleSlug !== article.slug ||
      authorDirectory[decision.responsible]?.status !== "verified")
  ) {
    blockers.push("Decisão de riscos exige escopo do artigo e responsável verified.");
  }
  const acceptsLicense =
    decision?.articleSlug === article.slug &&
    authorDirectory[decision.responsible]?.status === "verified" &&
    decision.acceptedRisks.some((risk) => risk.code === "image-license-documentation") &&
    article.cover.license === "pending" &&
    article.cover.aiProvenance?.status === "verified";
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
    if (acceptsLicense)
      warnings.push(
        `Documentação de licença pendente aceita por ${decision?.responsible}; proveniência registrada, sem atribuir licença.`,
      );
    else blockers.push("Imagem sem licença verificável.");
  }
  if (article.cover.src.includes("pendente")) warnings.push("Imagem ainda usa caminho provisório.");
  if (/\[RASCUNHO\]|provisóri|pendente/i.test(article.title))
    blockers.push("Título ainda é provisório.");
  if (!article.canonicalUrl) warnings.push("Canonical será derivado automaticamente do slug.");
  if ((article.sourceUrls?.length ?? 0) > 0) {
    warnings.push(
      sourceUrlDivergence(article)
        ? "sourceUrls diverge de sources e exige revisão editorial antes da migração."
        : "sourceUrls legado redundante deve migrar para sources.",
    );
  }
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
  riskApproval?: ResidualRiskApproval,
): ReviewReport {
  const report = reviewArticle(article, authorDirectory, riskApproval);
  if ("locale" in article) {
    const translation = translationSchema.parse(article);
    if (
      translation.translationReview.status !== "approved" ||
      !translation.translationReview.reviewer ||
      !translation.translationReview.reviewedAt
    )
      report.blockers.push("Tradução aguarda revisão editorial humana identificada.");
  }
  if (!article.isDemo && !["approved", "scheduled", "published"].includes(article.status)) {
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
  const match = source.match(/^(---\r?\n)([\s\S]*?)(\r?\n---(?:\r?\n|$))/);
  if (!match) throw new Error("Frontmatter delimitado por --- é obrigatório.");
  const header = match[2];
  const document = parseDocument(header);
  if (document.errors.length) throw new Error("Frontmatter inválido para escrita editorial.");
  const node = document.get(field, true);
  let updated: string;
  if (isScalar(node) && node.range) {
    // Alter only the top-level scalar, retaining all other bytes and comments.
    updated = header.slice(0, node.range[0]) + JSON.stringify(value) + header.slice(node.range[1]);
  } else if (node !== undefined) {
    throw new Error(`Campo editorial ${field} deve ser escalar.`);
  } else if (header.trimStart().startsWith("{")) {
    const end = header.lastIndexOf("}");
    const newline = header.includes("\r\n") ? "\r\n" : "\n";
    updated =
      header.slice(0, end).trimEnd() +
      `,${newline}  ${JSON.stringify(field)}: ${JSON.stringify(value)}${newline}` +
      header.slice(end);
  } else {
    const newline = header.includes("\r\n") ? "\r\n" : "\n";
    updated = header + `${newline}${field}: ${JSON.stringify(value)}`;
  }
  return match[1] + updated + source.slice(match[1].length + header.length);
}

export async function persistStatusChange(
  path: string,
  content: string,
  target: ArticleStatus,
  io = { readFile, writeFile },
): Promise<void> {
  try {
    await io.writeFile(path, content, "utf8");
    const persisted = parseEditorialFile(await io.readFile(path, "utf8"), path).frontmatter;
    if (persisted.status !== target) {
      throw new Error(`Status persistido ${persisted.status}; solicitado ${target}.`);
    }
  } catch (error) {
    throw new Error(
      `Falha ao persistir transição editorial: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function prepareStatusChange(
  source: string,
  target: ArticleStatus,
  context: OperationContext,
  authorDirectory: Readonly<Record<string, Author>> = authors,
  researchReport?: Pick<ResearchReport, "readyForWriting" | "blockers"> &
    Partial<Pick<ResearchReport, "readyForReview" | "riskApproval">>,
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
    if (
      !researchReport?.readyForWriting &&
      !(researchReport?.readyForReview && researchReport.riskApproval)
    ) {
      throw new Error(
        `Pesquisa ainda não permite review: ${researchReport?.blockers.join(" ") ?? "briefing ausente."}`,
      );
    }
    if (current.draftStage !== "review-ready") {
      throw new Error("Draft deve estar em draftStage: review-ready antes do review.");
    }
    const report = reviewArticle(
      current,
      authorDirectory,
      "locale" in current ? undefined : researchReport?.riskApproval,
    );
    if (report.blockers.length > 0) throw new Error(report.blockers.join("\n"));
  }

  let content = setYamlField(source, "status", target);
  const today = context.now.toISOString().slice(0, 10);
  if (target === "approved") content = setYamlField(content, "approvedAt", today);
  if (target === "published") {
    const report = publishCheck(current, context, authorDirectory, researchReport?.riskApproval);
    if (report.blockers.length > 0) throw new Error(report.blockers.join("\n"));
    content = setYamlField(content, "publishedAt", current.publishedAt ?? today);
  }
  if (target === "scheduled" && !current.scheduledAt) {
    throw new Error("Agendamento exige scheduledAt preenchido antes da transição.");
  }
  const parsedCandidate = parseEditorialFile(content).frontmatter;
  if (parsedCandidate.status !== target) throw new Error("Status preparado difere do solicitado.");
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
  const candidates = files.filter(
    (candidate) =>
      candidate.frontmatter.slug === slug ||
      ("locale" in candidate.frontmatter &&
        `${candidate.frontmatter.locale}:${candidate.frontmatter.slug}` === slug),
  );
  if (candidates.length > 1)
    throw new Error("Slug ambíguo; informe en:slug ou es:slug para selecionar a edição.");
  const file = candidates[0];
  if (!file) throw new Error(`Artigo não encontrado: ${slug ?? "(slug ausente)"}.`);
  const translation =
    "locale" in file.frontmatter ? translationSchema.parse(file.frontmatter) : undefined;
  // A translation reuses the scientific brief for the exact source revision. Its language review is a separate gate.
  const researchSlug = translation?.translationOf ?? file.frontmatter.slug;
  const researchReport = existsSync(resolve("content/research", `${researchSlug}.yml`))
    ? evaluateResearch(await loadResearchBrief(researchSlug))
    : undefined;
  // Never relabel the source's residual-risk decision as approval of a translation.
  const articleRiskApproval = translation ? undefined : researchReport?.riskApproval;
  if (researchReport?.riskApproval && !researchReport.readyForReview) {
    throw new Error(
      `Decisão não supera impedimentos restantes: ${researchReport.blockers.join(" ")}`,
    );
  }
  if (command === "review")
    return console.log(formatReport(reviewArticle(file.frontmatter, authors, articleRiskApproval)));
  if (command === "publish-check") {
    const report = publishCheck(file.frontmatter, defaultContext(), authors, articleRiskApproval);
    console.log(formatReport(report));
    if (report.blockers.length > 0) process.exitCode = 1;
    return;
  }
  if (command === "status") {
    if (!target) throw new Error("Informe o novo status.");
    const result = prepareStatusChange(
      await readFile(file.path, "utf8"),
      target as ArticleStatus,
      defaultContext(),
      authors,
      researchReport,
    );
    if (!options.includes("--apply")) {
      console.log(result.summary);
      return console.log("Dry-run: use --apply para gravar.");
    }
    await persistStatusChange(file.path, result.content, target as ArticleStatus);
    console.log(result.summary);
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
