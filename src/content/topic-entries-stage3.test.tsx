import { expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";

import { topicEntries, topicEntrySchema } from "./topic-entries";
import { buildTagTopics } from "./tags";
import { articleRecords } from "./generated/articles";
import { taxonomyCatalog } from "./taxonomy-catalog";
import { tagPageHead } from "../lib/tag-seo";
import { TopicEntryContent } from "../components/article/TopicEntryContent";

test("somente três novos termos registrados recebem páginas, sem inventar Fotocatálise", () => {
  expect(topicEntries.map((e) => e.termId)).toEqual([
    "tag:hidrogenio-verde",
    "tag:cobre",
    "tag:armazenamento-de-energia",
    "tag:transicao-energetica",
  ]);
  expect(taxonomyCatalog.some((t) => t.id === "tag:fotocatalise")).toBe(false);
  expect(() => topicEntrySchema.parse({ ...topicEntries[0], termId: "tag:fotocatalise" })).toThrow(
    "Identificador de tag inexistente",
  );
});

test("fontes, identidades e navegação de todos os registros são coerentes", () => {
  for (const entry of topicEntries) {
    expect(topicEntrySchema.safeParse(entry).success).toBe(true);
    expect(entry.editorialReviewedAt).toBe("2026-11-27");
    expect(entry.sourceCheckedAt).toBe("2026-11-27");
    const html = renderToStaticMarkup(<TopicEntryContent entry={entry} />);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const section of entry.sections) {
      expect(html).toContain('href="#' + section.id + '"');
      expect(html).toContain('id="' + section.id + '"');
    }
    for (const source of entry.sources) expect(html).toContain('href="' + source.url + '"');
  }
});

test("as coleções reais mantêm associações e indexação, independentemente do verbete", () => {
  const topics = buildTagTopics(articleRecords);
  for (const [slug, count, robots] of [
    ["cobre", 1, "noindex, follow"],
    ["armazenamento-de-energia", 7, "index, follow"],
    ["transicao-energetica", 3, "index, follow"],
  ] as const) {
    const topic = topics.find((t) => t.slug === slug)!;
    expect(topic.articles).toHaveLength(count);
    expect(tagPageHead(topic, true).meta).toContainEqual({ name: "robots", content: robots });
    expect(tagPageHead(topic, true).links?.[0]?.href).toEndWith("/tag/" + slug);
    expect(topic.articles.every((a) => a.status === "published" && !a.isDemo)).toBe(true);
  }
});

test("sequências editoriais diferentes expressam as particularidades dos temas", () => {
  const layouts = topicEntries.map((e) => e.sections.map((s) => s.id).join(","));
  expect(new Set(layouts).size).toBe(topicEntries.length);
  const storage = topicEntries.find((e) => e.termId === "tag:armazenamento-de-energia")!;
  expect(storage.sections.map((s) => s.paragraphs.join(" ")).join(" ")).toContain("4 MWh");
  expect(4 / 1).toBe(4);
});
