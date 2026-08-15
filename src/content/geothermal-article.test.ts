import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

import { parseEditorialFile } from "../../scripts/generate-content";

const articlePath = new URL(
  "../../content/articles/geotermia-de-nova-geracao.mdx",
  import.meta.url,
);
const source = readFileSync(articlePath, "utf8");
const parsed = parseEditorialFile(source, "content/articles/geotermia-de-nova-geracao.mdx");
const imageRoot = new URL(
  "../../public/images/articles/geotermia-de-nova-geracao/",
  import.meta.url,
);

describe("ART-008 — geotermia de nova geração", () => {
  test("é conteúdo real, publicado e sustentado por fontes auditadas", () => {
    expect(parsed.frontmatter).toMatchObject({
      slug: "geotermia-de-nova-geracao",
      status: "published",
      author: "olavo-oliveira",
      category: "tecnologia",
      isDemo: false,
      aiAssistance: "substantial",
    });
    expect(parsed.frontmatter.sources.every((item) => !item.isDemo)).toBeTrue();
    expect(parsed.frontmatter.sourceUrls.every((url) => !url.includes("utm_"))).toBeTrue();
  });

  test("preserva as cautelas científicas das figuras e da seção brasileira", () => {
    for (const statement of [
      "não a presença de magma",
      "não existe uma sequência obrigatória",
      "tipicamente acima de **375 °C**",
      "O Brasil ainda não possui uma indústria comercial de EGS",
      "Pesquisa ativa não é usina pronta",
    ]) {
      expect(parsed.body).toContain(statement);
    }
  });

  test("usa três PNGs aprovados e nove derivados WebP responsivos", () => {
    const stems = [
      "art-008-poco-geotermico-hero",
      "art-008-como-funciona-egs-editorial",
      "art-008-tres-frentes-geotermia-editorial",
    ];
    for (const stem of stems) {
      expect(existsSync(new URL(`${stem}.png`, imageRoot))).toBeTrue();
      for (const width of [720, 1200, 1536]) {
        expect(existsSync(new URL(`${stem}-${width}.webp`, imageRoot))).toBeTrue();
      }
    }
  });

  test("aplica proveniência nominal comprovada às três imagens", () => {
    expect(source.match(/tool: "GPT Image 2, OpenAI"/g)).toHaveLength(1);
    expect(source.match(/aiGenerationTool="GPT Image 2, OpenAI"/g)).toHaveLength(2);
  });
});
