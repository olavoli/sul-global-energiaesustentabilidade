import type { CoverageReport } from "./coverage";
import { dailyReportSchema, type DailyNewsroomReport, type NewsroomRun } from "./automation-schema";
import type { EditorialDecision } from "./orchestrator-schema";
import type { SourceRuntime } from "./schema";
import type { StoryCluster } from "./story-schema";
import type { TranslationEntry } from "./translation-schema";
import { sha256 } from "./storage/sha256";
import { storageAdapter } from "./storage/runtime";

function counts(values: string[]): Record<string, number> {
  const result: Record<string, number> = {};
  values.forEach((value) => (result[value] = (result[value] ?? 0) + 1));
  return result;
}

export function buildDailyReport(input: {
  run: NewsroomRun;
  runtimes: SourceRuntime[];
  clusters: StoryCluster[];
  decisions: EditorialDecision[];
  translations: TranslationEntry[];
  coverage: CoverageReport;
  now: Date;
}): DailyNewsroomReport {
  const healthy = input.runtimes.filter(({ health }) => health?.status === "healthy").length;
  const degraded = input.runtimes.filter(({ health }) =>
    ["degraded", "stale", "invalid", "unknown"].includes(health?.status ?? "unknown"),
  ).length;
  const high = input.decisions.filter(({ riskLevel }) => ["high", "critical"].includes(riskLevel));
  return dailyReportSchema.parse({
    version: 1,
    date: input.now.toISOString().slice(0, 10),
    runId: input.run.id,
    generatedAt: input.now.toISOString(),
    sourcesChecked: input.runtimes.length,
    sourcesHealthy: healthy,
    sourcesDegraded: degraded,
    itemsCollected: input.run.itemsFetched,
    newItems: input.run.itemsAccepted,
    duplicates: input.run.duplicates,
    quarantined: input.run.quarantined,
    clusters: input.clusters.length,
    priorities: input.decisions.filter(({ recommendation }) => recommendation === "prepare-pitch")
      .length,
    reviews: input.decisions.filter(({ status }) => status === "human-review-required").length,
    monitoring: input.decisions.filter(({ status }) => status === "monitoring").length,
    translationsPending: input.translations.filter(({ status }) =>
      ["queued", "review-required", "failed"].includes(status),
    ).length,
    highRisks: high.length,
    blockers: counts(input.decisions.flatMap(({ blockers }) => blockers)),
    coverage: input.coverage.regions,
    gaps: input.coverage.alerts,
    failures: input.run.errors,
    recommendedActions: [
      ...(input.decisions.some(({ warnings }) => warnings.includes("single-source"))
        ? ["Buscar confirmaÃ§Ã£o institucional independente."]
        : []),
      ...(input.translations.some(({ status }) => status === "review-required")
        ? ["Revisar traduÃ§Ãµes pendentes comparando com o original."]
        : []),
      ...(high.length ? ["Priorizar revisÃ£o humana dos riscos altos."] : []),
    ],
    internalIds: [input.run.id, ...high.map(({ id }) => id)],
    summary: `${input.clusters.length} clusters; ${input.decisions.length} decisÃµes; nenhuma publicaÃ§Ã£o ou aprovaÃ§Ã£o automÃ¡tica.`,
  });
}

export function reportMarkdown(report: DailyNewsroomReport): string {
  return [
    `# RelatÃ³rio da newsroom â€” ${report.date}`,
    "",
    `ExecuÃ§Ã£o: \`${report.runId}\``,
    `Resumo: ${report.summary}`,
    "",
    `- Fontes verificadas: ${report.sourcesChecked} (${report.sourcesHealthy} saudÃ¡veis; ${report.sourcesDegraded} degradadas)`,
    `- Itens: ${report.itemsCollected} recebidos; ${report.newItems} novos; ${report.duplicates} duplicatas`,
    `- Clusters: ${report.clusters}; revisÃµes: ${report.reviews}; riscos altos: ${report.highRisks}`,
    `- TraduÃ§Ãµes pendentes: ${report.translationsPending}; quarentena: ${report.quarantined}`,
    "",
    "## AÃ§Ãµes recomendadas",
    "",
    ...(report.recommendedActions.length
      ? report.recommendedActions.map((value) => `- ${value}`)
      : ["- Nenhuma aÃ§Ã£o automÃ¡tica."]),
    "",
    "> RelatÃ³rio operacional privado. NÃ£o Ã© pauta, artigo ou autorizaÃ§Ã£o de publicaÃ§Ã£o.",
    "",
  ].join("\n");
}

export async function saveDailyReport(
  report: DailyNewsroomReport,
  root = "newsroom/reports",
): Promise<{ json: string; markdown: string }> {
  void root;
  const base = `reports/${report.date}-${report.runId}`;
  const json = `${base}.json`;
  const markdown = `${base}.md`;
  const jsonBody = `${JSON.stringify(dailyReportSchema.parse(report), null, 2)}\n`;
  const markdownBody = reportMarkdown(report);
  await Promise.all([
    storageAdapter().putObject({
      key: json,
      body: jsonBody,
      contentType: "application/json; charset=utf-8",
      hash: await sha256(jsonBody),
      size: new TextEncoder().encode(jsonBody).byteLength,
      createdAt: report.generatedAt,
    }),
    storageAdapter().putObject({
      key: markdown,
      body: markdownBody,
      contentType: "text/markdown; charset=utf-8",
      hash: await sha256(markdownBody),
      size: new TextEncoder().encode(markdownBody).byteLength,
      createdAt: report.generatedAt,
    }),
  ]);
  return { json, markdown };
}
