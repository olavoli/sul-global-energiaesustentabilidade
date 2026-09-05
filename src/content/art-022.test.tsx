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
  test("corpo editorial aprovado permanece congelado", () => {
    const body = parseEditorialFile(source).body.replace(/\r\n/g, "\n").trim();
    expect(createHash("sha256").update(body).digest("hex")).toBe(
      "13e30437acb9e0c4aba06ebf148fd6e325d58e47edb7a3ce39b3a184ec488ec9",
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

  test("componente matemático não libera HTML ou expressões executáveis", () => {
    expect(() =>
      validateSafeMdx("<MathExpression>P<Subscript>d</Subscript></MathExpression>", "teste"),
    ).not.toThrow();
    expect(() => validateSafeMdx("<MathExpression>{alert(1)}</MathExpression>", "teste")).toThrow();
  });
});
