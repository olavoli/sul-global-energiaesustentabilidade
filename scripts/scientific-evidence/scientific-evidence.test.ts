import { describe, expect, test } from "bun:test";
import { MemoryStorageAdapter } from "../newsroom/storage/memory-adapter";
import { scientificWorkSchema, scientificDossierSchema } from "../scientific-radar/contracts";
import { scientificGraphSchema } from "../scientific-graph/contracts";
import { buildEvidenceScaffold } from "./builder";
import { evidenceClaimSchema, evidenceItemSchema, evidenceSourceSchema } from "./contracts";
import { evidenceChecksum } from "./checksum";
import { persistCollectedEvidence, planEvidence } from "./engine";
import { loadEvidenceState } from "./store";
import { reviewEvidence } from "./review";
import { extractCrossrefAbstract } from "./collector";
const at = "2026-01-01T00:00:00.000Z";
const work = scientificWorkSchema.parse({
  id: "radar-1111111111111111",
  openAlexId: "https://openalex.org/W1",
  doi: "10.1000/test",
  title: "Artificial fixture",
  authors: ["Fixture Author"],
  institutions: [],
  abstract: null,
  countries: [],
  keywords: [],
  journal: "Fixture Journal",
  publisher: "Fixture Publisher",
  publicationDate: "2025-01-01",
  license: "cc-by",
  openAccess: true,
  openAccessUrl: null,
  type: "article",
  peerReviewStatus: "unknown",
  corrected: false,
  retracted: false,
  area: null,
  categories: ["batteries"],
  existingCategorySlugs: ["ciencia"],
  citedByCount: 0,
  referencedWorks: [],
  relatedWorks: [],
  officialLinks: {
    openAlex: "https://openalex.org/W1",
    doi: "https://doi.org/10.1000/test",
    crossref: "https://api.crossref.org/works/10.1000%2Ftest",
  },
  crossrefValidated: true,
  warningVersion: 1,
  warnings: [],
  score: {
    total: 1,
    recency: 1,
    citations: 0,
    journal: 0,
    openAccess: 0,
    thematic: 0,
    categoryRelationship: 0,
  },
  status: "dossier-created",
  discoveredAt: at,
  updatedAt: at,
  history: [],
});
const dossier = scientificDossierSchema.parse({
  id: "dossier-1111111111111111",
  scientificWorkId: work.id,
  title: work.title,
  doi: work.doi,
  authors: work.authors,
  institutions: [],
  journal: work.journal,
  publicationDate: work.publicationDate,
  license: "cc-by",
  openAccess: true,
  categories: work.categories,
  warnings: [],
  officialLinks: work.officialLinks,
  status: "scaffold",
  createdAt: at,
  createdBy: "fixture",
  centralQuestion: "",
  editorialAngle: "",
  whyItMatters: "",
  knownClaims: [],
  unsupportedClaims: [],
  limitations: [],
  counterEvidenceNeeded: [],
  relatedWorksNeeded: [],
  funding: [],
  conflictsOfInterest: [],
  openQuestions: [],
  regionalRelevance: "",
  sulGlobalRelevance: "",
  sourceAccess: { openAccess: true, license: "cc-by", links: [work.officialLinks.doi] },
  copyrightNotes: "",
  factChecks: [],
  translationNeeds: [],
  imageNeeds: [],
  humanNotes: [],
  history: [],
  generatedContent: false,
  graphId: "graph-1111111111111111",
});
const graph = scientificGraphSchema.parse({
  schemaVersion: 1,
  id: dossier.graphId,
  scientificWorkId: work.id,
  rootNodeId: "sgn-1111111111111111",
  createdAt: at,
  updatedAt: at,
  nodes: [],
  relations: [],
  warnings: [],
  budget: { requests: 0, retries: 0, maxNodes: 100, maxRelations: 150 },
});
const source = {
  sourceId: "evidence-source-1111111111111111",
  type: "primary-paper",
  title: "Fixture",
  url: "https://example.test/paper",
  authors: ["Author"],
  license: "cc-by",
  accessType: "open",
  retrievedAt: at,
  verifiedAt: null,
  provenance: [{ source: "fixture", sourceId: "x", retrievedAt: at, method: "fixture" }],
  warnings: [],
  humanStatus: "unread",
};
describe("Sprint 28 — Scientific Evidence Dossier", () => {
  test("fonte exige licença e claim exige fonte e atribuição", () => {
    expect(() => evidenceSourceSchema.parse({ ...source, license: "" })).toThrow();
    expect(() =>
      evidenceClaimSchema.parse({
        claimId: "evidence-claim-1111111111111111",
        exactSourceReference: "§1",
        sourceId: "",
        attributedTo: "",
        claimType: "result",
        statement: "x",
        evidenceLocation: "§1",
        supportingEvidenceIds: [],
        opposingEvidenceIds: [],
        uncertainty: "none",
        status: "candidate",
        warnings: [],
        humanStatus: "unread",
        history: [],
      }),
    ).toThrow();
  });
  test("hipótese permanece hipótese e relações não viram apoio", () => {
    const built = buildEvidenceScaffold({ work, dossier, graph, now: new Date(at) });
    expect(built.claims).toHaveLength(0);
    expect(JSON.stringify(built.dossier.relatedEvidence)).not.toMatch(/supports|confirms/);
  });
  test("excerpt é curto e preserva números, unidades e localização", () => {
    const item = evidenceItemSchema.parse({
      evidenceId: "evidence-item-1111111111111111",
      sourceId: source.sourceId,
      type: "number",
      location: "Table 1",
      shortExcerpt: "12.5 mS cm-1",
      structuredValue: 12.5,
      unit: "mS cm-1",
      confidence: "confirmed",
      warnings: [],
      humanStatus: "unread",
    });
    expect(item.location).toBe("Table 1");
    expect(item.structuredValue).toBe(12.5);
    expect(item.unit).toBe("mS cm-1");
    expect(() => evidenceItemSchema.parse({ ...item, shortExcerpt: "x".repeat(501) })).toThrow();
  });
  test("scaffold não armazena PDF, texto integral, figura, tabela ou artigo", () => {
    const built = buildEvidenceScaffold({ work, dossier, graph, now: new Date(at) });
    const json = JSON.stringify(built);
    expect(built.dossier.copyright).toMatchObject({
      fullTextStored: false,
      figuresStored: false,
      tablesStored: false,
    });
    expect(json).not.toMatch(/\.pdf|<article|mdx/i);
  });
  test("correção é sinalizada e retratação bloqueia", () => {
    const corrected = buildEvidenceScaffold({
      work: { ...work, corrected: true },
      dossier,
      graph,
      now: new Date(at),
    });
    expect(corrected.dossier.status).toBe("scaffold");
    expect(() =>
      buildEvidenceScaffold({
        work: { ...work, retracted: true },
        dossier,
        graph,
        now: new Date(at),
      }),
    ).toThrow("bloqueado");
  });
  test("conflitos permanecem explícitos e não resolvidos", () => {
    const built = buildEvidenceScaffold({ work, dossier, graph, now: new Date(at) });
    expect(built.dossier.contradictions).toEqual([]);
    expect(built.dossier.readiness.level).toBe("incomplete");
  });
  test("dry-run não persiste, apply é idempotente e checksum determinístico", async () => {
    const adapter = new MemoryStorageAdapter();
    const first = await planEvidence({ work, dossier, graph, adapter, now: new Date(at) });
    expect(first.persisted).toBe(false);
    expect((await loadEvidenceState(adapter)).dossiers).toHaveLength(0);
    const applied = await planEvidence({
      work,
      dossier,
      graph,
      adapter,
      now: new Date(at),
      apply: true,
      actor: "reviewer",
    });
    const again = await planEvidence({
      work,
      dossier,
      graph,
      adapter,
      now: new Date(at),
      apply: true,
      actor: "reviewer",
    });
    expect(applied.persisted).toBe(true);
    expect(again.persisted).toBe(false);
    expect(applied.checksum).toBe(again.checksum);
    expect(
      evidenceChecksum({
        dossiers: applied.dossiers,
        sources: applied.sources,
        claims: [],
        evidence: [],
      }),
    ).toBe(applied.checksum);
  });
  test("revisão exige ator e justificativa e não publica", async () => {
    const adapter = new MemoryStorageAdapter();
    const applied = await planEvidence({
      work,
      dossier,
      graph,
      adapter,
      now: new Date(at),
      apply: true,
      actor: "reviewer",
    });
    await expect(
      reviewEvidence({
        id: applied.sources[0].sourceId,
        status: "verified",
        actor: "",
        note: "",
        adapter,
      }),
    ).rejects.toThrow();
    const result = await reviewEvidence({
      id: applied.sources[0].sourceId,
      status: "verified",
      actor: "reviewer",
      note: "checked",
      adapter,
    });
    expect(result.status).toBe("verified");
    expect(JSON.stringify(result)).not.toContain("published");
  });
  test("fixtures usam memória e storage operacional não é requisito", () =>
    expect(new MemoryStorageAdapter().driver).toBe("memory"));
  test("abstract Crossref gera somente claims atribuídos e excerpts curtos", () => {
    const result = extractCrossrefAbstract(
      {
        message: {
          DOI: "10.1002/advs.202510481",
          title: ["Fixture"],
          publisher: "Wiley",
          author: [{ given: "A", family: "Author" }],
          license: [{ URL: "http://creativecommons.org/licenses/by/4.0/" }],
          abstract:
            "<jats:p>This review explores polymer electrolytes under stated conditions. Continuing work is poised to improve integration without proving general superiority.</jats:p>",
        },
      },
      at,
    );
    expect(result.claims).toHaveLength(2);
    expect(result.evidence.every(({ shortExcerpt }) => shortExcerpt.length <= 500)).toBe(true);
    expect(result.abstractStored).toBe(false);
    expect(result.claims.every(({ attributedTo }) => attributedTo === "A Author")).toBe(true);
  });
  test("persistência piloto respeita 5/5, limites, readiness e idempotência", async () => {
    const pilotWork = scientificWorkSchema.parse({
      ...work,
      doi: "10.1002/advs.202510481",
      officialLinks: {
        ...work.officialLinks,
        doi: "https://doi.org/10.1002/advs.202510481",
        crossref: "https://api.crossref.org/works/10.1002%2Fadvs.202510481",
      },
    });
    const pilotDossier = scientificDossierSchema.parse({
      ...dossier,
      scientificWorkId: pilotWork.id,
      doi: pilotWork.doi,
      officialLinks: pilotWork.officialLinks,
    });
    const pilotGraph = scientificGraphSchema.parse({
      ...graph,
      scientificWorkId: pilotWork.id,
    });
    const collected = extractCrossrefAbstract(
      {
        message: {
          DOI: pilotWork.doi,
          title: ["Fixture"],
          publisher: "Wiley",
          author: [{ given: "A", family: "Author" }],
          license: [{ URL: "http://creativecommons.org/licenses/by/4.0/" }],
          abstract: Array.from(
            { length: 5 },
            (_, index) => `Sentence ${index + 1} preserves a deterministic attributed claim.`,
          ).join(" "),
        },
      },
      at,
    );
    const adapter = new MemoryStorageAdapter();
    const applied = await persistCollectedEvidence({
      work: pilotWork,
      dossier: pilotDossier,
      graph: pilotGraph,
      collected,
      actor: "reviewer",
      now: new Date(at),
      adapter,
    });
    const again = await persistCollectedEvidence({
      work: pilotWork,
      dossier: pilotDossier,
      graph: pilotGraph,
      collected,
      actor: "reviewer",
      now: new Date(at),
      adapter,
    });
    expect(applied.sources).toHaveLength(1);
    expect(applied.claims).toHaveLength(5);
    expect(applied.evidence).toHaveLength(5);
    expect(applied.excerptCharacters).toBeLessThanOrEqual(2_500);
    expect(
      applied.claims.every(
        ({ status, humanStatus }) => status === "candidate" && humanStatus === "unread",
      ),
    ).toBe(true);
    expect(applied.evidence.every(({ humanStatus }) => humanStatus === "unread")).toBe(true);
    expect(applied.dossiers[0].readiness.level).toBe("incomplete");
    expect(applied.bytes).toBeLessThanOrEqual(20_000);
    expect(again.persisted).toBe(false);
    expect(again.checksum).toBe(applied.checksum);
  });
});
