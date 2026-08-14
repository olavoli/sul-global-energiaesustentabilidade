import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

import { parseEditorialFile } from "../../scripts/generate-content";
import { articleRecords } from "./generated/articles";
import { createContentRepository } from "./repository";

const slug = "fusao-nuclear-esta-mais-perto-mas-perto-de-que";
const articlePath = new URL(`../../content/articles/${slug}.mdx`, import.meta.url);
const source = readFileSync(articlePath, "utf8");
const parsed = parseEditorialFile(source, `content/articles/${slug}.mdx`);
const repository = createContentRepository(articleRecords, false, "2026-08-13");

describe("ART-006 — Fusão nuclear está mais perto. Mas perto de quê?", () => {
  test("é conteúdo real publicado e acessível na categoria Ciência", () => {
    expect(parsed.frontmatter).toMatchObject({
      slug,
      status: "published",
      category: "ciencia",
      author: "olavo-oliveira",
      isDemo: false,
    });
    expect(repository.getArticleBySlug(slug)?.title).toBe(
      "Fusão nuclear está mais perto. Mas perto de quê?",
    );
    expect(repository.getArticlesByCategory("ciencia").map((article) => article.slug)).toContain(
      slug,
    );
  });

  test("preserva fontes institucionais auditadas sem rastreamento", () => {
    const urls = parsed.frontmatter.sources.map(({ url }) => url);
    expect(urls.some((url) => url.includes("annual.llnl.gov"))).toBeTrue();
    expect(urls.some((url) => url.includes("iter.org/machine/blanket"))).toBeTrue();
    expect(urls.some((url) => url.includes("energy.gov/fusion"))).toBeTrue();
    expect(urls.some((url) => url.includes("nature.com/articles/s41560-026-02023-8"))).toBeTrue();
    expect(urls.every((url) => !url.includes("utm_"))).toBeTrue();
  });

  test("mantém as ressalvas científicas das figuras", () => {
    expect(source).toContain("2,08 MJ");
    expect(source).toContain("8,6 MJ");
    expect(source).toContain("Q_alvo");
    expect(source).toContain(
      "Exemplo de cadeia D–T; esquema funcional, não arquitetura de uma planta específica.",
    );
    expect(source).toContain("Isso não descreve uma arquitetura universal");
    expect(source).toContain("não são confinados por campos magnéticos");
  });

  test("inclui os três PNGs editoriais e nove derivados WebP", () => {
    const names = [
      "art-006-plasma-hero",
      "art-006-ganho-alvo-planta-editorial",
      "art-006-breeding-blanket-editorial",
    ];
    const assetRoot = new URL(`../../public/images/articles/${slug}/`, import.meta.url);

    for (const name of names) {
      expect(existsSync(new URL(`${name}.png`, assetRoot))).toBeTrue();
      for (const width of [720, 1200, 1536]) {
        expect(existsSync(new URL(`${name}-${width}.webp`, assetRoot))).toBeTrue();
      }
    }
  });
});
