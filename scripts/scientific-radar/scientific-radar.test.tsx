import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

import { MemoryStorageAdapter } from "../newsroom/storage/memory-adapter";
import { applyRadarHumanAction } from "./actions";
import { discoverScientificWorks } from "./pipeline";
import { scoreScientificWork } from "./scoring";
import { loadScientificDossiers, loadScientificRadar } from "./store";
import { classifyScientificWork } from "./taxonomy";

const now = new Date("2026-07-20T12:00:00.000Z");

const openAlexWork = {
  id: "https://openalex.org/W1234567890",
  doi: "https://doi.org/10.1234/solar.2026.1",
  title: "Solar photovoltaic batteries for smart grid energy storage",
  publication_date: "2026-07-15",
  type: "article",
  cited_by_count: 12,
  referenced_works: ["https://openalex.org/W111"],
  related_works: ["https://openalex.org/W222"],
  abstract_inverted_index: {
    Solar: [0],
    energy: [1],
    storage: [2],
    study: [3],
  },
  authorships: [
    {
      author: { display_name: "Ana Silva" },
      institutions: [{ display_name: "Universidade Pública" }],
    },
  ],
  keywords: [{ display_name: "Photovoltaics" }, { display_name: "Energy storage" }],
  topics: [{ display_name: "Smart grid" }],
  primary_topic: {
    display_name: "Renewable energy",
    field: { display_name: "Energy Engineering" },
  },
  primary_location: {
    source: {
      display_name: "Journal of Renewable Systems",
      host_organization_name: "Public Science Publisher",
    },
    license: "cc-by",
    is_oa: true,
  },
  best_oa_location: { license: "cc-by", is_oa: true },
  open_access: { is_oa: true },
};

const crossrefWork = {
  DOI: "10.1234/solar.2026.1",
  title: [openAlexWork.title],
  author: [
    {
      given: "Ana",
      family: "Silva",
      affiliation: [{ name: "Universidade Pública" }],
    },
  ],
  abstract: "<jats:p>Publisher abstract that is not summarized.</jats:p>",
  publisher: "Public Science Publisher",
  "container-title": ["Journal of Renewable Systems"],
  license: [{ URL: "https://creativecommons.org/licenses/by/4.0/" }],
  type: "journal-article",
  subject: ["Renewable Energy"],
  "is-referenced-by-count": 14,
};

function sourceFetcher(calls: string[]): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    calls.push(url.toString());
    if (url.hostname === "api.openalex.org") {
      return Response.json({ results: [openAlexWork] });
    }
    if (url.hostname === "api.crossref.org") {
      return Response.json({ status: "ok", message: crossrefWork });
    }
    return new Response(null, { status: 404 });
  }) as typeof fetch;
}

