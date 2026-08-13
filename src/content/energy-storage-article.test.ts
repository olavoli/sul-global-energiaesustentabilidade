import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { parseEditorialFile } from "../../scripts/generate-content";
import { createContentRepository } from "./repository";
import { articleRecords } from "./generated/articles";

const slug = "por-que-armazenar-energia-e-tao-dificil";
const articlePath = new URL(`../../content/articles/${slug}.mdx`, import.meta.url);
const source = readFileSync(articlePath, "utf8");
const parsed = parseEditorialFile(source, `content/articles/${slug}.mdx`);
const repository = createContentRepository(articleRecords, false, "2026-08-12");

describe("ART-004 — Por que armazenar energia é tão difícil?", () => {
  test("é conteúdo real, publicado e sustentado por fontes institucionais", () => {
    expect(parsed.frontmatter).toMatchObject({
      slug,
      contentType: "explainer",
      status: "published",
      category: "energia",
      isDemo: false,
      approvedAt: "2026-08-12",
    });
    expect(parsed.frontmatter.sources).toHaveLength(5);
    expect(parsed.frontmatter.sources.every(({ isDemo }) => !isDemo)).toBeTrue();
  });

  test("é encontrado por rota, busca e categoria", () => {
    expect(repository.getArticleBySlug(slug)?.title).toContain("armazenar energia");
    expect(repository.searchArticles("armazenamento").map(({ slug }) => slug)).toContain(slug);
    expect(repository.getArticlesByCategory("energia").map(({ slug }) => slug)).toContain(slug);
  });

  test("explica potência, capacidade e duração sem solução universal", () => {
    for (const text of [
      "100 MW × 4 h = 400 MWh",
      "E = P × t",
      "até 10 horas",
      "de 10 a 36 horas",
      "de 36 a 160 horas",
      "acima de 160 horas",
      "caixa de ferramentas energéticas",
    ]) {
      expect(parsed.body).toContain(text);
    }
    expect(source).toContain(
      "curta duração (0–10 h), interdiária (10–36 h), vários dias (36–160 h) e sazonal (160+ h)",
    );
    expect(source).not.toContain("DIAS — 10 a 160 horas");
  });

  test("usa os três raster editoriais aprovados com variantes responsivas", () => {
    const assets = [
      "art-004-formas-de-armazenamento-editorial.png",
      "art-004-potencia-capacidade-editorial.png",
      "art-004-escalas-temporais-editorial.png",
    ];
    expect(parsed.frontmatter.cover.src).toContain(assets[0]);
    expect(parsed.frontmatter.cover.sources).toHaveLength(3);
    expect((source.match(/Fonte: Elaboração própria \(SGES, 2026\)/g) ?? []).length).toBe(3);
    for (const asset of assets) {
      expect(source).toContain(asset);
      expect(() =>
        readFileSync(new URL(`../../public/images/articles/${slug}/${asset}`, import.meta.url)),
      ).not.toThrow();
    }
  });
});
