import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

import { parseEditorialFile } from "../../scripts/generate-content";

const articlePath = new URL(
  "../../content/articles/uma-bateria-precisa-mesmo-ser-pequena.mdx",
  import.meta.url,
);
const source = readFileSync(articlePath, "utf8");
const parsed = parseEditorialFile(
  source,
  "content/articles/uma-bateria-precisa-mesmo-ser-pequena.mdx",
);
const imageRoot = new URL(
  "../../public/images/articles/uma-bateria-precisa-mesmo-ser-pequena/",
  import.meta.url,
);

describe("ART-010 — armazenamento de longa duração", () => {
  test("é conteúdo real, publicado e sustentado por fontes oficiais", () => {
    expect(parsed.frontmatter).toMatchObject({
      slug: "uma-bateria-precisa-mesmo-ser-pequena",
      status: "published",
      author: "olavo-oliveira",
      category: "tecnologia",
      isDemo: false,
      aiAssistance: "substantial",
    });
    expect(parsed.frontmatter.sources.every((item) => !item.isDemo)).toBeTrue();
    expect(parsed.frontmatter.sourceUrls.every((url) => !url.includes("utm_"))).toBeTrue();
  });

  test("preserva todas as ressalvas científicas auditadas", () => {
    for (const statement of [
      "duração (h) = energia (MWh) ÷ potência (MW)",
      "Essa é uma definição institucional, não uma fronteira física ou universal",
      "projetos de demonstração planejados com **10 MW e 100 horas cada**",
      "forma **parcialmente independente**",
      "distintas de reservatórios hidrelétricos convencionais",
      "As barras são ilustrativas, não limites técnicos rígidos",
      "produto brasileiro de quatro horas não é armazenamento multidias",
    ]) {
      expect(source).toContain(statement);
    }
  });

  test("usa três PNGs aprovados e nove derivados WebP responsivos", () => {
    const stems = [
      "art-010-armazenamento-estacionario-hero",
      "art-010-potencia-energia-duracao-editorial",
      "art-010-tecnologias-duracao-editorial",
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
