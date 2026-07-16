import { describe, expect, test } from "bun:test";

import { applyHumanDecision } from "./decision-actions";
import { mergeEvaluations } from "./decision-store";
import { orchestrate } from "./orchestrator";
import {
  evaluatedFixture,
  orchestratorFixture,
  pendingTranslation,
} from "./orchestrator-test-fixtures";
import { NOW } from "./story-test-fixtures";

describe("Sprint 15 — decisão e prontidão", () => {
  test("1. mesma entrada produz mesma decisão", async () => {
    const input = await orchestratorFixture();
    expect(orchestrate(input)).toEqual(orchestrate(input));
  });

  test("2. mudança de política gera nova versão e ID", async () => {
    const input = await orchestratorFixture();
    const first = orchestrate(input);
    const second = orchestrate({ ...input, policy: { ...input.policy, version: "policy-v2" } });
    expect(second.id).not.toBe(first.id);
    expect(second.policyVersion).toBe("policy-v2");
  });

  test("3. risco crítico exige revisão urgente", async () => {
    const input = await orchestratorFixture("Fatal accident raises safety concerns");
    const decision = orchestrate(input);
    expect(decision.riskLevel).toBe("critical");
    expect(decision.recommendation).toBe("urgent-human-review");
  });

  test("4. alegação não atribuída bloqueia", async () => {
    const input = await orchestratorFixture();
    input.claims = [{ ...input.claims[0], sourceIds: [] }];
    expect(orchestrate(input).blockers).toContain("unattributed-claim");
  });

  test("5. contradição não revisada bloqueia", async () => {
    const input = await orchestratorFixture();
    input.evidence = { ...input.evidence, contradictions: ["Fontes divergem."] };
    expect(orchestrate(input).blockers).toContain("unreviewed-contradiction");
  });

  test("6. tradução pendente bloqueia uso factual", async () => {
    const input = await orchestratorFixture();
    input.translations = [pendingTranslation(input.cluster.id)];
    const decision = orchestrate(input);
    expect(decision.blockers).toContain("unreviewed-translation");
    expect(decision.readiness.translationReady.state).toBe("blocked");
  });

  test("7. fonte bloqueada impede pauta", async () => {
    const input = await orchestratorFixture();
    input.sources = [{ ...input.sources[0], active: false, trustTier: "blocked" }];
    expect(orchestrate(input).blockers).toContain("blocked-source");
  });

  test("8. fonte única reduz confiança", async () => {
    expect((await evaluatedFixture()).decision.confidence).toBe("low");
  });

  test("9. fonte única não vira confirmação cruzada", async () => {
    const { decision } = await evaluatedFixture();
    expect(decision.warnings).toContain("no-independent-confirmation");
    expect(decision.evidenceStrength).toBeLessThan(70);
  });

  test("10. item promocional recebe risco", async () => {
    const input = await orchestratorFixture();
    input.evidence = { ...input.evidence, promotionalSignals: ["company-promotion"] };
    expect(orchestrate(input).promotionalRisk).toBe("medium");
  });

  test("11. item irrelevante é rejeitado", async () => {
    const input = await orchestratorFixture();
    input.cluster = { ...input.cluster, topics: [] };
    const decision = orchestrate(input);
    expect(decision.blockers).toContain("insufficient-topic-evidence");
    expect(decision.recommendation).toBe("reject");
  });

  test("12. readiness partial não vira ready", async () => {
    expect((await evaluatedFixture()).decision.readiness.overallReady.state).toBe("partial");
  });

  test("13. blocker não é ignorado por score alto", async () => {
    const input = await orchestratorFixture();
    input.cluster = { ...input.cluster, clusterScore: 100 };
    input.translations = [pendingTranslation(input.cluster.id)];
    expect(orchestrate(input).recommendation).toBe("request-translation-review");
  });

  test("14. decisão não publica", async () => {
    const serialized = JSON.stringify((await evaluatedFixture()).decision);
    expect(serialized).not.toContain('"published"');
    expect(serialized).not.toContain('"publish"');
  });

  test("15. avaliação não altera cluster", async () => {
    const input = await orchestratorFixture();
    const before = structuredClone(input.cluster);
    orchestrate(input);
    expect(input.cluster).toEqual(before);
  });

  test("16. ação sem ator falha", async () => {
    const { decision } = await evaluatedFixture();
    expect(() => applyHumanDecision(decision, "monitor", "", "nota", NOW)).toThrow("actor");
  });

  test("17. ação sem nota falha", async () => {
    const { decision } = await evaluatedFixture();
    expect(() => applyHumanDecision(decision, "monitor", "editor", "", NOW)).toThrow("notes");
  });

  test("18. reavaliação idêntica preserva decisão e notas humanas", async () => {
    const { decision } = await evaluatedFixture();
    const reviewed = applyHumanDecision(decision, "monitor", "editor", "acompanhar", NOW);
    expect(mergeEvaluations([reviewed], [decision])[0].humanNotes).toBe("acompanhar");
  });
});
