import { describe, expect, test } from "bun:test";
import { graphNodeSchema, scientificGraphSchema } from "../scientific-graph/contracts";
import { MemoryStorageAdapter } from "../newsroom/storage/memory-adapter";
import { buildConceptGraph } from "./builder";
import { planConceptGraph } from "./engine";
import { reviewConceptRelation } from "./review";
import { loadConceptState } from "./store";
import { normalizeConceptTerm, validateTaxonomy } from "./taxonomy";
import { filterScientificConcepts } from "../../src/components/admin/scientific-concept-filter";

const at = "2026-01-01T00:00:00.000Z";
const provenance = {
  source: "openalex" as const,
  endpoint: "https://api.openalex.org/works/W1",
  externalId: "W1",
  retrievedAt: at,
  normalization: "OpenAlex ID",
  confidence: "confirmed" as const,
};
const node = (id: string, type: "scientific-work" | "topic", label: string) =>
  graphNodeSchema.parse({
    id,
    type,
    label,
    externalIds: { openalex: id },
    sourceRecords: [provenance],
    firstSeenAt: at,
    lastCheckedAt: at,
    warnings: [],
    status: "active",
    metadata: {},
  });
const graph = scientificGraphSchema.parse({
  schemaVersion: 1,
  id: "graph-1111111111111111",
  scientificWorkId: "radar-1111111111111111",
  rootNodeId: "sgn-1111111111111111",
  createdAt: at,
  updatedAt: at,
  nodes: [
    node("sgn-1111111111111111", "scientific-work", "Paper fixture"),
    node("sgn-2222222222222222", "topic", "Solar power"),
    node("sgn-3333333333333333", "topic", "Unknown exact topic"),
  ],
  relations: [],
  warnings: [],
  budget: { requests: 0, retries: 0, maxNodes: 100, maxRelations: 150 },
});
const taxonomy = validateTaxonomy({
  schemaVersion: 1,
  taxonomyVersion: "test-1",
  concepts: [
    {
      id: "concept-solar-energy",
      label: "Solar energy",
      aliases: ["solar power"],
      category: "source",
      themeId: "theme-transition",
      relations: [],
    },
  ],
});

describe("Sprint 27 — Scientific Concept Graph", () => {
  test("normalização é básica e correspondência permanece exata", () => {
    expect(normalizeConceptTerm("Energia Sólár")).toBe("energia solar");
    const result = buildConceptGraph({ taxonomy, graphs: [graph] });
    expect(result.concepts.map(({ id }) => id)).toEqual(["concept-solar-energy"]);
    expect(result.unresolvedTopics).toEqual(["Unknown exact topic"]);
  });
  test("aliases ambíguos são recusados", () => {
    expect(() =>
      validateTaxonomy({
        schemaVersion: 1,
        taxonomyVersion: "bad",
        concepts: [
          {
            id: "concept-one",
            label: "One",
            aliases: ["shared"],
            category: "x",
            themeId: "t",
            relations: [],
          },
          {
            id: "concept-two",
            label: "Two",
            aliases: ["Shared"],
            category: "x",
            themeId: "t",
            relations: [],
          },
        ],
      }),
    ).toThrow("Alias ambíguo");
  });
  test("relações permitidas começam pending e têm evidência", () => {
    const result = buildConceptGraph({ taxonomy, graphs: [graph] });
    expect(result.relations.every(({ humanStatus }) => humanStatus === "pending")).toBe(true);
    expect(result.relations.map(({ type }) => type).sort()).toEqual([
      "concept-dossier",
      "concept-theme",
      "paper-concept",
    ]);
    expect(result.relations.every(({ provenance: evidence }) => evidence.length > 0)).toBe(true);
  });
  test("dry-run não persiste; apply é idempotente e auditável", async () => {
    const adapter = new MemoryStorageAdapter();
    const dry = await planConceptGraph({ graphs: [graph], taxonomy, adapter });
    expect(dry.persisted).toBe(false);
    expect((await loadConceptState(adapter)).concepts).toHaveLength(0);
    const first = await planConceptGraph({
      graphs: [graph],
      taxonomy,
      adapter,
      apply: true,
      actor: "reviewer",
      now: new Date(at),
    });
    const second = await planConceptGraph({
      graphs: [graph],
      taxonomy,
      adapter,
      apply: true,
      actor: "reviewer",
      now: new Date(at),
    });
    expect(first.persisted).toBe(true);
    expect(second.persisted).toBe(false);
    expect(second.checksum).toBe(first.checksum);
    expect((await adapter.listAudit(10)).items.map(({ action }) => action)).toContain(
      "concept.graph.updated",
    );
  });
  test("revisão humana não cria conteúdo nem altera a relação automaticamente", async () => {
    const adapter = new MemoryStorageAdapter();
    const built = await planConceptGraph({
      graphs: [graph],
      taxonomy,
      adapter,
      apply: true,
      actor: "reviewer",
      now: new Date(at),
    });
    const reviewed = await reviewConceptRelation({
      id: built.relations[0].id,
      status: "accepted",
      actor: "reviewer",
      note: "evidence checked",
      now: new Date("2026-01-02T00:00:00.000Z"),
      adapter,
    });
    expect(reviewed.humanStatus).toBe("accepted");
    expect(JSON.stringify(reviewed)).not.toContain("article");
    expect((await loadConceptState(adapter)).relations).toHaveLength(built.relations.length);
    const rebuilt = await planConceptGraph({
      graphs: [graph],
      taxonomy,
      adapter,
      apply: true,
      actor: "reviewer",
      now: new Date(at),
    });
    expect(rebuilt.relations.find(({ id }) => id === reviewed.id)?.humanStatus).toBe("accepted");
  });
  test("filtros da Central cobrem busca, categoria e revisão", () => {
    const built = buildConceptGraph({ taxonomy, graphs: [graph] });
    const entries = built.concepts.map((concept) => ({ ...concept, relations: built.relations }));
    expect(
      filterScientificConcepts(entries, {
        term: "solar power",
        category: "source",
        status: "pending",
        relationType: "paper-concept",
      }),
    ).toHaveLength(1);
    expect(
      filterScientificConcepts(entries, {
        term: "wind",
        category: "all",
        status: "all",
        relationType: "all",
      }),
    ).toHaveLength(0);
  });
});