describe("Sprint 22 — Scientific Radar Foundation", () => {
  test("classifica deterministicamente a taxonomia inicial", () => {
    const result = classifyScientificWork({
      title: "Green hydrogen, wind power and public policy in electricity markets",
      abstract:
        "Machine learning supports electric vehicle charging, carbon pricing, nuclear energy, solar, batteries, energy storage and smart grid.",
    });
    const categories = result.map(({ category }) => category);
    expect(categories).toContain("green-hydrogen");
    expect(categories).toContain("wind");
    expect(categories).toContain("public-policy");
    expect(categories).toContain("market");
    expect(categories).toContain("ai-energy");
    expect(categories).toContain("mobility");
    expect(categories).toContain("carbon");
    expect(categories).toContain("nuclear");
    expect(categories).toContain("solar");
    expect(categories).toContain("batteries");
    expect(categories).toContain("storage");
    expect(categories).toContain("smart-grid");
  });

  test("score é explicável, limitado e combina os seis fatores", () => {
    const score = scoreScientificWork({
      publicationDate: "2026-07-15",
      citedByCount: 99,
      journal: "Journal",
      crossrefValidated: true,
      openAccess: true,
      categoryMatches: 4,
      categories: ["solar", "storage"],
      existingCategorySlugs: ["ciencia", "energia", "tecnologia"],
      now,
    });
    expect(score.total).toBeLessThanOrEqual(100);
    expect(score).toEqual({
      total: 96,
      recency: 25,
      citations: 20,
      journal: 15,
      openAccess: 10,
      thematic: 20,
      categoryRelationship: 6,
    });
  });

  test("consulta somente OpenAlex e Crossref, valida DOI e persiste metadados", async () => {
    const adapter = new MemoryStorageAdapter();
    const calls: string[] = [];
    const report = await discoverScientificWorks(
      {
        apiKey: "test-key",
        fromDate: "2026-07-01",
        perPage: 10,
        now,
        fetcher: sourceFetcher(calls),
      },
      adapter,
    );
    expect(calls.map((value) => new URL(value).hostname)).toEqual([
      "api.openalex.org",
      "api.crossref.org",
    ]);
    expect(report).toMatchObject({
      fetched: 1,
      doiCandidates: 1,
      crossrefValidated: 1,
      duplicates: 0,
      persisted: 1,
      rejected: 0,
    });
    const stored = (await loadScientificRadar(adapter)).value.items[0];
    expect(stored.doi).toBe("10.1234/solar.2026.1");
    expect(stored.abstract).toBe("Solar energy storage study");
    expect(stored.institutions).toEqual(["Universidade Pública"]);
    expect(stored.officialLinks.doi).toBe("https://doi.org/10.1234/solar.2026.1");
    expect(stored.crossrefValidated).toBe(true);
  });

  test("segunda descoberta do mesmo DOI é idempotente", async () => {
    const adapter = new MemoryStorageAdapter();
    const options = {
      apiKey: "test-key",
      fromDate: "2026-07-01",
      now,
      fetcher: sourceFetcher([]),
    };
    await discoverScientificWorks(options, adapter);
    const second = await discoverScientificWorks(options, adapter);
    expect(second.persisted).toBe(0);
    expect(second.duplicates).toBe(1);
    expect((await loadScientificRadar(adapter)).value.items).toHaveLength(1);
  });

  test("DOI não validado no Crossref não entra no radar", async () => {
    const adapter = new MemoryStorageAdapter();
    const fetcher = (async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      return url.hostname === "api.openalex.org"
        ? Response.json({ results: [openAlexWork] })
        : new Response(null, { status: 404 });
    }) as typeof fetch;
    const report = await discoverScientificWorks(
      { apiKey: "test-key", fromDate: "2026-07-01", now, fetcher },
      adapter,
    );
    expect(report.persisted).toBe(0);
    expect(report.rejected).toBe(1);
  });

  test("ações humanas não publicam, traduzem ou geram conteúdo", async () => {
    const adapter = new MemoryStorageAdapter();
    await discoverScientificWorks(
      {
        apiKey: "test-key",
        fromDate: "2026-07-01",
        now,
        fetcher: sourceFetcher([]),
      },
      adapter,
    );
    const id = (await loadScientificRadar(adapter)).value.items[0].id;
    const monitored = await applyRadarHumanAction(
      {
        action: "radar:monitor",
        id,
        actor: "editor",
        note: "Acompanhar novas citações.",
        now,
      },
      adapter,
    );
    expect(monitored.status).toBe("monitoring");
    const dossier = await applyRadarHumanAction(
      {
        action: "radar:create-dossier",
        id,
        actor: "editor",
        note: "Organizar fontes, sem redação.",
        now,
      },
      adapter,
    );
    expect(dossier.status).toBe("dossier-created");
    const storedDossier = (await loadScientificDossiers(adapter)).value.items[0];
    expect(storedDossier.generatedContent).toBe(false);
    expect(storedDossier.status).toBe("empty-supervised");
    const translation = await applyRadarHumanAction(
      {
        action: "radar:request-translation",
        id,
        actor: "editor",
        note: "Solicitação aguardando execução humana.",
        now,
      },
      adapter,
    );
    expect(translation.status).toBe("translation-requested");
  });

  test("Central declara todos os metadados e somente links científicos oficiais", async () => {
    const source = await readFile("src/components/admin/AdminScientificRadar.tsx", "utf8");
    expect(source).toContain("entry.title");
    expect(source).toContain("entry.institutions");
    expect(source).toContain("entry.authors");
    expect(source).toContain("entry.doi");
    expect(source).toContain("entry.score.total");
    expect(source).toContain("entry.openAccess");
    expect(source).toContain("entry.journal");
    expect(source).toContain("entry.license");
    expect(source).toContain("entry.publicationDate");
    expect(source).toContain("entry.officialLinks.openAlex");
    expect(source).toContain("entry.officialLinks.doi");
    expect(source).toContain("entry.officialLinks.crossref");
    expect(source).not.toContain(".pdf");
  });
});
