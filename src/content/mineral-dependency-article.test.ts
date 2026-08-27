import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

import { parseEditorialFile } from "../../scripts/generate-content";

const articlePath = new URL(
  "../../content/articles/a-transicao-energetica-vai-trocar-petroleo-por-minerais-criticos.mdx",
  import.meta.url,
);
const source = readFileSync(articlePath, "utf8");
const parsed = parseEditorialFile(
  source,
  "content/articles/a-transicao-energetica-vai-trocar-petroleo-por-minerais-criticos.mdx",
);
const imageRoot = new URL(
  "../../public/images/articles/a-transicao-energetica-vai-trocar-petroleo-por-minerais-criticos/",
  import.meta.url,
);

describe("ART-016 — dependência mineral e transição energética", () => {
  test("é conteúdo real, auditado e sustentado por fontes mundiais e brasileiras", () => {
    expect(parsed.frontmatter).toMatchObject({
      slug: "a-transicao-energetica-vai-trocar-petroleo-por-minerais-criticos",
      status: "published",
      author: "olavo-oliveira",
      category: "energia",
      isDemo: false,
      aiAssistance: "substantial",
    });
    expect(source.split(/\s+/).length).toBeGreaterThan(1200);
    expect(source.split(/\s+/).length).toBeLessThan(2200);
    expect(parsed.frontmatter.sources).toHaveLength(9);
    expect(parsed.frontmatter.sources.every((item) => !item.isDemo)).toBeTrue();
    expect(parsed.frontmatter.sourceUrls.every((url) => !url.includes("utm_"))).toBeTrue();
  });

  test("preserva as ressalvas factuais centrais", () => {
    for (const statement of [
      "não existe uma lista universal",
      "não são “combustíveis”",
      "reciclagem não é disponibilidade imediata",
      "não garantem diversificação",
      "não formam um ranking diretamente comparável",
      "São projeções condicionais",
    ])
      expect(source).toContain(statement);
  });

  test("usa três PNGs e nove WebPs responsivos sem associações minerais incorretas", () => {
    const stems = [
      "art-016-dependencia-mineral-hero",
      "art-016-cadeias-minerais-editorial",
      "art-016-seguranca-mineral-editorial",
    ];
    for (const stem of stems) {
      expect(existsSync(new URL(`${stem}.png`, imageRoot))).toBeTrue();
      for (const width of [720, 1200, 1536])
        expect(existsSync(new URL(`${stem}-${width}.webp`, imageRoot))).toBeTrue();
    }
    expect(source).not.toContain("lítio a painel fotovoltaico");
    expect(source).not.toContain("grafite a motor elétrico");
    expect(source).toContain(
      "Mineral, material processado, componente e produto final são etapas distintas",
    );
  });

  test("registra proveniência individual comprovada", () => {
    expect(parsed.frontmatter.cover.aiProvenance).toEqual({
      status: "verified",
      contributions: [{ role: "generation", tool: "Reve (app.reve.com)" }],
      year: 2026,
    });
    expect(source.match(/aiGenerationTool="GPT Image 2, OpenAI"/g)).toHaveLength(2);
    expect(parsed.frontmatter.aiImageTools).toEqual(["Reve (app.reve.com)", "GPT Image 2, OpenAI"]);
  });

  test("mantém uma única bibliografia estruturada", () => {
    expect(source).not.toMatch(/^## (Fontes e referências|Referências)$/m);
    expect(new Set(parsed.frontmatter.sources.map(({ url }) => url)).size).toBe(9);
  });
});
