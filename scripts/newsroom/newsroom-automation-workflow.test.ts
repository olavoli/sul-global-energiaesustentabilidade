import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { applyHumanDecision } from "./decision-actions";
import { buildCoverageReport } from "./coverage";
import { buildDailyReport, reportMarkdown } from "./daily-report";
import { executeDailyPipeline } from "./daily-pipeline";
import { loadDecisions, loadPitches, mergeEvaluations } from "./decision-store";
import { DisabledNotificationProvider, FileNotificationProvider } from "./notifications";
import { buildCleanupPlan } from "./retention";
import { buildInbox, updateInboxEntry } from "./review-inbox";
import { createRun, finishRun, initializeStages } from "./run-store";
import { loadCatalog } from "./catalog";
import { loadQueue } from "./queue";
import { loadRuntime } from "./runtime";
import { loadClusters, loadEvidencePackages } from "./story-store";
import { loadTranslations } from "./translation";

const temporary: string[] = [];
afterEach(async () => {
  await Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

async function tempDirectory(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), "newsroom-workflow-"));
  temporary.push(path);
  return path;
}

const NOW = new Date("2026-07-15T13:00:00.000Z");

async function sampleReport() {
  const [runtimes, clusters, decisions, translations, catalog, queue] = await Promise.all([
    loadRuntime(),
    loadClusters(),
    loadDecisions(),
    loadTranslations(),
    loadCatalog(),
    loadQueue(),
  ]);
  const run = initializeStages(
    createRun({
      mode: "dry-run",
      environment: "test",
      actor: "test",
      now: NOW,
      configurationVersion: "v1",
      policyVersion: "p1",
    }),
  );
  return buildDailyReport({
    run,
    runtimes,
    clusters,
    decisions,
    translations,
    coverage: buildCoverageReport(catalog, queue),
    now: NOW,
  });
}

