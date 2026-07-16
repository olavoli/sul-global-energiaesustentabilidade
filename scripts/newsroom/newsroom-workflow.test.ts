import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { parseEditorialFile } from "../generate-content";
import { getPublicAuthor } from "../../src/data/authors";
import { personJsonLd, resolveCanonical } from "../../src/lib/seo";
import { normalizeItem } from "./normalize";
import { buildQueue, type SourceRun } from "./pipeline";
import { briefingFor, transitionItem, writeBriefing } from "./queue";
import { scoreItem } from "./score";
import {
  auditSchema,
  sourceSchema,
  type CollectedItem,
  type NewsSource,
  type QueueItem,
} from "./schema";

const temporaryDirectories: string[] = [];
afterEach(async () =>
  Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true }))),
);

function source(overrides: Partial<NewsSource> = {}): NewsSource {
  return sourceSchema.parse({
    id: "fixture-primary",
    name: "Fixture primária sintética",
    homepage: "https://fixture.example.test/",
    sourceType: "official",
    language: "pt-BR",
    countries: ["BR"],
    topics: ["energia solar", "Sul Global"],
    trustTier: "primary",
    active: true,
    termsNotes: "Fixture local.",
    copyrightNotes: "Texto sintético.",
    collectionMethod: "local-fixture",
    ...overrides,
  });
}

function collected(overrides: Partial<CollectedItem> = {}): CollectedItem {
  const result = normalizeItem(
    {
      title: "Pesquisa sintética de eficiência energética no Brasil",
      url: "https://fixture.example.test/item",
      guid: "workflow-guid",
      description: "Snippet sintético para testar potencial educacional.",
      publishedAt: "2026-07-15T10:00:00Z",
      categories: ["eficiência energética"],
    },
    source(),
    "2026-07-15T12:00:00Z",
  );
  if (!result.item) throw new Error("Fixture inválida.");
  return { ...result.item, ...overrides };
}

function queueItem(): QueueItem {
  const run: SourceRun = { source: source(), accepted: [collected()], rejected: [] };
  return buildQueue([run], "teste")[0];
}

