import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

import { parseEditorialFile } from "../../scripts/generate-content";

const articlePath = new URL(
  "../../content/articles/perovskita-silicio-por-que-empilhar-duas-celulas-solares.mdx",
  import.meta.url,
);
const source = readFileSync(articlePath, "utf8");
const parsed = parseEditorialFile(
  source,
  "content/articles/perovskita-silicio-por-que-empilhar-duas-celulas-solares.mdx",
);
const imageRoot = new URL(
  "../../public/images/articles/perovskita-silicio-por-que-empilhar-duas-celulas-solares/",
  import.meta.url,
);

describe("ART-009 — tandem perovskita-silício", () => {
  test("é conteúdo real, publicado e sustentado por fontes auditadas", () => {
    expect(parsed.frontmatter).toMatchObject({
      slug: "perovskita-silicio-por-que-empilhar-duas-celulas-solares",
      status: "published",
      author: "olavo-oliveira",
      category: "tecnologia",
      isDemo: false,
      aiAssistance: "substantial",
    });
    expect(parsed.frontmatter.sources.every((item) => !item.isDemo)).toBeTrue();
    expect(parsed.frontmatter.sourceUrls.every((url) => !url.includes("utm_"))).toBeTrue();
  });

  test("preserva as cautelas científicas e a distinção brasileira", () => {
    for (const statement of [
      "energia de banda proibida (_band gap_)",
      "não possui uma fronteira rígida por cor",
      "1,92 m² e eficiência de 25,6%",
      "O marcador de 1,9 m na ilustração é apenas gráfico",
      "pesquisa brasileira em perovskitas não equivale a uma indústria brasileira de módulos tandem",
    ]) {
      expect(parsed.body).toContain(statement);
    }
  });

  test("usa três PNGs aprovados e nove derivados WebP responsivos", () => {
    const stems = [
      "art-009-tandem-hero",
      "art-009-dividir-espectro-editorial",
      "art-009-celula-modulo-produto-editorial",
    ];
    for (const stem of stems) {
      expect(existsSync(new URL(`${stem}.png`, imageRoot))).toBeTrue();
      for (const width of [720, 1200, 1536]) {
        expect(existsSync(new URL(`${stem}-${width}.webp`, imageRoot))).toBeTrue();
      }
    }
  });

  test("aplica crédito editorial de IA às três imagens", () => {
    const credit =
      "Fonte: elaboração própria com auxílio de inteligência artificial (IA); direção editorial e conferência técnica: Olavo Oliveira, SGES (2026).";
    expect(source.split(credit)).toHaveLength(4);
  });
});
