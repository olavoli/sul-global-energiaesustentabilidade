import { expect, test } from "bun:test";
import { articleRecords } from "@/content/generated/articles";
import { createContentRepository } from "@/content/repository";
import { categories } from "@/data/categories";
import { categoryPageHead } from "./category-seo";
import { generateRobots, generateSitemap } from "./distribution";

const category = categories[0];
const articles = createContentRepository(
  articleRecords,
  false,
  "2026-10-22",
).getPublishedArticles();

test("categoria vazia mantém canonical e breadcrumb, mas não é indexável", () => {
  const head = categoryPageHead(category, 0, true);
  expect(head.meta).toContainEqual({ name: "robots", content: "noindex, follow" });
  expect(head.links[0].href).toEndWith(`/categoria/${category.slug}`);
  expect(head.meta).toContainEqual({ title: `${category.name} — Sul Global` });
  expect(JSON.parse(head.scripts[0].children)["@type"]).toBe("BreadcrumbList");
});

test("categoria preenchida preserva indexação implícita, canonical e metadados", () => {
  for (const count of [1, 2, 10]) {
    const head = categoryPageHead(category, count, true);
    expect(head.meta.some((meta) => "name" in meta && meta.name === "robots")).toBe(false);
    expect(head.links[0].href).toEndWith(`/categoria/${category.slug}`);
    expect(head.meta).toContainEqual({ name: "description", content: category.description });
  }
});

test("categorias vazias ou preenchidas não liberam indexação fora da produção", () => {
  for (const count of [0, 1]) {
    expect(categoryPageHead(category, count, false).meta).toContainEqual({
      name: "robots",
      content: "noindex, nofollow",
    });
  }
});

test("sitemap acompanha a primeira publicação e a remoção da última em qualquer categoria", () => {
  const article = articles[0];
  if (!article) throw new Error("É necessário um artigo publicado para a fixture de distribuição.");
  for (const target of categories) {
    const path = `/categoria/${target.slug}</loc>`;
    expect(generateSitemap([])).not.toContain(path);
    expect(generateSitemap([{ ...article, category: target.slug }])).toContain(path);
  }
});

test("acervo real mantém somente categorias preenchidas no sitemap e preserva artigos", () => {
  const sitemap = generateSitemap(articles);
  for (const target of categories) {
    const path = `/categoria/${target.slug}</loc>`;
    expect(sitemap.includes(path)).toBe(
      articles.some((article) => article.category === target.slug),
    );
  }
  for (const article of articles) {
    expect(sitemap).toContain(article.canonicalUrl ?? `/artigo/${article.slug}`);
  }
  expect(sitemap).not.toContain("/busca");
  expect(generateSitemap(articles, false)).not.toContain("<url>");
  expect(generateRobots(true)).toContain("Allow: /");
});
