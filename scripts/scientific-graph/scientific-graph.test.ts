import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { MemoryStorageAdapter } from "../newsroom/storage/memory-adapter";
import {
  scientificDossiersDocumentSchema,
  scientificRadarDocumentSchema,
} from "../scientific-radar/contracts";
import { DOSSIERS_KEY, RADAR_KEY } from "../scientific-radar/store";
import { buildScientificGraph } from "./builder";
import { graphRelationSchema } from "./contracts";
import { reviewGraphRelation } from "./review";
import { GRAPH_KEY, loadScientificGraphs, persistScientificGraph } from "./store";

async function pilot() {
  const radar = JSON.parse(
    await readFile("newsroom/storage/scientific-radar/items.json", "utf8"),
  ) as { value: unknown };
  const dossiers = JSON.parse(
    await readFile("newsroom/storage/scientific-radar/dossiers.json", "utf8"),
  ) as { value: unknown };
  const work = scientificRadarDocumentSchema
    .parse(radar.value)
    .items.find(({ doi }) => doi === "10.1002/advs.202510481");
  const dossier = scientificDossiersDocumentSchema
    .parse(dossiers.value)
    .items.find(({ scientificWorkId }) => scientificWorkId === work?.id);
  if (!work || !dossier) throw new Error("Piloto ausente.");
  return { work, dossier };
}

function response(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}
function sourceFixture() {
  let calls = 0;
  const root = {
    id: "https://openalex.org/W4413051216",
    doi: "https://doi.org/10.1002/advs.202510481",
    display_name: "Why Will Polymers Win the Race for Solid-State Batteries?",
    publication_year: 2025,
    is_retracted: false,
    open_access: { is_oa: true },
    referenced_works: ["https://openalex.org/W1", "https://openalex.org/W1"],
    related_works: ["https://openalex.org/W2"],
    authorships: [0, 1].map(() => ({
      author: {
        id: "https://openalex.org/A1",
        display_name: "Autora Teste",
        orcid: "https://orcid.org/0000-0001-2345-6789",
      },
      institutions: [
        {
          id: "https://openalex.org/I1",
          display_name: "Instituição Teste",
          ror: "https://ror.org/012345678",
          country_code: "BR",
          type: "education",
        },
      ],
    })),
    topics: [{ id: "https://openalex.org/T1", display_name: "Solid-state batteries", level: 2 }],
    primary_location: {
      source: { id: "https://openalex.org/S1", display_name: "Advanced Science" },
    },
  };
  const work = (id: string, doi?: string) => ({
    id: `https://openalex.org/${id}`,
    doi: doi ? `https://doi.org/${doi}` : null,
    display_name: `Trabalho ${id}`,
    publication_year: 2024,
    is_retracted: false,
    open_access: { is_oa: true },
  });
  const fetcher = (async (input: Parameters<typeof fetch>[0]) => {
    calls += 1;
    const url = new URL(String(input));
    if (url.hostname === "api.crossref.org")
      return response({
        message: {
          DOI: "10.1002/advs.202510481",
          publisher: "Wiley",
          funder: [{ name: "Funder Teste", DOI: "10.13039/1" }],
        },
      });
    if (url.pathname.endsWith("W4413051216")) return response(root);
    if (url.searchParams.get("filter")?.startsWith("cites:"))
      return response({ results: [work("W3", "10.1000/citing")] });
    const filter = url.searchParams.get("filter") ?? "";
    if (filter.includes("W1"))
      return response({
        results: [work("W1", "10.1000/reference"), work("W1", "10.1000/reference")],
      });
    return response({ results: [work("W2")] });
  }) as typeof fetch;
  return { fetcher, calls: () => calls };
}

