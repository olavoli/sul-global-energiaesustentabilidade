import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { parse } from "yaml";
import { z } from "zod";

const optionalText = z.string().trim().min(1).nullish();
const sourceReferenceSchema = z.object({
  title: z.string().trim().min(1),
  url: z.url(),
});

export const researchStatuses = [
  "not-started",
  "researching",
  "sources-collected",
  "fact-checking",
  "ready-for-writing",
  "blocked",
] as const;

export const researchBriefSchema = z.object({
  articleSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  researchQuestion: optionalText,
  scope: optionalText,
  audience: optionalText,
  keyQuestions: z.array(z.string().trim().min(1)),
  requiredData: z.array(z.string().trim().min(1)),
  requiredSourceTypes: z.array(z.string().trim().min(1)),
  candidateSources: z.array(
    sourceReferenceSchema.extend({ note: z.string().trim().min(1).optional() }),
  ),
  confirmedSources: z.array(
    sourceReferenceSchema.extend({
      organization: z.string().trim().min(1),
      verifiedAt: z.iso.date(),
    }),
  ),
  rejectedSources: z.array(sourceReferenceSchema.extend({ reason: z.string().trim().min(1) })),
  openQuestions: z.array(z.string().trim().min(1)),
  factChecks: z.array(
    z.object({
      statement: z.string().trim().min(1),
      status: z.enum(["pending", "confirmed"]),
      sourceUrls: z.array(z.url()),
    }),
  ),
  imageRequirements: z.object({
    origin: optionalText,
    license: optionalText,
    authorization: optionalText,
    credit: optionalText,
    alt: optionalText,
    width: z.number().int().positive().nullish(),
    height: z.number().int().positive().nullish(),
    aspectRatio: optionalText,
    socialVersion: optionalText,
    usageRisk: optionalText,
    isDemoConfirmed: z.boolean(),
  }),
  conflictsOfInterestEvaluated: z.boolean(),
  editorialRisks: z.array(z.string().trim().min(1)),
  researchStatus: z.enum(researchStatuses),
});

export type ResearchBrief = z.infer<typeof researchBriefSchema>;

export interface ResearchReport {
  slug: string;
  status: string;
  candidateCount: number;
  confirmedCount: number;
  openQuestionCount: number;
  blockers: string[];
  warnings: string[];
  nextAction: string;
  readyForWriting: boolean;
}

export function evaluateResearch(input: unknown): ResearchReport {
  const parsed = researchBriefSchema.safeParse(input);
  if (!parsed.success) {
    return {
      slug: "desconhecido",
      status: "inválido",
      candidateCount: 0,
      confirmedCount: 0,
      openQuestionCount: 0,
      blockers: parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "arquivo"}: ${issue.message}`,
      ),
      warnings: [],
      nextAction: "Corrigir o schema do briefing.",
      readyForWriting: false,
    };
  }

  const brief = parsed.data;
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!brief.researchQuestion) blockers.push("Definir a pergunta central.");
  if (!brief.scope) blockers.push("Definir o escopo da pesquisa.");
  if (!brief.audience) blockers.push("Definir o público do artigo.");
  if (brief.keyQuestions.length === 0) blockers.push("Registrar questões de pesquisa.");
  if (brief.requiredSourceTypes.length === 0) blockers.push("Definir tipos de fonte necessários.");
  if (brief.confirmedSources.length === 0) blockers.push("Confirmar ao menos uma fonte real.");
  if (brief.factChecks.length === 0) blockers.push("Registrar os fact-checks necessários.");
  if (
    brief.factChecks.some((check) => check.status !== "confirmed" || check.sourceUrls.length === 0)
  ) {
    blockers.push("Resolver fact-checks pendentes com fontes confirmadas.");
  }
  if (brief.openQuestions.length > 0) blockers.push("Resolver perguntas abertas.");
  const image = brief.imageRequirements;
  if (!image.origin) blockers.push("Definir origem da imagem.");
  if (!image.license) blockers.push("Definir licença da imagem.");
  if (!image.authorization) blockers.push("Confirmar autorização da imagem.");
  if (!image.credit || !image.alt) blockers.push("Definir crédito e texto alternativo da imagem.");
  if (!image.width || !image.height || !image.aspectRatio) {
    blockers.push("Registrar dimensões e proporção da imagem.");
  }
  if (!image.socialVersion || !image.usageRisk) {
    blockers.push("Avaliar versão social e risco de uso da imagem.");
  }
  if (!image.isDemoConfirmed) blockers.push("Confirmar que a imagem não é demo.");
  if (!brief.conflictsOfInterestEvaluated) {
    blockers.push("Avaliar conflitos de interesse.");
  }
  if (brief.candidateSources.length > 0 && brief.confirmedSources.length === 0) {
    warnings.push("Fontes candidatas não contam como fontes confirmadas.");
  }
  if (brief.rejectedSources.length > 0) {
    warnings.push("Fontes rejeitadas permanecem apenas no histórico de pesquisa.");
  }
  if (brief.researchStatus !== "ready-for-writing") {
    blockers.push("researchStatus ainda não é ready-for-writing.");
  }
  const readyForWriting = blockers.length === 0;
  const nextAction = readyForWriting
    ? "Iniciar draft factual; publicação e review continuam bloqueados."
    : brief.researchStatus === "not-started"
      ? "Preencher pergunta, escopo e plano de fontes sem redigir fatos."
      : "Resolver os bloqueadores listados antes da redação factual.";
  return {
    slug: brief.articleSlug,
    status: brief.researchStatus,
    candidateCount: brief.candidateSources.length,
    confirmedCount: brief.confirmedSources.length,
    openQuestionCount: brief.openQuestions.length,
    blockers,
    warnings,
    nextAction,
    readyForWriting,
  };
}

export async function loadResearchBrief(slug: string, root = process.cwd()): Promise<unknown> {
  const path = resolve(root, "content/research", `${slug}.yml`);
  try {
    return parse(await readFile(path, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Briefing de pesquisa não encontrado para ${slug}.`);
    }
    throw error;
  }
}

function printReport(report: ResearchReport): void {
  console.log(`Artigo: ${report.slug}`);
  console.log(`Estado: ${report.status}`);
  console.log(`Fontes candidatas: ${report.candidateCount}`);
  console.log(`Fontes confirmadas: ${report.confirmedCount}`);
  console.log(`Perguntas abertas: ${report.openQuestionCount}`);
  report.warnings.forEach((warning) => console.log(`[warning] ${warning}`));
  report.blockers.forEach((blocker) => console.log(`[erro] ${blocker}`));
  console.log(`Próxima ação: ${report.nextAction}`);
}

async function main(): Promise<void> {
  const [command, slug] = process.argv.slice(2);
  if (!slug) throw new Error("Informe o slug do artigo.");
  const report = evaluateResearch(await loadResearchBrief(slug));
  if (command === "status") return printReport(report);
  if (command === "validate") {
    printReport(report);
    if (!report.readyForWriting) process.exitCode = 1;
    return;
  }
  throw new Error("Comando inválido. Use validate ou status.");
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(`[erro] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
