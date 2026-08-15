import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

import { parseEditorialFile } from "../../scripts/generate-content";

const articlePath = new URL(
  "../../content/articles/o-que-acontece-com-um-painel-solar-no-fim-da-vida.mdx",
  import.meta.url,
);
const source = readFileSync(articlePath, "utf8");
const parsed = parseEditorialFile(
  source,
  "content/articles/o-que-acontece-com-um-painel-solar-no-fim-da-vida.mdx",
);
const imageRoot = new URL(
  "../../public/images/articles/o-que-acontece-com-um-painel-solar-no-fim-da-vida/",
  import.meta.url,
);

describe("ART-011 — fim da vida de módulos fotovoltaicos", () => {
  test("é conteúdo real, aprofundado e sustentado por fontes verificadas", () => {
    expect(parsed.frontmatter).toMatchObject({
      slug: "o-que-acontece-com-um-painel-solar-no-fim-da-vida",
      status: "published",
      author: "olavo-oliveira",
      category: "sustentabilidade",
      isDemo: false,
      aiAssistance: "substantial",
    });
    expect(source.split(/\s+/).length).toBeGreaterThan(3500);
    expect(parsed.frontmatter.sources.every((item) => !item.isDemo)).toBeTrue();
    expect(parsed.frontmatter.sourceUrls.every((url) => !url.includes("utm_"))).toBeTrue();
  });

  test("preserva as ressalvas científicas e regulatórias auditadas", () => {
    for (const statement of [
      "aproximadamente 3 terawatts no fim de 2025",
      "nem pode ser comparado a ela como se todos os valores tivessem sido produzidos pela mesma metodologia",
      "Não existe uma composição percentual universal",
      "O Anexo I do decreto inclui expressamente “painel fotovoltaico”",
      "Projeto de lei em tramitação não é legislação vigente",
      "resultado condicionado de um modelo acadêmico, não previsão oficial",
      "não foi localizado um conjunto público nacional, consolidado e especificamente desagregado",
      "Recuperação material não significa automaticamente ciclo fechado",
    ]) {
      expect(source).toContain(statement);
    }
  });

  test("usa três PNGs aprovados e nove derivados WebP responsivos", () => {
    const stems = [
      "art-011-modulo-multicamadas-hero",
      "art-011-massa-valor-editorial",
      "art-011-caminhos-fim-da-vida-editorial",
    ];
    for (const stem of stems) {
      expect(existsSync(new URL(`${stem}.png`, imageRoot))).toBeTrue();
      for (const width of [720, 1200, 1536]) {
        expect(existsSync(new URL(`${stem}-${width}.webp`, imageRoot))).toBeTrue();
      }
    }
  });

  test("explicita os limites conceituais das três ilustrações", () => {
    expect(parsed.frontmatter.cover.caption).toContain(
      "A separação e as espessuras são ilustrativas",
    );
    expect(source).toContain("Materiais, espessuras e arquitetura variam conforme o módulo");
    expect(source).toContain(
      "não necessariamente a saída física de um processo industrial específico",
    );
    expect(parsed.frontmatter.cover.credit).toBeUndefined();
    expect(parsed.frontmatter.cover.aiProvenance).toEqual({
      status: "verified",
      contributions: [{ role: "generation", tool: "GPT Image 2, OpenAI" }],
      year: 2026,
    });
    expect(source.match(/GPT Image 2, OpenAI/g)).toHaveLength(3);
    expect(source).not.toContain("elaboração própria com auxílio de inteligência artificial");
  });
});
