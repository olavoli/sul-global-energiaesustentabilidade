import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { compile, run } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import remarkFrontmatter from "remark-frontmatter";
import { editorialMdxComponents } from "@/components/editorial/mdx-components";
import { validateSafeMdx, parseEditorialFile } from "../../scripts/generate-content";

const source = readFileSync(
  "content/articles/a-inteligencia-artificial-vai-virar-um-problema-para-o-sistema-eletrico.mdx",
  "utf8",
);

describe("ART-021 — conversão corrigida para revisão", () => {
  test("corpo editorial aprovado permanece congelado", () => {
    const body = parseEditorialFile(source).body.replace(/\r\n/g, "\n").trim();
    expect(createHash("sha256").update(body).digest("hex")).toBe(
      "7a0988ec1ff6694debcd0e2c8743609788b391ddd9577e832ff69d015eb62395",
    );
  });

  test("pacote aprovado mantém quatro pontos explícitos e tabelas acessíveis", async () => {
    expect(parseEditorialFile(source).frontmatter.status).toBe("published");
    const compiled = await compile(source, {
      outputFormat: "function-body",
      remarkPlugins: [remarkFrontmatter],
    });
    const { default: Content } = await run(String(compiled), runtime);
    const html = renderToStaticMarkup(<Content components={editorialMdxComponents} />);
    expect((html.match(/<table /g) ?? []).length).toBe(2);
    expect((html.match(/<tr /g) ?? []).length).toBe(14);
    expect((html.match(/<td /g) ?? []).length).toBe(42);
    expect((html.match(/scope="col"/g) ?? []).length).toBe(6);
    expect((html.match(/role="region"/g) ?? []).length).toBe(2);
    expect((html.match(/<li>/g) ?? []).length).toBe(4);
    expect(html).toContain("<em>ChatGPT</em>");
    expect(html).toContain("<em>curtailment</em>");
    expect(html).toContain("<strong><em>Stranded Assets</em></strong>");
    expect(html).toContain("27,9 GW");
    expect(html).toContain("pode elevar a frequência");
    expect(html).toContain("<em>Three Mile Island");
    expect((html.match(/<img /g) ?? []).length).toBe(2);
    expect((html.match(/Fonte: SGES, \(2026\)\./g) ?? []).length).toBe(2);
    expect(html).toContain('class="sr-only"');
    expect(html).not.toContain("Ferramenta de imagens do Codex");
    expect(source).toContain('aiEditingTool="Ferramenta de imagens do Codex (OpenAI)"');
  });

  test("novos componentes não liberam HTML ou expressões executáveis", () => {
    expect(() =>
      validateSafeMdx('<EditorialTable title="Teste"><TableBody /></EditorialTable>', "teste"),
    ).not.toThrow();
    for (const unsafe of [
      "<script>alert(1)</script>",
      "<iframe />",
      "<TableCell>{alert(1)}</TableCell>",
    ]) {
      expect(() => validateSafeMdx(unsafe, "teste")).toThrow();
    }
  });

  test("suporte preserva sobrescritos, subscritos e negrito sem inventar formatação", async () => {
    const compiled = await compile(
      "<Strong>MW</Strong> H<Subscript>2</Subscript> m<Superscript>3</Superscript> <Emphasis>termo</Emphasis>",
      { outputFormat: "function-body" },
    );
    const { default: Content } = await run(String(compiled), runtime);
    const html = renderToStaticMarkup(<Content components={editorialMdxComponents} />);
    expect(html).toContain("<strong>MW</strong>");
    expect(html).toContain("H<sub>2</sub>");
    expect(html).toContain("m<sup>3</sup>");
  });
});
