import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { parseEditorialFile } from "../../scripts/generate-content";
import { createContentRepository } from "./repository";
import { articleRecords } from "./generated/articles";

const slug = "o-que-e-potencia";
const articlePath = new URL(`../../content/articles/${slug}.mdx`, import.meta.url);
const source = readFileSync(articlePath, "utf8");
const parsed = parseEditorialFile(source, `content/articles/${slug}.mdx`);
const repository = createContentRepository(articleRecords, false, "2026-08-12");

describe("ART-003 — O que é potência?", () => {
  test("é conteúdo real, publicado e sustentado por fontes oficiais", () => {
    expect(parsed.frontmatter).toMatchObject({
      slug,
      contentType: "explainer",
      status: "published",
      category: "energia",
      isDemo: false,
      approvedAt: "2026-08-12",
    });
    expect(parsed.frontmatter.sources).toHaveLength(4);
    expect(parsed.frontmatter.sources.every(({ isDemo }) => !isDemo)).toBeTrue();
  });

  test("é encontrado por rota, busca e categoria", () => {
    expect(repository.getArticleBySlug(slug)?.title).toContain("O que é potência");
    expect(repository.searchArticles("potência").map(({ slug }) => slug)).toContain(slug);
    expect(repository.getArticlesByCategory("energia").map(({ slug }) => slug)).toContain(slug);
  });

  test("preserva as relações científicas essenciais", () => {
    for (const text of [
      "P = ΔE / Δt",
      "1 W = 1 J/s",
      "E = P × t",
      "1 kWh = 3,6 MJ",
      "Energia: quanto.",
      "Potência: quão rápido.",
    ]) {
      expect(parsed.body).toContain(text);
    }
    expect(parsed.body).not.toContain("mais potente é mais eficiente");
  });

  test("usa apenas os dois raster editoriais aprovados com variantes responsivas", () => {
    const assets = ["art-003-elevadores-potencia-editorial.png", "art-003-kw-kwh-editorial.png"];
    expect(parsed.frontmatter.cover.src).toContain(assets[0]);
    expect(parsed.frontmatter.cover.sources).toHaveLength(3);
    expect(source).toContain(assets[1]);
    expect((source.match(/Fonte: Elaboração própria \(SGES, 2026\)\./g) ?? []).length).toBe(2);

    for (const asset of assets) {
      expect(() =>
        readFileSync(new URL(`../../public/images/articles/${slug}/${asset}`, import.meta.url)),
      ).not.toThrow();
    }
  });
});
