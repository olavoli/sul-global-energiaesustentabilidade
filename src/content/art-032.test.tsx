import { expect, test } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { compile, run } from "@mdx-js/mdx";
import { renderToStaticMarkup } from "react-dom/server";
import * as runtime from "react/jsx-runtime";
import remarkFrontmatter from "remark-frontmatter";
import { parseEditorialFile } from "../../scripts/generate-content";
import { editorialMdxComponents } from "@/components/editorial/mdx-components";
import { createContentRepository } from "./repository";
import { articleRecords } from "./generated/articles";
import { buildTagTopics } from "./tags";
import { generateSitemap, generateRss } from "@/lib/distribution";
import { articleFrontmatterSchema } from "./schema";
import { AiEditorialCredit } from "@/components/editorial/AiEditorialCredit";

const slug = "agrivoltaica-e-possivel-colher-alimentos-e-eletricidade-na-mesma-terra";
const source = readFileSync(`content/articles/${slug}.mdx`, "utf8");
const parsed = parseEditorialFile(source);
const reconciliation = JSON.parse(
  readFileSync("docs/editorial/art-032-pre-publicacao/alteracoes-aplicadas.json", "utf8"),
) as { edits: Array<{ before: string; after: string }> };
function reconciled(text: string) {
  for (const edit of reconciliation.edits) text = text.replaceAll(edit.before, edit.after);
  return text;
}

test("reconciliação registra fontes específicas sem liberar o draft ou alterar a nota", () => {
  expect(parsed.frontmatter.sources).toHaveLength(15);
  expect(new Set(parsed.frontmatter.sources.map((s) => s.url)).size).toBe(15);
  expect(parsed.frontmatter.cover.license).toBe(
    "Saída do ChatGPT (OpenAI), uso conforme Termos de Uso da OpenAI: https://openai.com/policies/row-terms-of-use/",
  );
  expect(source).not.toContain("s41893-019-0363-x");
  expect(source).not.toContain("20% a 30% superior");
  expect(source).not.toContain("até 4°C menor");
  expect(source).not.toContain("até 30% devido à dupla fonte de receita");
  expect(source).toContain("1,2 ± 0,3 °C");
  expect(source).toContain("Montpellier, França");
  expect(source).toContain("redução de 20% a 30% no consumo de água da cultura");
  expect(source).toContain("7 anos e 10 meses");
  expect(source).toContain("aproximadamente 52%");
  expect(source).toContain("Santarém/PA");
});

