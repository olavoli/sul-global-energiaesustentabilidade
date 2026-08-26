import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

import { parseEditorialFile } from "../../scripts/generate-content";

const articlePath = new URL(
  "../../content/articles/por-que-o-hidrogenio-verde-nao-vai-substituir-toda-a-eletricidade.mdx",
  import.meta.url,
);
const source = readFileSync(articlePath, "utf8");
const parsed = parseEditorialFile(
  source,
  "content/articles/por-que-o-hidrogenio-verde-nao-vai-substituir-toda-a-eletricidade.mdx",
);
const imageRoot = new URL(
  "../../public/images/articles/por-que-o-hidrogenio-verde-nao-vai-substituir-toda-a-eletricidade/",
  import.meta.url,
);

describe("ART-015 — hidrogênio verde e eletrificação", () => {
  test("é conteúdo real, auditado e sustentado por fontes internacionais e brasileiras", () => {
    expect(parsed.frontmatter).toMatchObject({
      slug: "por-que-o-hidrogenio-verde-nao-vai-substituir-toda-a-eletricidade",
      status: "published",
      author: "olavo-oliveira",
      category: "energia",
      isDemo: false,
      aiAssistance: "substantial",
    });
    expect(source.split(/\s+/).length).toBeGreaterThan(1200);
    expect(source.split(/\s+/).length).toBeLessThan(2400);
    expect(parsed.frontmatter.sources).toHaveLength(8);
    expect(parsed.frontmatter.sources.every((item) => !item.isDemo)).toBeTrue();
    expect(parsed.frontmatter.sourceUrls.every((url) => !url.includes("utm_"))).toBeTrue();
  });

  test("preserva as ressalvas factuais centrais", () => {
    for (const statement of [
      "não há etapa final de reconversão em eletricidade",
      "não torna a eletrificação universal",
      "não são automaticamente “zero emissão”",
      "Anúncio não é operação",
      "“verde” e “baixo carbono” não devem ser usados como sinônimos",
      "não capacidade operacional",
    ]) {
      expect(source).toContain(statement);
    }
  });

  test("usa três PNGs e nove WebPs responsivos sem upscale", () => {
    const stems = [
      "art-015-hidrogenio-verde-hero",
      "art-015-cadeia-conversao-editorial",
      "art-015-eletrificacao-hidrogenio-editorial",
    ];
    for (const stem of stems) {
      expect(existsSync(new URL(`${stem}.png`, imageRoot))).toBeTrue();
      for (const width of [720, 1200, 1536]) {
        expect(existsSync(new URL(`${stem}-${width}.webp`, imageRoot))).toBeTrue();
      }
    }
  });

  test("registra a proveniência individual e a correção tipográfica", () => {
    expect(parsed.frontmatter.cover.aiProvenance).toEqual({
      status: "verified",
      contributions: [{ role: "generation", tool: "GPT Image 2, OpenAI" }],
      year: 2026,
    });
    expect(source.match(/aiGenerationTool="Reve \(app\.reve\.com\)"/g)).toHaveLength(1);
    expect(source.match(/aiGenerationTool="GPT Image 2, OpenAI"/g)).toHaveLength(1);
    expect(parsed.frontmatter.aiImageTools).toEqual(["Reve (app.reve.com)", "GPT Image 2, OpenAI"]);

    const provenance = readFileSync(
      new URL("../../content/research/art-015-images/proveniencia.md", import.meta.url),
      "utf8",
    );
    expect(provenance).not.toContain("elsponibilidade");
    expect(provenance).toContain("disponibilidade");
  });

  test("mantém uma única bibliografia estruturada", () => {
    expect(source).not.toMatch(/^## (Fontes e referências|Referências)$/m);
    expect(new Set(parsed.frontmatter.sources.map(({ url }) => url)).size).toBe(8);
  });
});
