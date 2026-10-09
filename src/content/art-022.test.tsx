import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { compile, run } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import remarkFrontmatter from "remark-frontmatter";
import { editorialMdxComponents } from "@/components/editorial/mdx-components";
import { parseEditorialFile, validateSafeMdx } from "../../scripts/generate-content";

const source = readFileSync(
  "content/articles/a-bomba-dagua-que-nao-precisa-de-eletricidade.mdx",
  "utf8",
);

describe("ART-022 — integração canônica do DOCX v2", () => {
  test("corpo científico/editorial aprovado permanece congelado", () => {
    const body = parseEditorialFile(source)
      .body.replace(/\r\n/g, "\n")
      .split("## Bibliografia complementar")[0]
      .trim();
    expect(createHash("sha256").update(body).digest("hex")).toBe(
      "834bfa4dd57e6001fc9d057716204d4401e2243fcb0999aabb32d090715a95b4",
    );
  });

  test("preserva quatro pontos, tabela 9×3 e 25 estruturas matemáticas", async () => {
    const compiled = await compile(source, {
      outputFormat: "function-body",
      remarkPlugins: [remarkFrontmatter],
    });
    const { default: Content } = await run(String(compiled), runtime);
    const html = renderToStaticMarkup(<Content components={editorialMdxComponents} />);

    expect((html.match(/<li>/g) ?? []).length).toBe(4);
    expect((html.match(/<table /g) ?? []).length).toBe(1);
    expect((html.match(/<tr /g) ?? []).length).toBe(9);
    expect((html.match(/<td /g) ?? []).length).toBe(24);
    expect((html.match(/scope="col"/g) ?? []).length).toBe(3);
    expect((html.match(/role="math"/g) ?? []).length).toBe(17);
    expect((html.match(/role="math" class="block/g) ?? []).length).toBe(8);
    expect(
      (html.match(/role="math"/g) ?? []).length +
        (html.match(/role="math" class="block/g) ?? []).length,
    ).toBe(25);
    expect(html).toContain("m/s<sup>2</sup>");
    expect(html).toContain("kg/m<sup>3</sup>");
    expect(html).toContain("<em>off-grid</em>");
  });

  test("usa somente as três imagens aprovadas e separa crédito de proveniência", () => {
    expect((source.match(/Fonte: SGES, \(2026\)\./g) ?? []).length).toBe(0);
    expect((source.match(/aiCreditYear="2026"/g) ?? []).length).toBe(2);
    expect((source.match(/aiGenerationTool="Reve \(app\.reve\.com\)"/g) ?? []).length).toBe(2);
    expect(
      (source.match(/aiEditingTool="Ferramenta de imagens do Codex \(OpenAI\)"/g) ?? []).length,
    ).toBe(1);
    expect(source).toContain("art-022-figura-3-corrigida.png");
    expect(source).not.toContain("<YouTubeEmbed");
  });

  test("preserva oito referências sem repetir as três fontes estruturadas na bibliografia", () => {
    const { frontmatter, body } = parseEditorialFile(source);
    expect(frontmatter.sources).toHaveLength(3);
    expect(frontmatter.sources.map(({ organizationOrAuthor }) => organizationOrAuthor)).toEqual([
      "FAO — P. L. Fraenkel",
      "NC State Extension — Greg Jennings",
      "Epagri",
    ]);
    const bibliography = body.split("## Bibliografia complementar")[1];
    for (const name of [
      "EMBRAPA",
      "Fox, R. W.",
      "Streeter, V. L.",
      "Munson, B. R.",
      "PRACTICAL ACTION",
    ]) {
      expect(bibliography).toContain(name);
    }
    for (const source of frontmatter.sources) {
      expect(bibliography).not.toContain(source.url);
      expect(source.note).toContain("Uso:");
    }
    expect(body).not.toContain("## Fontes e referências");
    expect(body).toContain("https://www.youtube.com/watch?v=6sqSbXuB6Nk");
  });

  test("componente matemático não libera HTML ou expressões executáveis", () => {
    expect(() =>
      validateSafeMdx("<MathExpression>P<Subscript>d</Subscript></MathExpression>", "teste"),
    ).not.toThrow();
    expect(() => validateSafeMdx("<MathExpression>{alert(1)}</MathExpression>", "teste")).toThrow();
  });
});
