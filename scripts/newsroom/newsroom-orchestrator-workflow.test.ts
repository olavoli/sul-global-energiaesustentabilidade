import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { parseEditorialFile } from "../generate-content";
import { getPublicAuthor } from "../../src/data/authors";
import { saveDocument, loadDocument } from "./atomic-store";
import { applyHumanDecision } from "./decision-actions";
import { decisionDocumentSchema } from "./orchestrator-schema";
import { calculateOrchestratorMetrics } from "./orchestrator-metrics";
import { orchestrate } from "./orchestrator";
import { evaluatedFixture, orchestratorFixture } from "./orchestrator-test-fixtures";
import { createPitch, updatePitch } from "./pitch";
import { NOW } from "./story-test-fixtures";

describe("Sprint 15 — fila, pauta e proteção", () => {
  test("19. persistência aplicada usa schema versionado", async () => {
    const directory = await mkdtemp(join(tmpdir(), "decisions-"));
    const path = join(directory, "index.json");
    const { decision } = await evaluatedFixture();
    const document = {
      version: 1 as const,
      policyVersion: decision.policyVersion,
      decisions: [decision],
    };
    await saveDocument(path, decisionDocumentSchema, document);
    expect(await loadDocument(path, decisionDocumentSchema, document)).toEqual(document);
    await rm(directory, { recursive: true, force: true });
  });

  test("20. revisão preserva URLs originais", async () => {
    const { input } = await evaluatedFixture();
    expect(input.evidence.originalUrls[0]).toStartWith("https://");
  });

  test("21. approve-for-pitch não cria artigo", async () => {
    const { decision } = await evaluatedFixture();
    const approved = applyHumanDecision(
      decision,
      "approve-for-pitch",
      "editor",
      "apto para pauta",
      NOW,
    );
    expect(approved.status).toBe("approved-for-pitch");
    expect(JSON.stringify(approved)).not.toContain("mdx");
  });

  test("22. pauta preserva incertezas", async () => {
    const { input, decision } = await evaluatedFixture();
    const approved = applyHumanDecision(decision, "approve-for-pitch", "editor", "apto", NOW);
    expect(
      createPitch(approved, input.cluster, input.evidence, [], "editor", NOW).uncertainties,
    ).toEqual(input.evidence.uncertainties);
  });

  test("23. pauta não transforma claim em fato", async () => {
    const { input, decision } = await evaluatedFixture();
    const approved = applyHumanDecision(decision, "approve-for-pitch", "editor", "apto", NOW);
    const pitch = createPitch(approved, input.cluster, input.evidence, [], "editor", NOW);
    expect(pitch.knownFacts).toEqual([]);
    expect(pitch.unverifiedClaims).toContain(input.claims[0].text);
  });

  test("24. pauta não copia snippet como matéria", async () => {
    const { input, decision } = await evaluatedFixture();
    const approved = applyHumanDecision(decision, "approve-for-pitch", "editor", "apto", NOW);
    const pitch = createPitch(approved, input.cluster, input.evidence, [], "editor", NOW);
    expect(JSON.stringify(pitch)).not.toContain("contentSnippet");
    expect(pitch.suggestedSections.length).toBeLessThanOrEqual(3);
  });

  test("25. mudança de cluster pede nova avaliação", async () => {
    const input = await orchestratorFixture();
    const first = orchestrate(input);
    const second = orchestrate({
      ...input,
      cluster: { ...input.cluster, canonicalTitle: `${input.cluster.canonicalTitle} updated` },
    });
    expect(second.inputFingerprint).not.toBe(first.inputFingerprint);
  });

  test("26. atualização de pauta preserva histórico", async () => {
    const { input, decision } = await evaluatedFixture();
    const approved = applyHumanDecision(decision, "approve-for-pitch", "editor", "apto", NOW);
    const pitch = createPitch(approved, input.cluster, input.evidence, [], "editor", NOW);
    expect(updatePitch(pitch, "editor", "nova fonte", NOW).history).toHaveLength(2);
  });

  test("27. tema sensível exige revisão", async () => {
    const input = await orchestratorFixture("War sanctions affect energy markets");
    const decision = orchestrate(input);
    expect(decision.risks.political.level).toBe("high");
    expect(decision.status).toBe("human-review-required");
  });

  test("28. métrica não altera decisão", async () => {
    const { decision } = await evaluatedFixture();
    const before = structuredClone(decision);
    calculateOrchestratorMetrics([decision]);
    expect(decision).toEqual(before);
  });

  test("29. dados do orquestrador ficam fora do bundle público", async () => {
    const files = [...new Bun.Glob(".output/public/**/*").scanSync()].filter(
      (path) => !path.endsWith("/"),
    );
    const matches = await Promise.all(
      files.map(async (path) =>
        (await Bun.file(path).text()).includes("decision-0123456789abcdef"),
      ),
    );
    expect(matches.some(Boolean)).toBeFalse();
  });

  test("30. execução offline funciona", async () => {
    expect((await evaluatedFixture()).decision.id).toStartWith("decision-");
  });

  test("31. nenhum provider externo é chamado", async () => {
    const input = await orchestratorFixture();
    const before = structuredClone(input.translations);
    orchestrate(input);
    expect(input.translations).toEqual(before);
  });

  test("32. Olavo permanece verificado", () => {
    expect(getPublicAuthor("olavo-oliveira", false)?.status).toBe("verified");
  });

  test("33. artigo piloto permanece invisível", async () => {
    const text = await readFile(
      "content/articles/rascunho-como-funciona-matriz-eletrica-brasileira.mdx",
      "utf8",
    );
    expect(parseEditorialFile(text).frontmatter.status).toBe("draft");
  });

  test("34. amostra não cria pauta automaticamente", async () => {
    const { decision } = await evaluatedFixture();
    expect(decision.status).not.toBe("approved-for-pitch");
    expect(JSON.stringify(decision)).not.toContain("pitch-created");
  });
});
