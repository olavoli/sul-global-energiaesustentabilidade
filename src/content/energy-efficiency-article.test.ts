import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { parseEditorialFile } from "../../scripts/generate-content";
import { createContentRepository } from "./repository";
import { articleRecords } from "./generated/articles";

const slug = "por-que-nenhuma-maquina-e-100-eficiente";
const articlePath = new URL(`../../content/articles/${slug}.mdx`, import.meta.url);
const source = readFileSync(articlePath, "utf8");
const parsed = parseEditorialFile(source, `content/articles/${slug}.mdx`);
const repository = createContentRepository(articleRecords, false, "2026-08-12");

describe("ART-002 — Por que nenhuma máquina é 100% eficiente?", () => {
  test("possui frontmatter real, aprovado e fontes institucionais", () => {
    expect(parsed.frontmatter).toMatchObject({
      slug,
      contentType: "explainer",
      status: "published",
      category: "energia",
      readingTime: 4,
      isDemo: false,
      approvedAt: "2026-08-12",
    });
    expect(parsed.frontmatter.sources).toHaveLength(3);
    expect(parsed.frontmatter.sources.every(({ isDemo }) => !isDemo)).toBeTrue();
  });

  test("é encontrado por rota, busca e categoria", () => {
    expect(repository.getArticleBySlug(slug)?.title).toBe(
      "Por que nenhuma máquina é 100% eficiente?",
    );
    expect(repository.searchArticles("eficiência").map(({ slug }) => slug)).toContain(slug);
    expect(repository.getArticlesByCategory("energia").map(({ slug }) => slug)).toContain(slug);
  });

  test("preserva a narrativa canônica e não inventa links futuros", () => {
    for (const text of [
      "## O que significa eficiência?",
      "Eficiência = energia útil / energia fornecida",
      "## Então a energia foi perdida?",
      "## Por que não conseguimos aproveitar tudo?",
      "## Eficiência depende da tecnologia",
      "## Em uma frase",
      "[O que é energia?](/artigo/o-que-e-energia)",
    ]) {
      expect(parsed.body).toContain(text);
    }
    expect(parsed.body).not.toContain("/artigo/o-que-e-potencia");
    expect(parsed.body).not.toContain("/artigo/o-que-e-entropia");
  });

  test("usa os raster editoriais aprovados e mantém o comparativo vetorial necessário", () => {
    const filenames = [
      "art-002-hero-editorial.png",
      "art-002-util-para-que.png",
      "art-002-energia-nao-desaparece.png",
      "art-002-diferentes-conversoes-editorial.png",
    ];
    expect(parsed.frontmatter.cover.src).toContain(filenames[0]);
    expect(parsed.frontmatter.cover.sources).toHaveLength(3);
    expect(source).not.toContain("panOnMobile");
    expect((source.match(/Fonte: Elaboração própria \(SGES, 2026\)\./g) ?? []).length).toBe(4);

    for (const filename of filenames) {
      expect(() =>
        readFileSync(new URL(`../../public/images/articles/${slug}/${filename}`, import.meta.url)),
      ).not.toThrow();
    }

    expect(source).toContain("art-002-diferentes-conversoes-editorial-1537.webp");
    expect(source).not.toContain("diferentes-conversoes.svg");
  });
});
