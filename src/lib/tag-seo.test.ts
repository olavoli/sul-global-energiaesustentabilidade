import { expect, test } from "bun:test";
import { tagPageHead } from "./tag-seo";

const topic = { name: "energia solar", slug: "energia-solar", indexable: true };

test("tema com cobertura é indexável somente em produção oficial", () => {
  expect(tagPageHead(topic, true).meta).toContainEqual({
    name: "robots",
    content: "index, follow",
  });
  expect(tagPageHead(topic, false).meta).toContainEqual({
    name: "robots",
    content: "noindex, nofollow",
  });
});

test("tema de um artigo fica noindex e mantém canonical próprio", () => {
  const head = tagPageHead({ ...topic, indexable: false }, true);
  expect(head.meta).toContainEqual({ name: "robots", content: "noindex, follow" });
  expect(head.links?.[0].href).toEndWith("/tag/energia-solar");
  expect(head.meta).toContainEqual({ title: "energia solar — Temas — Sul Global" });
  expect(head.meta.some((meta) => "property" in meta && meta.property === "og:url")).toBe(true);
});

test("tema inexistente não recebe canonical nem indexação", () => {
  const head = tagPageHead(undefined, true);
  expect(head.meta).toContainEqual({ name: "robots", content: "noindex, follow" });
  expect(head.links).toBeUndefined();
});
