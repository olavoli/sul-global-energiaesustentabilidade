import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { getTopicEntry, topicEntries, topicEntrySchema } from "./topic-entries";
import { taxonomyCatalog, sourceTerm } from "./taxonomy-catalog";
import { buildTagTopics, getTagTopic } from "./tags";
import { articleRecords } from "./generated/articles";
import { tagPageHead } from "../lib/tag-seo";
import { TopicEntryContent } from "../components/article/TopicEntryContent";

const entry = getTopicEntry("hidrogenio-verde")!;

test("verbetes aprovados usam os IDs existentes, sem criar taxonomia", () => {
  expect(topicEntries).toHaveLength(4);
  expect(entry.termId).toBe(sourceTerm("tag", "hidrogênio verde").id);
  expect(entry.status).toBe("approved");
  expect(getTopicEntry("cobre")?.termId).toBe("tag:cobre");
  expect(getTopicEntry("fotocatalise")).toBeUndefined();
  expect(taxonomyCatalog.filter((term) => term.id === entry.termId)).toHaveLength(1);
});

test("referências são HTTPS e cada seção cita fontes cadastradas", () => {
  expect(entry.sections).toHaveLength(5);
  for (const section of entry.sections)
    for (const id of section.sourceIds)
      expect(entry.sources.some((source) => source.id === id)).toBe(true);
  expect(() => topicEntrySchema.parse({ ...entry, termId: "tag:inventada" })).toThrow();
  expect(() =>
    topicEntrySchema.parse({
      ...entry,
      sources: [...entry.sources, entry.sources[0]],
    }),
  ).toThrow();
  expect(() =>
    topicEntrySchema.parse({
      ...entry,
      sections: [{ ...entry.sections[0], sourceIds: ["inexistente"] }, ...entry.sections.slice(1)],
    }),
  ).toThrow();
  expect(() =>
    topicEntrySchema.parse({
      ...entry,
      sources: [{ ...entry.sources[0], url: "javascript:alert(1)" }, ...entry.sources.slice(1)],
    }),
  ).toThrow();
});

test("artigos relacionados vêm da associação exata no cadastro publicado", () => {
  const before = JSON.stringify(articleRecords);
  const topic = getTagTopic("hidrogenio-verde")!;
  const expected = buildTagTopics(articleRecords).find((item) => item.slug === topic.slug)!;
  expect(topic.articles.map((article) => article.slug)).toEqual(
    expected.articles.map((article) => article.slug),
  );
  expect(topic.articles.length).toBeGreaterThan(0);
  for (const article of topic.articles) {
    expect(article.status).toBe("published");
    expect(article.isDemo).toBe(false);
    expect(article.tags).toContain("hidrogênio verde");
  }
  expect(JSON.stringify(articleRecords)).toBe(before);
});

test("preserva canonical e indexabilidade, inclusive cobre e ambientes não oficiais", () => {
  const topic = getTagTopic("hidrogenio-verde")!;
  expect(tagPageHead(topic, true).links?.[0]?.href).toEndWith("/tag/hidrogenio-verde");
  expect(tagPageHead(topic, true).meta).toContainEqual({
    name: "robots",
    content: "index, follow",
  });
  expect(tagPageHead(getTagTopic("cobre"), true).meta).toContainEqual({
    name: "robots",
    content: "noindex, follow",
  });
  expect(tagPageHead(topic, false).meta).toContainEqual({
    name: "robots",
    content: "noindex, nofollow",
  });
});

test("conteúdo tem seções acessíveis, fontes navegáveis e exemplo limitado à parcela elétrica", () => {
  const html = renderToStaticMarkup(<TopicEntryContent entry={entry} />);
  for (const section of entry.sections) {
    expect(html).toContain('id="' + section.id + '"');
    expect(html).toContain('href="#' + section.id + '"');
    expect(html).toContain('aria-labelledby="' + section.id + '-title"');
  }
  for (const source of entry.sources) {
    expect(html).toContain('href="' + source.url + '"');
    expect(html).toContain('id="fonte-' + source.id + '"');
  }
  expect(html).toContain("focus-visible:outline");
  expect(html).toContain("não representa o custo total");
  expect(html).toContain("Revisão editorial aprovada em 27 de novembro de 2026.");
  expect(html).not.toContain("nenhuma aprovação científica humana foi registrada");
  expect((52 * 300) / 1000).toBe(15.6);
});

test("estrutura flexível separa definição e admite seções próprias sem criar aprovação humana", () => {
  expect(entry.editorialReviewedAt).toBe("2026-11-27");
  expect(entry.subtitle).toBe(
    "Entenda como o hidrogênio verde é produzido, onde pode ser utilizado e quais desafios ainda limitam sua expansão industrial.",
  );
  expect(entry.definition.title).toBe("O que é hidrogênio verde?");
  expect(
    topicEntrySchema.parse({
      ...entry,
      sections: [{ ...entry.sections[0], kind: "other", title: "Questão específica deste tema" }],
    }).sections,
  ).toHaveLength(1);
  expect(() => topicEntrySchema.parse({ ...entry, editorialReviewedAt: "2026-02-30" })).toThrow();
  expect(() =>
    topicEntrySchema.parse({ ...entry, sections: [{ ...entry.sections[0], id: "fontes" }] }),
  ).toThrow();
  expect(() =>
    topicEntrySchema.parse({
      ...entry,
      definition: { ...entry.definition, sourceIds: ["fonte-ausente"] },
    }),
  ).toThrow();
});

test("guia responsivo usa controle nativo e a definição mantém identidade própria", () => {
  const html = renderToStaticMarkup(<TopicEntryContent entry={entry} />);
  expect(html).toContain("<details");
  expect(html).toContain("<summary");
  expect(html).toContain("Definição científica");
  expect(html).toContain('id="definicao"');
  expect(html).toContain("27 de novembro de 2026");
  expect(
    entry.sections.find((section) => section.kind === "example")?.paragraphs.join(" "),
  ).toContain("consumos auxiliares");
});
