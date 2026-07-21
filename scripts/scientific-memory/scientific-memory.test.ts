import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { MemoryStorageAdapter } from "../newsroom/storage/memory-adapter";
import { filterScientificMemories } from "../../src/components/admin/scientific-memory-filter";
import { scientificWorkSchema, type ScientificWork } from "../scientific-radar/contracts";
import { rebuildScientificMemory, updateScientificMemory } from "./engine";
import { loadMemoryState, MEMORY_KEYS, MEMORY_METADATA_KEY, MEMORY_TIMELINE_KEY } from "./store";

const at = (year: number) => `${year}-06-01T12:00:00.000Z`;
function work(index: number, year: number, input: Partial<ScientificWork> = {}): ScientificWork {
  const hex = index.toString(16).padStart(16, "0");
  return scientificWorkSchema.parse({
    id: `radar-${hex}`,
    openAlexId: `https://openalex.org/W${index}`,
    doi: `10.1000/memory-${index}`,
    title: `Artigo ${index}`,
    authors: ["Ana Silva"],
    institutions: ["Universidade Sul"],
    abstract: null,
    countries: ["BR"],
    keywords: ["storage"],
    journal: "Journal of Storage",
    publisher: "Editora Ciência",
    publicationDate: `${year}-06-01`,
    license: "cc-by",
    openAccess: true,
    openAccessUrl: null,
    type: "journal-article",
    peerReviewStatus: "probable",
    corrected: false,
    retracted: false,
    area: "Engineering",
    categories: ["storage"],
    existingCategorySlugs: ["energia"],
    citedByCount: 0,
    referencedWorks: [],
    relatedWorks: [],
    officialLinks: {
      openAlex: `https://openalex.org/W${index}`,
      doi: `https://doi.org/10.1000/memory-${index}`,
      crossref: `https://api.crossref.org/works/10.1000%2Fmemory-${index}`,
    },
    crossrefValidated: true,
    warningVersion: 1,
    warnings: [],
    score: {
      total: 50,
      recency: 10,
      citations: 5,
      journal: 10,
      openAccess: 10,
      thematic: 10,
      categoryRelationship: 5,
    },
    status: "monitoring",
    discoveredAt: at(year),
    updatedAt: at(year),
    history: [{ action: "discovered", actor: "fixture", note: "", at: at(year) }],
    ...input,
  });
}

describe("Sprint 25 — Scientific Temporal Memory Engine", () => {
  test("storage vazio possui documentos determinísticos", async () => {
    const state = await loadMemoryState(new MemoryStorageAdapter());
    expect(state.metadata.articleCount).toBe(0);
    expect(Object.values(state.entities).flat()).toHaveLength(0);
  });

  test("primeira construção cria entidades, timeline e auditoria", async () => {
    const adapter = new MemoryStorageAdapter();
    const report = await rebuildScientificMemory([work(1, 2022)], "Olavo", adapter);
    expect(report.audit).toBe("memory.created");
    expect(report.entities).toBe(6);
    expect((await loadMemoryState(adapter)).timeline.years).toHaveLength(1);
    expect((await adapter.listAudit(10)).items[0].action).toBe("memory.created");
  });

  test("incremental altera somente entidades afetadas e é idempotente", async () => {
    const adapter = new MemoryStorageAdapter();
    await rebuildScientificMemory([work(1, 2022)], "Olavo", adapter);
    const updated = await updateScientificMemory([work(2, 2023)], "Olavo", adapter);
    expect(updated.audit).toBe("memory.updated");
    expect(updated.affectedEntities).toBe(6);
    const repeated = await updateScientificMemory([work(2, 2023)], "Olavo", adapter);
    expect(repeated.changed).toBe(false);
    expect(repeated.audit).toBeUndefined();
  });

  test("incremental e rebuild completo produzem checksum igual", async () => {
    const incremental = new MemoryStorageAdapter();
    const rebuilt = new MemoryStorageAdapter();
    await rebuildScientificMemory([work(1, 2022)], "Olavo", incremental);
    const incrementalReport = await updateScientificMemory(
      [work(2, 2023), work(3, 2025, { authors: ["Beatriz Lima"] })],
      "Olavo",
      incremental,
    );
    const rebuildReport = await rebuildScientificMemory(
      [work(1, 2022), work(2, 2023), work(3, 2025, { authors: ["Beatriz Lima"] })],
      "Olavo",
      rebuilt,
    );
    expect(incrementalReport.checksum).toBe(rebuildReport.checksum);
  });

  test("múltiplos anos distinguem entidade nova, recorrente e crescimento", async () => {
    const adapter = new MemoryStorageAdapter();
    await rebuildScientificMemory(
      [work(1, 2022), work(2, 2023), work(3, 2023), work(4, 2025, { authors: ["Beatriz Lima"] })],
      "Olavo",
      adapter,
    );
    const state = await loadMemoryState(adapter);
    const ana = state.entities.author.find(({ name }) => name === "Ana Silva")!;
    expect(ana.timeline).toEqual([
      { year: 2022, count: 1 },
      { year: 2023, count: 2 },
    ]);
    expect(ana.yearsActive).toBe(2);
    expect(ana.growthRate).toBe(100);
    expect(
      state.timeline.years.find(({ year }) => year === 2023)?.recurringEntities,
    ).toBeGreaterThan(0);
    expect(state.timeline.years.find(({ year }) => year === 2025)?.newEntities).toBeGreaterThan(0);
  });

  test("chaves geram exatamente os arquivos privados especificados", () => {
    expect(Object.values(MEMORY_KEYS)).toEqual([
      "scientific-memory/authors",
      "scientific-memory/institutions",
      "scientific-memory/journals",
      "scientific-memory/publishers",
      "scientific-memory/countries",
      "scientific-memory/categories",
    ]);
    expect([MEMORY_TIMELINE_KEY, MEMORY_METADATA_KEY]).toEqual([
      "scientific-memory/timeline",
      "scientific-memory/metadata",
    ]);
  });

  test("Central contém filtros de tipo, ano e relacionamentos", async () => {
    const source = await readFile("src/components/admin/AdminScientificMemory.tsx", "utf8");
    for (const label of [
      "Autor",
      "Instituição",
      "Categoria",
      "Periódico",
      "Publisher",
      "País",
      "Ano",
      "Relacionamentos",
    ])
      expect(source).toContain(label);
    const adapter = new MemoryStorageAdapter();
    await rebuildScientificMemory([work(1, 2022), work(2, 2023)], "Olavo", adapter);
    const memories = Object.values((await loadMemoryState(adapter)).entities).flat();
    expect(filterScientificMemories(memories, "", "author", "2022")).toHaveLength(1);
    expect(filterScientificMemories(memories, "universidade sul", "author", "all")).toHaveLength(1);
    expect(filterScientificMemories(memories, "", "publisher", "2025")).toHaveLength(0);
  });
});
