import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

import { parseEditorialFile } from "../../scripts/generate-content";

const articlePath = new URL(
  "../../content/articles/a-transicao-energetica-vai-ficar-sem-cobre.mdx",
  import.meta.url,
);
const source = readFileSync(articlePath, "utf8");
const parsed = parseEditorialFile(
  source,
  "content/articles/a-transicao-energetica-vai-ficar-sem-cobre.mdx",
);
const imageRoot = new URL(
  "../../public/images/articles/a-transicao-energetica-vai-ficar-sem-cobre/",
  import.meta.url,
);

describe("ART-012 — cobre e transição energética", () => {
  test("é conteúdo real, condensado e sustentado por fontes verificadas", () => {
    expect(parsed.frontmatter).toMatchObject({
      slug: "a-transicao-energetica-vai-ficar-sem-cobre",
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

  test("preserva as ressalvas científicas auditadas", () => {
    for (const statement of [
      "não significa que faltará um quarto de todo o cobre consumido",
      "oferta primária esperada",
      "não observações perfeitamente comparáveis",
      "não representa “o teor do cobre brasileiro”",
      "Sucata disponível não é cobre secundário pronto para uso",
      "Fundição e refino são etapas relacionadas, mas não sinônimas",
      "não substituto universal",
    ]) {
      expect(source).toContain(statement);
    }
    expect(source).not.toContain("79,3");
    expect(source).not.toContain("95,5%");
  });

  test("usa três PNGs aprovados e nove derivados WebP responsivos", () => {
    const stems = [
      "art-012-cobre-eletrificacao-hero",
      "art-012-cadeia-disponibilidade-editorial",
      "art-012-respostas-oferta-editorial",
    ];
    for (const stem of stems) {
      expect(existsSync(new URL(`${stem}.png`, imageRoot))).toBeTrue();
      for (const width of [720, 1200, 1536]) {
        expect(existsSync(new URL(`${stem}-${width}.webp`, imageRoot))).toBeTrue();
      }
    }
  });

  test("registra a proveniência verificada das três imagens", () => {
    expect(parsed.frontmatter.cover.credit).toBeUndefined();
    expect(parsed.frontmatter.cover.aiProvenance).toEqual({
      status: "verified",
      contributions: [{ role: "generation", tool: "GPT Image 2, OpenAI" }],
      year: 2026,
    });
    expect(source.match(/GPT Image 2, OpenAI/g)).toHaveLength(3);
    expect(parsed.frontmatter.cover.caption).toContain("Representação editorial conceitual");
    expect(source).toContain("Rotas, tecnologias e produtos intermediários variam");
    expect(source).toContain("Nenhuma estratégia resolve isoladamente o desafio");
  });
});