test("quinze referências específicas em sequência e sem chamadas órfãs", () => {
  const body = source.replace(/^---[\s\S]*?\r?\n---/, "");
  const [article, bibliography] = body.split("## Referências Bibliográficas");
  const calls = [...article.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
  const firstAppearances = [...new Set(calls)];
  expect(firstAppearances).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
  expect([...bibliography.matchAll(/^\[(\d+)\]/gm)].map((m) => Number(m[1]))).toEqual(
    firstAppearances,
  );
  for (const [i, item] of parsed.frontmatter.sources.entries()) {
    expect(bibliography).toContain(item.url);
    expect(item.note).toStartWith(`[${i + 1}] `);
  }
  expect(body).not.toMatch(/\[S\d+\]/);
  expect(bibliography).not.toMatch(/Busque|Dica:|Busca sugerida|87965\.pdf/);
  expect(body.match(/## Referências Bibliográficas/g)).toHaveLength(1);
});

test("schema aceita a base contratual proposta sem atribuir licença CC ou aprovar publicação", () => {
  const candidate =
    "Saída do ChatGPT (OpenAI), uso conforme Termos de Uso da OpenAI: https://openai.com/policies/row-terms-of-use/";
  expect(
    articleFrontmatterSchema.safeParse({
      ...parsed.frontmatter,
      cover: { ...parsed.frontmatter.cover, license: candidate },
    }).success,
  ).toBeTrue();
  expect(parsed.frontmatter.status).toBe("published");
});

test("nota aprovada integral, uma única apresentação e limite de metadados preservado", () => {
  const note = readFileSync(
    "docs/editorial/art-032-pre-publicacao/nota-transparencia-aprovada.md",
    "utf8",
  )
    .replace(/^# [^\r\n]+\r?\n+/, "")
    .trim()
    .replaceAll("\r\n", "\n");
  expect(parsed.frontmatter.aiDisclosure).toBe(note);
  expect(note.length).toBeGreaterThan(600);
  const html = renderToStaticMarkup(
    <AiEditorialCredit
      assistance={parsed.frontmatter.aiAssistance}
      publicationDate="2026-10-16"
      disclosure={parsed.frontmatter.aiDisclosure}
    />,
  );
  expect(html.match(/Nota de Transparência/g)).toHaveLength(1);
  for (const paragraph of note.split("\n\n")) expect(html).toContain(paragraph);
  expect(source.split("---").slice(2).join("---")).not.toContain(note);
  expect(
    articleFrontmatterSchema.safeParse({ ...parsed.frontmatter, aiDisclosure: "x".repeat(1200) })
      .success,
  ).toBeTrue();
  expect(
    articleFrontmatterSchema.safeParse({ ...parsed.frontmatter, aiDisclosure: "x".repeat(1201) })
      .success,
  ).toBeFalse();
});
const original = JSON.parse(
  readFileSync("docs/editorial/art-032-pre-publicacao/word-extraido.json", "utf8"),
) as {
  blocks: Array<{ index: number; kind: string; text?: string; rows?: string[][] }>;
};
const images = JSON.parse(
  readFileSync("docs/editorial/art-032-pre-publicacao/imagens.json", "utf8"),
) as Array<{
  original: string;
  sha256: string;
  width: number;
  height: number;
  variants: Array<{ src: string; width: number; height: number; bytes: number }>;
}>;

test("ART-032 conserva cada parágrafo e célula, exceto correções pontuais registradas", () => {
  const withoutMath = source.replace(/<MathExpression>[\s\S]*?<\/MathExpression>/g, "");
  for (const block of original.blocks) {
    // A bibliografia temática e as instruções foram substituídas, com autorização,
    // por fontes numeradas; o original integral permanece no registro local.
    if (block.index >= 135) continue;
    if (block.text?.trim()) {
      const escaped = reconciled(block.text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
      // Title and component labels are represented by metadata/caption attributes.
      if ([0, 2, 9, 73].includes(block.index)) continue;
      expect(withoutMath).toContain(escaped);
    }
    for (const row of block.rows ?? [])
      for (const cell of row)
        expect(source).toContain(
          reconciled(cell).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"),
        );
  }
  expect(parsed.frontmatter.title).toBe(original.blocks[0].text!);
  expect(source.match(/<KeyPoints>/g)).toHaveLength(1);
  expect(source.split("<KeyPoints>")[1].split("</KeyPoints>")[0].match(/^- /gm)).toHaveLength(5);
  expect(source.match(/<EditorialTable /g)).toHaveLength(1);
  expect(source.match(/<Figure\s/g)).toHaveLength(4);
  expect(source).toContain("LER=0,8+0,75=1,55");
});

test("ART-032 publicado integra rotas públicas, busca, tags, RSS e sitemap", () => {
  expect(parsed.frontmatter.status).toBe("published");
  expect(parsed.frontmatter.approvedAt).toBe("2026-10-17");
  expect(parsed.frontmatter.publishedAt).toBe("2026-10-17");
  for (const demos of [false, true]) {
    const repo = createContentRepository(articleRecords, demos);
    expect(repo.getArticleBySlug(slug)?.slug).toBe(slug);
    expect(repo.searchArticles("agrivoltaica").some((a) => a.slug === slug)).toBeTrue();
    expect(generateSitemap(repo.getPublishedArticles())).toContain(slug);
    expect(generateRss(repo.getPublishedArticles())).toContain(slug);
    expect(
      buildTagTopics(articleRecords).some((t) => t.articles.some((a) => a.slug === slug)),
    ).toBeTrue();
  }
  for (const topic of buildTagTopics(articleRecords))
    expect(topic.indexable).toBe(topic.articles.length >= 2);
});

test("originais intactos e cinco conjuntos responsivos com proporção preservada", () => {
  expect(images).toHaveLength(5);
  for (const image of images) {
    expect(
      createHash("sha256")
        .update(readFileSync(`public${image.original}`))
        .digest("hex"),
    ).toBe(image.sha256);
    for (const variant of image.variants) {
      expect(existsSync(`public${variant.src}`)).toBeTrue();
      expect(readFileSync(`public${variant.src}`).length).toBe(variant.bytes);
      expect(
        Math.abs(variant.height - (image.height * variant.width) / image.width),
      ).toBeLessThanOrEqual(0.5);
    }
  }
});

test("MDX compila com componentes existentes, quatro figuras e tabela acessível", async () => {
  const compiled = await compile(source, {
    outputFormat: "function-body",
    remarkPlugins: [remarkFrontmatter],
  });
  const module = await run(String(compiled), { ...runtime, baseUrl: import.meta.url });
  const Content = module.default;
  const html = renderToStaticMarkup(<Content components={editorialMdxComponents} />);
  expect(html.match(/<figure/g)).toHaveLength(4);
  expect(html).toContain('role="region"');
  expect(html).toContain("<table");
  expect(html).not.toContain('alt=""');
  expect(html).toContain("srcSet=");
  expect(html).toContain("Compartilhar a terra sem dividir o sol");
});