describe("deduplicação, scoring e fila editorial", () => {
  test("fontes múltiplas são preservadas", () => {
    const secondSource = source({
      id: "fixture-secondary",
      name: "Fixture secundária",
      trustTier: "high",
    });
    const second = collected({
      id: "second",
      sourceId: secondSource.id,
      sourceName: secondSource.name,
      guid: "second-guid",
    });
    const queue = buildQueue([
      { source: source(), accepted: [collected()], rejected: [] },
      { source: secondSource, accepted: [second], rejected: [] },
    ]);
    expect(queue[1].relatedSources).toContain("Fixture primária sintética");
  });

  test("item irrelevante recebe penalidade", () => {
    const score = scoreItem(collected(), {
      source: source(),
      topics: [{ topic: "unclassified", score: 0, reasons: ["sem regra"] }],
      now: new Date("2026-07-15T12:00:00Z"),
    });
    expect(score.dimensions.irrelevantPenalty).toBe(-40);
  });

  test("fonte primária recebe bônus", () => {
    const primary = scoreItem(collected(), {
      source: source(),
      topics: [],
      now: new Date("2026-07-15T12:00:00Z"),
    });
    const medium = scoreItem(collected(), {
      source: source({ trustTier: "medium" }),
      topics: [],
      now: new Date("2026-07-15T12:00:00Z"),
    });
    expect(primary.total).toBeGreaterThan(medium.total);
    expect(primary.dimensions.primarySourceBonus).toBe(10);
  });

  test("conteúdo promocional recebe penalidade", () => {
    const promotional = collected({ title: "Lançamento da empresa é revolucionário" });
    expect(
      scoreItem(promotional, {
        source: source(),
        topics: [],
        now: new Date("2026-07-15T12:00:00Z"),
      }).dimensions.promotionalPenalty,
    ).toBe(-15);
  });

  test("scoring é determinístico", () => {
    const context = {
      source: source(),
      topics: queueItem().topics,
      now: new Date("2026-07-15T12:00:00Z"),
    };
    expect(scoreItem(collected(), context)).toEqual(scoreItem(collected(), context));
  });

  test("fila não publica e aprovação gera somente briefing", () => {
    const review = transitionItem(queueItem(), "review", "teste", "2026-07-15T13:00:00Z");
    const briefing = briefingFor(review);
    expect(briefing).toContain("Nenhum fato foi validado");
    expect(briefing).not.toContain("status: published");
  });

  test("approve grava somente briefing fora do conteúdo público", async () => {
    const root = await mkdtemp(join(tmpdir(), "sul-global-newsroom-"));
    temporaryDirectories.push(root);
    const review = transitionItem(queueItem(), "review", "teste", "2026-07-15T13:00:00Z");
    const path = await writeBriefing(review, root);
    expect(path).toContain("newsroom");
    expect(path).not.toContain("content/articles");
  });

  test("dry-run da coleta não altera a fila", async () => {
    const before = await readFile("newsroom/queue.json", "utf8");
    const child = Bun.spawn(["bun", "run", "newsroom:collect"], {
      cwd: process.cwd(),
      stdout: "ignore",
      stderr: "ignore",
    });
    expect(await child.exited).toBe(0);
    expect(await readFile("newsroom/queue.json", "utf8")).toBe(before);
  }, 15_000);

  test("transições alteram somente estados permitidos", () => {
    const review = transitionItem(queueItem(), "review", "teste", "2026-07-15T13:00:00Z");
    expect(transitionItem(review, "approved-for-draft", "teste").state).toBe("approved-for-draft");
    expect(() => transitionItem(review, "normalized", "teste")).toThrow("inválida");
  });

  test("auditoria não contém texto integral", () => {
    const entry = auditSchema.parse({
      command: "collect",
      timestamp: "2026-07-15T12:00:00Z",
      source: "fixture",
      itemsFetched: 1,
      itemsAccepted: 1,
      itemsRejected: 0,
      duplicates: 0,
      errors: [],
      duration: 1,
      configurationVersion: "test",
      actor: "test",
      dryRun: true,
    });
    expect(JSON.stringify(entry)).not.toContain(collected().contentSnippet);
    expect("content" in entry).toBeFalse();
  });
});

describe("autoria e piloto", () => {
  test("Olavo é público e verificado", () => {
    const author = getPublicAuthor("olavo-oliveira", false);
    expect(author?.status).toBe("verified");
    expect(author?.verifiedBy).toBe("founder-authorization");
    expect(author?.profileImage).toBeUndefined();
  });

  test("artigo piloto continua draft, vazio e atribuído a Olavo", async () => {
    const sourceText = await Bun.file(
      "content/articles/rascunho-como-funciona-matriz-eletrica-brasileira.mdx",
    ).text();
    const pilot = parseEditorialFile(sourceText).frontmatter;
    expect(pilot.author).toBe("olavo-oliveira");
    expect(pilot.status).toBe("draft");
    expect(pilot.sources).toEqual([]);
  });

  test("perfil de Olavo não contém dados não autorizados", () => {
    const author = getPublicAuthor("olavo-oliveira", false);
    const serialized = JSON.stringify(author);
    for (const field of [
      "email",
      "phone",
      "address",
      "city",
      "publicationAuthorized",
      "truthConfirmed",
    ]) {
      expect(serialized).not.toContain(`"${field}"`);
    }
  });

  test("perfil de Olavo possui canonical e JSON-LD Person", () => {
    const author = getPublicAuthor("olavo-oliveira", false);
    if (!author) throw new Error("Autor verificado ausente.");
    expect(resolveCanonical(`/autor/${author.slug}`)).toEndWith("/autor/olavo-oliveira");
    const payload = personJsonLd(author);
    expect(payload["@type"]).toBe("Person");
    expect(payload.name).toBe("Olavo Oliveira");
    expect(payload.sameAs).toContain("https://orcid.org/0000-0003-4648-8243");
  });
});
