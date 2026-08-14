import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

import { parseEditorialFile } from "../../scripts/generate-content";

const articlePath = new URL(
  "../../content/articles/temos-energia-por-que-nao-conseguimos-conecta-la-a-rede.mdx",
  import.meta.url,
);
const source = readFileSync(articlePath, "utf8");
const parsed = parseEditorialFile(
  source,
  "content/articles/temos-energia-por-que-nao-conseguimos-conecta-la-a-rede.mdx",
);
const imageRoot = new URL(
  "../../public/images/articles/temos-energia-por-que-nao-conseguimos-conecta-la-a-rede/",
  import.meta.url,
);

describe("ART-007 — conexão e capacidade da rede", () => {
  test("é conteúdo real, publicado e rastreável", () => {
    expect(parsed.frontmatter).toMatchObject({
      slug: "temos-energia-por-que-nao-conseguimos-conecta-la-a-rede",
      status: "published",
      author: "olavo-oliveira",
      category: "tecnologia",
      isDemo: false,
      aiAssistance: "limited",
    });
    expect(parsed.frontmatter.sources.every((item) => !item.isDemo)).toBeTrue();
    expect(parsed.frontmatter.sourceUrls.every((url) => !url.includes("utm_"))).toBeTrue();
  });

  test("explica todas as siglas na primeira ocorrência", () => {
    for (const expansion of [
      "classificação dinâmica da capacidade da linha",
      "Dynamic Line Rating",
      "tecnologias para ampliar o aproveitamento da rede",
      "Grid-Enhancing Technologies",
      "sistemas flexíveis de transmissão em corrente alternada",
      "Flexible AC Transmission Systems",
      "condutores de alta temperatura e baixa flecha",
      "High-Temperature Low-Sag",
    ]) {
      expect(parsed.body).toContain(expansion);
    }
  });

  test("mantém resultados e cenários explicitamente contextuais", () => {
    expect(parsed.body).toContain("estritamente ilustrativos");
    expect(parsed.body).toContain("não promessas universais");
    expect(parsed.body).toContain("em aplicações adequadas");
    expect(parsed.body).toContain("não elimina novas linhas");
  });

  test("usa três fontes PNG e nove derivados WebP responsivos", () => {
    const stems = [
      "art-007-transmissao-hero",
      "art-007-capacidade-termica-dinamica-editorial",
      "art-007-tres-tecnologias-rede-editorial",
    ];
    for (const stem of stems) {
      expect(existsSync(new URL(`${stem}.png`, imageRoot))).toBeTrue();
      for (const width of [720, 1200, 1536]) {
        expect(existsSync(new URL(`${stem}-${width}.webp`, imageRoot))).toBeTrue();
      }
    }
  });

  test("aplica o crédito editorial de IA às três imagens", () => {
    const credit =
      "Fonte: elaboração própria com auxílio de inteligência artificial (IA); direção editorial e conferência técnica: Olavo Oliveira, SGES (2026).";
    expect(source.split(credit)).toHaveLength(4);
  });
});
