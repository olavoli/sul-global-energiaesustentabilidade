import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { parseEditorialFile } from "../../scripts/generate-content";

const articles = {
  art007: "temos-energia-por-que-nao-conseguimos-conecta-la-a-rede",
  art008: "geotermia-de-nova-geracao",
  art009: "perovskita-silicio-por-que-empilhar-duas-celulas-solares",
  art010: "uma-bateria-precisa-mesmo-ser-pequena",
} as const;

function readArticle(slug: string) {
  const path = `content/articles/${slug}.mdx`;
  const source = readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
  return { source, frontmatter: parseEditorialFile(source, path).frontmatter };
}

describe("migração de proveniência C2PA — ART-008 a ART-010", () => {
  test.each([
    [articles.art008, 3],
    [articles.art009, 3],
    [articles.art010, 2],
  ])("atribui somente os ativos comprovados de %s", (slug, expectedCredits) => {
    const { source, frontmatter } = readArticle(slug);
    if (!frontmatter.publishedAt) throw new Error(`${slug} precisa de publishedAt`);
    const publicationYear = Number(frontmatter.publishedAt.slice(0, 4));

    expect(frontmatter.cover.aiProvenance).toEqual({
      status: "verified",
      contributions: [{ role: "generation", tool: "GPT Image 2, OpenAI" }],
      year: publicationYear,
    });
    expect(source.match(/GPT Image 2, OpenAI/g)).toHaveLength(expectedCredits);
    expect(source.match(new RegExp(`aiCreditYear="${publicationYear}"`, "g"))).toHaveLength(
      expectedCredits - 1,
    );
  });

  test("mantém ART-007 sem atribuição nominal", () => {
    const { source, frontmatter } = readArticle(articles.art007);
    expect(frontmatter.cover.aiProvenance).toBeUndefined();
    expect(source).not.toContain("GPT Image 2, OpenAI");
  });

  test("mantém a Figura 3 do ART-010 sem atribuição nominal", () => {
    const { source } = readArticle(articles.art010);
    const figure3 = source.slice(
      source.indexOf(
        'src="/images/articles/uma-bateria-precisa-mesmo-ser-pequena/art-010-tecnologias-duracao-editorial.png"',
      ),
    );

    expect(figure3).not.toContain("GPT Image 2, OpenAI");
    expect(figure3).not.toContain("aiProvenanceStatus");
    expect(figure3).toContain("Fonte: elaboração própria com auxílio de inteligência artificial");
  });
});