describe("Sprint 23 — Scientific Knowledge Graph V1", () => {
  test("piloto confirma DOI, OA, CC BY, dossiê vazio e ausência de blocker", async () => {
    const { work, dossier } = await pilot();
    expect(work.openAlexId).toContain("W4413051216");
    expect(work.openAccess).toBe(true);
    expect(work.license).toBe("cc-by");
    expect(work.retracted).toBe(false);
    expect(
      work.warnings.some(({ severity, resolved }) => severity === "blocker" && !resolved),
    ).toBe(false);
    expect(dossier.generatedContent).toBe(false);
    expect(dossier.centralQuestion).toBe("");
  });

  test("DOI, ORCID e ROR deduplicam nós e proveniência agrega relação duplicada", async () => {
    const { work, dossier } = await pilot();
    const fixture = sourceFixture();
    const report = await buildScientificGraph(work, dossier, {
      fetcher: fixture.fetcher,
      now: new Date("2026-07-21T12:00:00Z"),
    });
    expect(report.graph.nodes.filter(({ type }) => type === "author")).toHaveLength(1);
    expect(report.graph.nodes.filter(({ type }) => type === "institution")).toHaveLength(1);
    expect(
      report.graph.nodes.filter(({ externalIds }) => externalIds.doi === "10.1000/reference"),
    ).toHaveLength(1);
    expect(report.duplicates).toBeGreaterThan(0);
    expect(report.persisted).toBe(false);
  });

  test("cites e cited-by permanecem vínculos observados sem apoio ou confirmação", async () => {
    const { work, dossier } = await pilot();
    const { fetcher } = sourceFixture();
    const { graph } = await buildScientificGraph(work, dossier, { fetcher });
    expect(graph.relations.some(({ type }) => type === "cites")).toBe(true);
    expect(graph.relations.some(({ type }) => type === "cited-by")).toBe(true);
    expect(JSON.stringify(graph)).not.toMatch(/supports|confirms|contradicts|disproves/);
  });

  test("limites de nós, relações e chamadas permanecem explícitos", async () => {
    const { work, dossier } = await pilot();
    const { fetcher } = sourceFixture();
    const { graph } = await buildScientificGraph(work, dossier, {
      fetcher,
      references: 20,
      citing: 20,
      related: 10,
    });
    expect(graph.nodes.length).toBeLessThanOrEqual(100);
    expect(graph.relations.length).toBeLessThanOrEqual(150);
    expect(graph.budget.maxNodes).toBe(100);
    expect(graph.budget.maxRelations).toBe(150);
  });

  test("timeout e 429 usam no máximo um retry", async () => {
    const { work, dossier } = await pilot();
    let calls = 0;
    const fetcher = (async () => {
      calls += 1;
      return response({}, 429);
    }) as unknown as typeof fetch;
    await expect(buildScientificGraph(work, dossier, { fetcher, timeoutMs: 5 })).rejects.toThrow(
      "429",
    );
    expect(calls).toBe(4);
  });

  test("dry-run não persiste; apply transacional anexa somente IDs estruturais", async () => {
    const { work, dossier } = await pilot();
    const adapter = new MemoryStorageAdapter();
    await adapter.putDocument(
      {
        key: RADAR_KEY,
        value: { schemaVersion: 2, lastRunAt: null, items: [work] },
        expectedVersion: 0,
      },
      scientificRadarDocumentSchema,
    );
    await adapter.putDocument(
      { key: DOSSIERS_KEY, value: { schemaVersion: 2, items: [dossier] }, expectedVersion: 0 },
      scientificDossiersDocumentSchema,
    );
    const { graph } = await buildScientificGraph(work, dossier, {
      fetcher: sourceFixture().fetcher,
    });
    expect((await loadScientificGraphs(adapter)).value.items).toHaveLength(0);
    await persistScientificGraph(graph, adapter);
    expect((await loadScientificGraphs(adapter)).value.items).toHaveLength(1);
    expect((await adapter.listAudit(10)).items[0]).toMatchObject({
      action: "scientific-graph:persist",
      entityId: graph.id,
      success: true,
    });
    const stored = (
      await adapter.getDocument(DOSSIERS_KEY, scientificDossiersDocumentSchema, {
        schemaVersion: 2,
        items: [],
      })
    ).value.items[0];
    expect(stored.graphId).toBe(graph.id);
    expect(stored.centralQuestion).toBe("");
    expect(stored.knownClaims).toEqual([]);
    const auditCount = (await adapter.listAudit(10)).items.length;
    expect(await persistScientificGraph(graph, adapter)).toBe("unchanged");
    expect((await adapter.listAudit(10)).items).toHaveLength(auditCount);
  });

  test("relação aceita ou rejeitada exige ação humana e não cria artigo", async () => {
    const { work, dossier } = await pilot();
    const adapter = new MemoryStorageAdapter();
    await adapter.putDocument(
      { key: DOSSIERS_KEY, value: { schemaVersion: 2, items: [dossier] } },
      scientificDossiersDocumentSchema,
    );
    const { graph } = await buildScientificGraph(work, dossier, {
      fetcher: sourceFixture().fetcher,
    });
    await persistScientificGraph(graph, adapter);
    const relation = graph.relations[0];
    const accepted = await reviewGraphRelation(
      { relationId: relation.id, status: "accepted", actor: "editora", note: "Vínculo conferido." },
      adapter,
    );
    expect(accepted.humanStatus).toBe("accepted");
    expect(graphRelationSchema.parse(accepted).history).toHaveLength(1);
    expect(
      (await adapter.listDocuments("", 100)).items.some(({ key }) => /article|mdx/i.test(key)),
    ).toBe(false);
  });

  test("dados privados não incluem abstract integral, PDF, MDX, staging ou produção", async () => {
    const sources = await Promise.all([
      readFile("scripts/scientific-graph/builder.ts", "utf8"),
      readFile("scripts/scientific-graph/sources.ts", "utf8"),
      readFile("scripts/scientific-graph-cli.ts", "utf8"),
    ]);
    expect(sources.join("\n")).not.toMatch(/abstract_inverted_index|pdf_url|content\/articles/);
    expect(sources[2]).toContain("bloqueado em produção e staging");
    expect(GRAPH_KEY).toBe("scientific-graph/graphs");
  });
});
