import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createAudit } from "./audit";
import { saveDocument, loadDocument } from "./atomic-store";
import { clusterQueue } from "./clustering";
import { NOW, item, source } from "./story-test-fixtures";
import {
  glossaryVersion,
  queueTranslation,
  reviewTranslation,
  runTranslation,
} from "./translation";
import { runQualityChecks } from "./translation-quality";
import {
  externalPlaceholderProvider,
  fixtureProvider,
  passthroughProvider,
  translationProvider,
} from "./translation-providers";
import { translationDocumentSchema } from "./translation-schema";

const cluster = clusterQueue(
  [item("a", "How data centers can better manage energy use")],
  [source("source-a")],
  NOW,
)[0];

describe("Sprint 14 — tradução, persistência e guardrails", () => {
  test("21. provider fixture traduz deterministicamente e offline", async () => {
    expect(await fixtureProvider.translate(cluster.canonicalTitle, "en")).toBe(
      await fixtureProvider.translate(cluster.canonicalTitle, "en"),
    );
  });

  test("22. passthrough mantém texto pt-BR", async () => {
    expect(await passthroughProvider.translate("energia renovável", "pt-BR")).toBe(
      "energia renovável",
    );
  });

  test("23. provider externo permanece desabilitado", () => {
    expect(externalPlaceholderProvider.enabled).toBeFalse();
    expect(() => translationProvider("external-placeholder")).toThrow("desabilitado");
  });

  test("24. QA detecta divergência de números", () => {
    expect(
      runQualityChecks("output 40 MW", "produção 50 MW").find(({ name }) => name === "números")
        ?.passed,
    ).toBeFalse();
  });

  test("25. QA preserva unidades", () => {
    expect(
      runQualityChecks("output 40 MW", "produção de 40 MW").find(({ name }) => name === "unidades")
        ?.passed,
    ).toBeTrue();
  });

  test("26. QA preserva datas e URLs", () => {
    const checks = runQualityChecks(
      "2026-07-15 https://example.test",
      "em 2026-07-15 de https://example.test",
    );
    expect(
      checks.filter(({ name }) => ["datas", "URLs"].includes(name)).every(({ passed }) => passed),
    ).toBeTrue();
  });

  test("27. QA preserva siglas, nomes próprios e verifica idioma-alvo", () => {
    const checks = runQualityChecks("Study by NASA and Olavo", "Estudo da NASA e Olavo");
    expect(
      checks
        .filter(({ name }) => ["siglas", "nomes próprios", "idioma-alvo"].includes(name))
        .every(({ passed }) => passed),
    ).toBeTrue();
  });

  test("28. glossário técnico é versionado", async () => {
    expect(await glossaryVersion()).toBe("pt-BR-energy-v1");
  });

  test("29. tradução preserva o original imutável", async () => {
    const queued = (await queueTranslation(cluster, [], NOW, "editor"))[0];
    const translated = await runTranslation(queued, NOW, "editor");
    expect(translated.sourceText).toBe(queued.sourceText);
    expect(translated.status).toBe("review-required");
  });

  test("30. demonstração limita execução a três fixtures conhecidas", async () => {
    const titles = [
      cluster.canonicalTitle,
      "MIT researchers develop a low-cost technique to get lithium out of rocks",
      "Turning extreme heat into large-scale energy storage",
    ];
    const results = await Promise.all(
      titles.map((title) => fixtureProvider.translate(title, "en")),
    );
    expect(results).toHaveLength(3);
    expect(fixtureProvider.translate("fourth text", "en")).rejects.toThrow("três entradas");
  });

  test("31. aprovação exige revisão humana identificada", async () => {
    const translated = await runTranslation(
      (await queueTranslation(cluster, [], NOW, "editor"))[0],
      NOW,
      "editor",
    );
    expect(() => reviewTranslation(translated, "approve", "", "ok", NOW)).toThrow("ator");
    expect(reviewTranslation(translated, "approve", "olavo", "revisado", NOW).status).toBe(
      "approved",
    );
  });

  test("32. rejeição e retry são auditáveis", async () => {
    const translated = await runTranslation(
      (await queueTranslation(cluster, [], NOW, "editor"))[0],
      NOW,
      "editor",
    );
    const rejected = reviewTranslation(translated, "reject", "olavo", "terminologia", NOW);
    expect(rejected.status).toBe("rejected");
    expect(
      reviewTranslation(rejected, "retry", "olavo", "corrigir", NOW).history.at(-1)?.action,
    ).toBe("retry");
  });

  test("33. persistência versionada é atômica e recuperável", async () => {
    const directory = await mkdtemp(join(tmpdir(), "newsroom-story-"));
    const path = join(directory, "translations.json");
    const document = { version: 1 as const, entries: [] };
    await saveDocument(path, translationDocumentSchema, document);
    expect(await loadDocument(path, translationDocumentSchema, document)).toEqual(document);
    expect(JSON.parse(await readFile(path, "utf8")).version).toBe(1);
    await rm(directory, { recursive: true, force: true });
  });

  test("34. auditoria registra novos contadores sem publicar", () => {
    const audit = createAudit("cluster", "editor", true, Date.now(), {
      itemsRead: 30,
      clustersCreated: 30,
      translationsQueued: 3,
    });
    expect(audit).toMatchObject({
      itemsRead: 30,
      clustersCreated: 30,
      translationsQueued: 3,
      dryRun: true,
    });
    expect(JSON.stringify(audit)).not.toContain("articlePublished");
  });
});
