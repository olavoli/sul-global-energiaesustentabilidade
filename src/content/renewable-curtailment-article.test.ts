import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

import { parseEditorialFile } from "../../scripts/generate-content";

const articlePath = new URL(
  "../../content/articles/por-que-usinas-solares-e-eolicas-precisam-reduzir-a-geracao.mdx",
  import.meta.url,
);
const source = readFileSync(articlePath, "utf8");
const parsed = parseEditorialFile(
  source,
  "content/articles/por-que-usinas-solares-e-eolicas-precisam-reduzir-a-geracao.mdx",
);
const imageRoot = new URL(
  "../../public/images/articles/por-que-usinas-solares-e-eolicas-precisam-reduzir-a-geracao/",
  import.meta.url,
);

describe("ART-013 — restrição de geração renovável", () => {
  test("é conteúdo real, auditado e sustentado por fontes internacionais", () => {
    expect(parsed.frontmatter).toMatchObject({
      slug: "por-que-usinas-solares-e-eolicas-precisam-reduzir-a-geracao",
      status: "published",
      author: "olavo-oliveira",
      category: "energia",
      isDemo: false,
      aiAssistance: "substantial",
    });
    expect(source.split(/\s+/).length).toBeGreaterThan(1500);
    expect(source.split(/\s+/).length).toBeLessThan(2600);
    expect(parsed.frontmatter.sources.every((item) => !item.isDemo)).toBeTrue();
    expect(parsed.frontmatter.sourceUrls.every((url) => !url.includes("utm_"))).toBeTrue();
  });

  test("preserva as ressalvas factuais centrais", () => {
    for (const statement of [
      "não é energia historicamente desperdiçada",
      "não representa compensação universal",
      "não devem ser convertidos em “6% e 5% de curtailment”",
      "não podem ser comparados diretamente",
      "não substitui a expansão necessária da transmissão",
      "Algum *curtailment* pode integrar a solução de menor custo total",
    ]) {
      expect(source).toContain(statement);
    }
    expect(source).toContain("Gigawatt (GW)");
    expect(source).toContain("gigawatt-hora (GWh)");
  });

  test("usa três PNGs aprovados e nove WebPs responsivos", () => {
    const stems = [
      "art-013-curtailment-hero",
      "art-013-gerar-entregar-editorial",
      "art-013-portfolio-flexibilidade-editorial",
    ];
    for (const stem of stems) {
      expect(existsSync(new URL(`${stem}.png`, imageRoot))).toBeTrue();
      for (const width of [720, 1200, 1536]) {
        expect(existsSync(new URL(`${stem}-${width}.webp`, imageRoot))).toBeTrue();
      }
    }
  });

  test("registra proveniência verificada nas três imagens", () => {
    expect(parsed.frontmatter.cover.aiProvenance).toEqual({
      status: "verified",
      contributions: [{ role: "generation", tool: "GPT Image 2, OpenAI" }],
      year: 2026,
    });
    expect(source.match(/aiGenerationTool="GPT Image 2, OpenAI"/g)).toHaveLength(2);
    expect(parsed.frontmatter.cover.caption).toContain("não atribui a restrição a uma causa única");
    expect(source).toContain("a combinação depende da causa, duração, frequência e localização");
  });

  test("consolida a ferramenta comprovada para o bloco final de transparência", () => {
    expect(parsed.frontmatter.aiImageTools).toEqual(["GPT Image 2, OpenAI"]);
    expect(source.match(/aiGenerationTool="GPT Image 2, OpenAI"/g)).toHaveLength(2);
    expect(parsed.frontmatter.cover.aiProvenance?.contributions).toEqual([
      { role: "generation", tool: "GPT Image 2, OpenAI" },
    ]);
  });
});