describe("Sprint 16 â€” recuperaÃ§Ã£o, relatÃ³rio e proteÃ§Ãµes", () => {
  test("19. recuperaÃ§Ã£o nÃ£o duplica decisÃµes", async () => {
    const decisions = await loadDecisions();
    expect(mergeEvaluations(decisions, decisions)).toHaveLength(decisions.length);
  });

  test("20. cancelamento preserva estado concluÃ­do", () => {
    const run = initializeStages(
      createRun({
        mode: "apply",
        environment: "test",
        actor: "test",
        now: NOW,
        configurationVersion: "v1",
        policyVersion: "p1",
      }),
    );
    const cancelled = finishRun(run, "cancelled", NOW, "operador");
    expect(cancelled.stages).toEqual(run.stages);
    expect(cancelled.stopReason).toBe("operador");
  });

  test("21. relatÃ³rio nÃ£o contÃ©m texto integral", async () => {
    const report = await sampleReport();
    const output = `${JSON.stringify(report)}${reportMarkdown(report)}`;
    expect(output).not.toContain("contentSnippet");
    expect(output).not.toContain("sourceText");
  });

  test("22. inbox nÃ£o publica", async () => {
    const [decisions, clusters, packages, translations] = await Promise.all([
      loadDecisions(),
      loadClusters(),
      loadEvidencePackages(),
      loadTranslations(),
    ]);
    const inbox = buildInbox(decisions, clusters, packages, translations);
    expect(JSON.stringify(inbox)).not.toContain('"publish"');
    expect(inbox).toHaveLength(decisions.length);
  });

  test("23. inbox exige ator", async () => {
    const [decision] = await loadDecisions();
    const [cluster] = (await loadClusters()).filter(({ id }) => id === decision.clusterId);
    const [evidence] = (await loadEvidencePackages()).filter(
      ({ clusterId }) => clusterId === decision.clusterId,
    );
    const [entry] = buildInbox([decision], [cluster], [evidence], await loadTranslations());
    expect(() => updateInboxEntry(entry, "opened", "", "", NOW.toISOString())).toThrow("actor");
  });

  test("24. notificaÃ§Ã£o desativada nÃ£o envia", async () => {
    expect(
      await new DisabledNotificationProvider().notify({
        runId: "run",
        status: "completed",
        reviewsPending: 0,
        highRisks: 0,
      }),
    ).toBeFalse();
  });

  test("25. provider de arquivo recebe somente resumo", async () => {
    const root = await tempDirectory();
    const path = join(root, "notification.jsonl");
    await new FileNotificationProvider(path).notify({
      runId: "run-1",
      status: "completed",
      reviewsPending: 3,
      highRisks: 1,
    });
    const output = await readFile(path, "utf8");
    expect(output).toContain("run-1");
    expect(output).not.toContain("snippet");
  });

  test("26. schedule desativado nÃ£o executa apply", async () => {
    const workflow = await readFile(".github/workflows/newsroom-daily.yml", "utf8");
    expect(workflow).toContain("vars.NEWSROOM_SCHEDULE_ENABLED == 'true'");
    expect(workflow).toContain("dry_run");
  });

  test("27. workflow nÃ£o faz deploy", async () => {
    const workflow = await readFile(".github/workflows/newsroom-daily.yml", "utf8");
    expect(workflow).not.toMatch(/\bdeploy\b/i);
  });

  test("28. workflow nÃ£o faz commit", async () => {
    const workflow = await readFile(".github/workflows/newsroom-daily.yml", "utf8");
    expect(workflow).not.toMatch(/git\s+(commit|push)/i);
  });

  test("29. cleanup Ã© dry-run por construÃ§Ã£o", async () => {
    const plan = buildCleanupPlan([], [], await loadDecisions(), {
      now: NOW,
      runsDays: 90,
      resolvedInboxDays: 90,
    });
    expect(plan.runIds).toEqual([]);
  });

  test("30. retenÃ§Ã£o preserva decisÃµes humanas", async () => {
    const decision = (await loadDecisions()).find(({ blockers }) => blockers.length === 0);
    if (!decision) throw new Error("Fixture sem decisÃ£o elegÃ­vel.");
    const reviewed = applyHumanDecision(
      decision,
      "monitor",
      "founder",
      "preservar",
      NOW.toISOString(),
    );
    const plan = buildCleanupPlan([], [], [reviewed], {
      now: NOW,
      runsDays: 1,
      resolvedInboxDays: 1,
    });
    expect(plan.protectedDecisionIds).toContain(reviewed.id);
  });

  test("31. dados operacionais ficam fora do bundle", async () => {
    const files = [...new Bun.Glob(".output/public/**/*").scanSync()].filter(
      (path) => !path.endsWith("/"),
    );
    const matches = await Promise.all(
      files.map(async (path) => (await Bun.file(path).text()).includes("newsroom/runs")),
    );
    expect(matches.some(Boolean)).toBeFalse();
  });

  test("32. execuÃ§Ã£o offline funciona", async () => {
    const result = await executeDailyPipeline({
      mode: "process-existing",
      actor: "offline-test",
      now: NOW,
      env: {
        NEWSROOM_COLLECTION_ENABLED: "false",
        NEWSROOM_ORCHESTRATION_ENABLED: "false",
      },
    });
    expect(result.run.stages.find(({ name }) => name === "collection")?.status).toBe("skipped");
    expect(result.run.errors).toEqual([]);
  });

  test("33. nenhuma pauta Ã© criada automaticamente", async () => {
    const before = await loadPitches();
    await executeDailyPipeline({ mode: "process-existing", actor: "test", now: NOW, env: {} });
    expect(await loadPitches()).toEqual(before);
  });

  test("34. nenhum artigo Ã© criado", async () => {
    const before = await readFile("src/content/generated/articles.ts", "utf8");
    await executeDailyPipeline({ mode: "process-existing", actor: "test", now: NOW, env: {} });
    expect(await readFile("src/content/generated/articles.ts", "utf8")).toBe(before);
  });

  test("35. Olavo permanece verificado", async () => {
    const authors = JSON.parse(await readFile("content/authors.json", "utf8")) as Array<{
      slug: string;
      status: string;
      isDemo: boolean;
    }>;
    expect(authors.find(({ slug }) => slug === "olavo-oliveira")).toMatchObject({
      status: "verified",
      isDemo: false,
    });
  });

  test("36. artigo piloto permanece invisÃ­vel", async () => {
    const pilot = await readFile(
      "content/articles/rascunho-como-funciona-matriz-eletrica-brasileira.mdx",
      "utf8",
    );
    expect(pilot).toContain("status: draft");
    expect(pilot).toContain("isDemo: false");
  });
});
