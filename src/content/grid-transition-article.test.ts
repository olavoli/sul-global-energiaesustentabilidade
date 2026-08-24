import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

import { parseEditorialFile } from "../../scripts/generate-content";

const articlePath = new URL(
  "../../content/articles/a-rede-eletrica-esta-preparada-para-a-transicao-energetica.mdx",
  import.meta.url,
);
const source = readFileSync(articlePath, "utf8");
const parsed = parseEditorialFile(
  source,
  "content/articles/a-rede-eletrica-esta-preparada-para-a-transicao-energetica.mdx",
);
const imageRoot = new URL(
  "../../public/images/articles/a-rede-eletrica-esta-preparada-para-a-transicao-energetica/",
  import.meta.url,
);

describe("ART-014 — rede elétrica e transição energética", () => {
  test("é conteúdo real, auditado e sustentado por fontes mundiais", () => {
    expect(parsed.frontmatter).toMatchObject({
      slug: "a-rede-eletrica-esta-preparada-para-a-transicao-energetica",
      status: "published",
      author: "olavo-oliveira",
      category: "energia",
      isDemo: false,
      aiAssistance: "substantial",
    });
    expect(source.split(/\s+/).length).toBeGreaterThan(1700);
    expect(source.split(/\s+/).length).toBeLessThan(3000);
    expect(parsed.frontmatter.sources.every((item) => !item.isDemo)).toBeTrue();
    expect(parsed.frontmatter.sourceUrls.every((url) => !url.includes("utm_"))).toBeTrue();
  });

  test("preserva as ressalvas factuais centrais", () => {
    for (const statement of [
      "São faixas indicativas, não médias universais",
      "não deve ser lido como capacidade que necessariamente será construída",
      "Esses ganhos não são universais nem somáveis",
      "não é tecnicamente correto atribuir à MMGD",
      "não prova, isoladamente, que UHV seja a opção",
      "isso é mais amplo do que “inércia sintética”",
    ]) {
      expect(source).toContain(statement);
    }
    expect(source).toContain("5 a 15 anos");
    expect(source).toContain("1 a 5 anos");
    expect(source).toContain("2.500 GW");
  });

  test("usa três PNGs e nove WebPs sem upscale", () => {
    const assets = [
      ["art-014-rede-eletrica-hero", [720, 1200, 1536]],
      ["art-014-fluxo-potencia-editorial", [720, 1200, 1536]],
      ["art-014-ferramentas-rede-editorial", [720, 1200, 1516]],
    ] as const;
    for (const [stem, widths] of assets) {
      expect(existsSync(new URL(`${stem}.png`, imageRoot))).toBeTrue();
      for (const width of widths) {
        expect(existsSync(new URL(`${stem}-${width}.webp`, imageRoot))).toBeTrue();
      }
    }
  });

  test("registra a proveniência distinta das imagens", () => {
    expect(parsed.frontmatter.cover.aiProvenance).toEqual({
      status: "verified",
      contributions: [{ role: "generation", tool: "Reve (app.reve.com)" }],
      year: 2026,
    });
    expect(source.match(/aiGenerationTool="GPT Image 2, OpenAI"/g)).toHaveLength(2);
    expect(source).not.toContain('aiGenerationTool="Reve (app.reve.com)"');
    expect(parsed.frontmatter.aiImageTools).toEqual(["Reve (app.reve.com)", "GPT Image 2, OpenAI"]);
  });

  test("mantém uma única bibliografia estruturada antes da transparência de IA", () => {
    expect(source).not.toMatch(/^## Referências$/m);
    expect(parsed.frontmatter.sources).toHaveLength(15);
    expect(new Set(parsed.frontmatter.sources.map(({ url }) => url)).size).toBe(15);
  });
});
