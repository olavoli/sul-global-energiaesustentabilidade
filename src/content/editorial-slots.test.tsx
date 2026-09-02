import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { compile, run } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import remarkFrontmatter from "remark-frontmatter";
import { editorialMdxComponents } from "@/components/editorial/mdx-components";
import { remarkEditorialSlots } from "./remark-editorial-slots";

async function renderSlots(source: string) {
  const code = await compile(source, {
    outputFormat: "function-body",
    remarkPlugins: [remarkFrontmatter, remarkEditorialSlots],
  });
  const { default: Content } = await run(String(code), runtime);
  const render = (section: string) =>
    renderToStaticMarkup(
      <Content
        components={{
          ...editorialMdxComponents,
          EditorialSlot: ({ section: slot, children }: { section: string; children: ReactNode }) =>
            slot === section ? children : null,
        }}
      />,
    );
  return { body: render("body"), keyPoints: render("keyPoints"), references: render("references") };
}

describe("consolidação dos blocos editoriais históricos", () => {
  test("reutiliza KeyPoints explícito, preserva texto e não deixa resumo órfão", async () => {
    const result = await renderSlots(
      "Parágrafo canônico: 25 MW.\n\n## Em resumo\n\n<KeyPoints>\n\n- Ponto **aprovado**: 25 MW.\n\n</KeyPoints>\n\n## Continue aprendendo\n\n- [Legado](/artigo/legado)\n\n## Referências\n\nFonte intacta.\n\n## Outra seção\n\nTexto posterior intacto.",
    );
    expect(result.body).toContain("Parágrafo canônico: 25 MW.");
    expect(result.body).toContain("Texto posterior intacto.");
    expect(result.body).not.toContain("Em resumo");
    expect(result.body).not.toContain("Continue aprendendo");
    expect(result.body).not.toContain("/artigo/legado");
    expect(result.keyPoints).toContain('aria-label="Pontos-chave"');
    expect(result.keyPoints).toContain("Ponto <strong>aprovado</strong>: 25 MW.");
    expect(result.references).toContain("Fonte intacta.");
  });

  test("não inventa pontos-chave para artigos sem conteúdo explícito", async () => {
    const result = await renderSlots("Somente o texto fornecido.");
    expect(result.keyPoints.trim()).toBe("");
    expect(result.references.trim()).toBe("");
    expect(result.body.trim()).toBe("<p>Somente o texto fornecido.</p>");
  });

  test("todos os MDX compilam sem navegação duplicada e sem gerar pontos-chave", async () => {
    for (const file of readdirSync("content/articles").filter((name) => name.endsWith(".mdx"))) {
      const source = readFileSync(`content/articles/${file}`, "utf8");
      const result = await renderSlots(source);
      const expected = (source.match(/<KeyPoints>/g) ?? []).length;
      expect((result.keyPoints.match(/aria-label="Pontos-chave"/g) ?? []).length).toBe(expected);
      expect(result.body).not.toContain('aria-label="Pontos-chave"');
      expect(result.body).not.toMatch(/<h[1-6]>Continue aprendendo<\/h[1-6]>/);
    }
  });

  test("layout mantém pontos antes do TTS e navegação única após autor", () => {
    const route = readFileSync("src/routes/artigo.$slug.tsx", "utf8");
    expect(route.indexOf('section="keyPoints"')).toBeLessThan(route.indexOf("<ArticleTtsPlayer"));
    expect(route.indexOf("<ShareBar")).toBeLessThan(route.indexOf('section="references"'));
    expect(route.indexOf("Continue aprendendo")).toBeGreaterThan(route.indexOf("Sobre o autor"));
    expect(route).not.toContain("Artigos relacionados");
    expect(editorialMdxComponents).not.toHaveProperty("ReadAlso");
  });
});
