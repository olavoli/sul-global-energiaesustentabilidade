import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { MemoryStorageAdapter } from "../newsroom/storage/memory-adapter";
import { attachTrendStructure } from "./dossier";
import { planTrends } from "./engine";
import { fixture, trendFixtures } from "./fixtures";
import { trendPolicy } from "./policy";
import { reviewTrend } from "./review";
import { buildTrendSignal } from "./signal";
import { loadTrendState } from "./store";
import { filterScientificTrends } from "../../src/components/admin/scientific-trend-filter";

const named = (name: string) => trendFixtures.find((item) => item.name === name)!.memory;
const signal = (name: string) => buildTrendSignal(named(name), named(name).articleCount);

describe("Sprint 26 — Scientific Trend Engine", () => {
  test("um ano e menos de cinco observações são insufficient-data", () => {
    expect(signal("entidade-nova").status).toBe("insufficient-data");
    expect(signal("amostra-insuficiente").status).toBe("insufficient-data");
    expect(signal("entidade-nova").confidence).toBe("none");
  });
  test("três anos e cinco observações podem ser elegíveis", () => {
    expect(buildTrendSignal(fixture("elegivel", [1, 2, 2]).memory, 5).status).not.toBe(
      "insufficient-data",
    );
  });
  test("crescimento e queda contínuos geram somente candidatos preliminares", () => {
    expect(signal("crescimento-continuo").status).toBe("emerging-candidate");
    expect(signal("queda-continua").status).toBe("declining-candidate");
    for (const item of [signal("crescimento-continuo"), signal("queda-continua")])
      expect(item.warnings.map(({ code }) => code)).toContain("preliminary-signal");
  });
  test("estabilidade e volatilidade são distinguidas", () => {
    expect(signal("estabilidade").status).toBe("stable");
    expect(signal("volatilidade").status).toBe("volatile");
    expect(signal("volatilidade").warnings.map(({ code }) => code)).toContain("volatile-series");
  });
  test("lacuna, baseline zero e período parcial são explícitos", () => {
    expect(signal("ano-faltante").warnings.map(({ code }) => code)).toContain("missing-years");
    expect(signal("baseline-zero").warnings.map(({ code }) => code)).toContain("baseline-zero");
    expect(signal("periodo-parcial").warnings.map(({ code }) => code)).toContain("partial-period");
  });
  test("cobertura relata concentrações e metadados incompletos", () => {
    expect(signal("concentracao-geografica").warnings.map(({ code }) => code)).toContain(
      "geographic-concentration",
    );
    expect(signal("concentracao-institucional").warnings.map(({ code }) => code)).toContain(
      "institution-concentration",
    );
    expect(signal("concentracao-periodico").warnings.map(({ code }) => code)).toContain(
      "journal-concentration",
    );
    expect(signal("metadados-incompletos").warnings.map(({ code }) => code)).toContain(
      "metadata-gaps",
    );
  });
  test("confiança não representa veracidade e não sobe com amostra curta", () => {
    expect(signal("crescimento-continuo").confidence).not.toBe("high");
    expect(signal("amostra-insuficiente").confidence).toBe("none");
  });
  test("métricas são observacionais e não criam previsão", () => {
    const item = signal("aceleracao-positiva");
    expect(item.acceleration).toBeGreaterThan(0);
    expect(Object.keys(item)).not.toContain("prediction");
    expect(JSON.stringify(item)).not.toContain("forecast");
  });
  test("dry-run não persiste; apply explícito persiste e audita", async () => {
    const adapter = new MemoryStorageAdapter();
    await planTrends([named("estabilidade")], { adapter });
    expect((await loadTrendState(adapter)).signals).toHaveLength(0);
    await planTrends([named("estabilidade")], { adapter, apply: true, actor: "revisor" });
    expect((await loadTrendState(adapter)).signals).toHaveLength(1);
    expect((await adapter.listAudit(20)).items.map(({ action }) => action).sort()).toContain(
      "trend.run.completed",
    );
  });
  test("rebuild é idempotente e incremental equivale ao rebuild", async () => {
    const incremental = new MemoryStorageAdapter();
    const rebuilt = new MemoryStorageAdapter();
    const first = [named("estabilidade")];
    await planTrends(first, {
      adapter: incremental,
      apply: true,
      actor: "revisor",
      mode: "rebuild",
    });
    const next = [...first, named("crescimento-continuo")];
    const inc = await planTrends(next, { adapter: incremental, mode: "incremental" });
    const full = await planTrends(next, { adapter: rebuilt, mode: "rebuild" });
    expect(inc.checksum).toBe(full.checksum);
    expect((await planTrends(next, { adapter: rebuilt, mode: "rebuild" })).checksum).toBe(
      full.checksum,
    );
  });
  test("incremental idêntico não regrava nem cria auditoria", async () => {
    const adapter = new MemoryStorageAdapter();
    const memories = [named("estabilidade")];
    await planTrends(memories, { adapter, apply: true, actor: "revisor" });
    const before = await loadTrendState(adapter);
    const auditBefore = (await adapter.listAudit(100)).items.length;
    const repeated = await planTrends(memories, { adapter, apply: true, actor: "revisor" });
    const after = await loadTrendState(adapter);
    expect(repeated.changed).toBe(false);
    expect(after.versions).toEqual(before.versions);
    expect((await adapter.listAudit(100)).items).toHaveLength(auditBefore);
  });
  test("incremental recalcula somente o tipo afetado", async () => {
    const adapter = new MemoryStorageAdapter();
    const author = {
      ...named("estabilidade"),
      type: "author" as const,
      canonicalId: "author-0000000000000001",
      id: "memory-author-0000000000000001",
    };
    await planTrends([named("estabilidade"), author], {
      adapter,
      apply: true,
      actor: "revisor",
      mode: "rebuild",
    });
    const changed = {
      ...named("estabilidade"),
      articleCount: 9,
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    expect((await planTrends([changed, author], { adapter })).affected).toBe(1);
  });
  test("política é versionada e thresholds não ficam implícitos", () => {
    expect(trendPolicy.version).toBe(1);
    expect(trendPolicy.minimumDistinctYears).toBe(3);
    expect(trendPolicy.minimumObservations).toBe(5);
  });
  test("revisão exige ação humana e não cria conteúdo", async () => {
    const adapter = new MemoryStorageAdapter();
    const report = await planTrends([named("estabilidade")], {
      adapter,
      apply: true,
      actor: "revisor",
    });
    await expect(
      reviewTrend({
        id: report.signals[0].id,
        action: "reviewed",
        actor: "",
        note: "ok",
        now: new Date(),
        adapter,
      }),
    ).rejects.toThrow();
    const reviewed = await reviewTrend({
      id: report.signals[0].id,
      action: "reviewed",
      actor: "revisor",
      note: "checado",
      now: new Date("2026-01-01"),
      adapter,
    });
    expect(reviewed.history.at(-1)?.action).toBe("reviewed");
    expect(JSON.stringify(reviewed)).not.toContain("articleBody");
  });
  test("dossiê recebe somente estrutura e mantém campos interpretativos", () => {
    const base = {
      authorIds: [named("estabilidade").canonicalId],
      editorialAngle: "",
      whyItMatters: "",
      regionalRelevance: "",
      sulGlobalRelevance: "",
      humanNotes: [],
    };
    const result = attachTrendStructure(base as never, [signal("estabilidade")]);
    expect(result.trendSignalIds).toHaveLength(1);
    expect(result.editorialAngle).toBe("");
    expect(result.whyItMatters).toBe("");
    expect(result.humanNotes).toEqual([]);
  });
  test("Central mostra warnings e filtros estruturais", async () => {
    const entries = [signal("estabilidade"), signal("entidade-nova")];
    expect(
      filterScientificTrends(entries, {
        type: "all",
        status: "insufficient-data",
        confidence: "all",
        warning: "all",
        period: "all",
        coverage: "all",
        term: "",
      }),
    ).toHaveLength(1);
    const source = await readFile("src/components/admin/AdminScientificTrends.tsx", "utf8");
    expect(source).toContain("Dados insuficientes para inferir tendência");
    expect(source).toContain("Warning");
  });
  test("Central permanece protegida por sessão e CSRF", async () => {
    const handler = await readFile("src/lib/admin/handler.ts", "utf8");
    expect(handler).toContain("Autenticação necessária");
    expect(handler).toContain("x-csrf-token");
  });
  test("fixtures são explícitas e storage operacional não é usado", async () => {
    expect(trendFixtures).toHaveLength(16);
    expect(trendFixtures.every(({ fixture }) => fixture)).toBe(true);
    const engine = await readFile("scripts/scientific-trends/engine.ts", "utf8");
    expect(engine).not.toContain("newsroom/storage/scientific-trends/");
  });
});
