import { expect, test } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { compile, run } from "@mdx-js/mdx";
import remarkFrontmatter from "remark-frontmatter";
import { renderToStaticMarkup } from "react-dom/server";
import * as runtime from "react/jsx-runtime";
import { parseEditorialFile } from "../../scripts/generate-content";
import { editorialMdxComponents } from "@/components/editorial/mdx-components";
import { articleRecords } from "./generated/articles";
import { createContentRepository } from "./repository";
import { buildTagTopics } from "./tags";
import { generateRss, generateSitemap } from "@/lib/distribution";
import { AiEditorialCredit } from "@/components/editorial/AiEditorialCredit";
import authors from "../../content/authors.json";

const slug = "terras-raras-os-17-elementos-que-movem-a-tecnologia-parte-1";
const source = readFileSync(`content/articles/${slug}.mdx`, "utf8");
const parsed = parseEditorialFile(source);
const revision = JSON.parse(
  readFileSync("docs/editorial/art-033-pre-publicacao/revisao-aplicada-2026-10-24.json", "utf8"),
) as {
  replacements: { before: string; after: string }[];
  citationMapping: Record<string, number>;
};
function approvedText(text: string) {
  for (const change of revision.replacements) text = text.replaceAll(change.before, change.after);
  return text.replace(
    /\[(\d+(?:(?:,\s*|[–-])\d+)*)\]/g,
    (_, numbers: string) =>
      `[${numbers.replace(/\d+/g, (n) => String(revision.citationMapping[n]))}]`,
  );
}
test("autoria aprovada reutiliza cadastro e nota integral aparece uma única vez", () => {
  expect(parsed.frontmatter.author).toBe("olavo-oliveira");
  expect(authors.filter((a) => a.slug === parsed.frontmatter.author)).toHaveLength(1);
  const disclosure =
    "As ilustrações deste artigo foram produzidas com auxílio de ferramentas de inteligência artificial generativa. A imagem de capa (Hero) foi produzida inicialmente com o ChatGPT (OpenAI) e posteriormente trabalhada no Pippit (www.pippit.ai). As imagens 1 e 2 foram geradas com o ChatGPT (OpenAI). A imagem 3 foi produzida com o Pippit (www.pippit.ai). As imagens têm finalidade ilustrativa e educativa, não constituindo registros fotográficos de instalações reais nem comprovação de resultados científicos. A interpretação dos dados, a revisão técnica e a responsabilidade editorial permanecem sob responsabilidade do Sul Global Energia e Sustentabilidade.";
  expect(parsed.frontmatter.aiDisclosure).toBe(disclosure);
  const html = renderToStaticMarkup(
    <AiEditorialCredit assistance="limited" publicationDate="2026-10-23" disclosure={disclosure} />,
  );
  expect(html).toContain(disclosure);
  expect(html.match(/Nota de Transparência/g)).toHaveLength(1);
  expect(html).not.toContain("Todo o conteúdo factual foi verificado");
});
const original = JSON.parse(
  readFileSync("docs/editorial/art-033-pre-publicacao/word-original-extraido.json", "utf8"),
) as { blocks: { index: number; text: string }[] };
const images = JSON.parse(
  readFileSync("docs/editorial/art-033-pre-publicacao/imagens.json", "utf8"),
) as {
  name: string;
  original: string;
  sha256: string;
  sizes: { src: string; width: number; height: number }[];
}[];

export async function renderArt033() {
  const compiled = await compile(source, {
    outputFormat: "function-body",
    remarkPlugins: [remarkFrontmatter],
  });
  const module = await run(String(compiled), { ...runtime, baseUrl: import.meta.url });
  return renderToStaticMarkup(<module.default components={editorialMdxComponents} />);
}

test("preserva todos os parágrafos e títulos do Word no texto renderizado", async () => {
  const html = await renderArt033();
  const plain = html
    .replace(/<\/(?:p|h[1-6]|li|div|section|figcaption)>/g, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
  const title = original.blocks.find((b) => b.index === 1);
  if (!title) throw new Error("Título ausente na extração original do Word");
  expect(parsed.frontmatter.title).toBe(title.text);
  for (const block of original.blocks.filter((b) => b.text && b.index !== 1)) {
    expect(plain).toContain(approvedText(block.text).replace(/\s+/g, " ").trim());
  }
  expect(html.match(/<h2\b/g)).toHaveLength(11);
  expect(html.match(/<figcaption\b/g)).toHaveLength(3);
  expect(html).toContain("object-contain");
});

test("mantém cinco pontos, destaque, quatorze referências e a numeração original", () => {
  const points = parsed.body.split("<KeyPoints>")[1].split("</KeyPoints>")[0];
  expect(points.match(/^- /gm)).toHaveLength(5);
  expect(parsed.body.match(/<Callout\b/g)).toHaveLength(1);
  expect(parsed.body.match(/## Referências\s/g)).toHaveLength(1);
  const references = [...parsed.body.matchAll(/^\[(\d+)\]/gm)].map((m) => Number(m[1]));
  expect(references).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
  expect(parsed.frontmatter.referencesInBody).toBe(true);
  expect(parsed.body).toContain("[2–4]");
  expect(parsed.body).toContain("[1, 14]");
  const beforeReferences = parsed.body.split("## Referências")[0];
  const order: number[] = [];
  for (const match of beforeReferences.matchAll(/\[(\d+(?:(?:,\s*|[–-])\d+)*)\]/g)) {
    for (const group of match[1].split(/,\s*/)) {
      const bounds = group.split(/[–-]/).map(Number);
      for (let n = bounds[0]; n <= (bounds[1] ?? bounds[0]); n++)
        if (!order.includes(n)) order.push(n);
    }
  }
  expect(order).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
  expect(source).toContain("~21 Mt");
  expect(source).toContain("Brasil 21");
});

test("originais preservados byte a byte e derivados locais com proporção e alt", () => {
  expect(images).toHaveLength(4);
  for (const image of images) {
    expect(createHash("sha256").update(readFileSync(image.original)).digest("hex")).toBe(
      image.sha256,
    );
    for (const size of image.sizes) expect(existsSync(`public${size.src}`)).toBe(true);
  }
  expect(parsed.frontmatter.cover.alt.length).toBeGreaterThan(30);
  expect(parsed.frontmatter.cover.license).toContain(
    "https://openai.com/policies/row-terms-of-use/",
  );
  expect(parsed.frontmatter.cover.license).toContain("https://www.pippit.ai/tools/text-to-design");
  expect(parsed.frontmatter.cover.aiProvenance?.contributions[0].tool).toBe("ChatGPT (OpenAI)");
  expect(parsed.frontmatter.cover.aiProvenance?.contributions).toEqual([
    { role: "generation", tool: "ChatGPT (OpenAI)" },
    { role: "editing", tool: "Pippit (pippit.ai)" },
  ]);
  expect(parsed.body).toContain('aiGenerationTool="Pippit (pippit.ai)"');
  expect(parsed.body.match(/<Figure\b/g)).toHaveLength(3);
});

test("rascunho não aparece em slug público, busca, categorias, tags, sitemap ou RSS", () => {
  const draft = { ...parsed.frontmatter, status: "draft" as const };
  const records = articleRecords.map((a) => (a.slug === slug ? draft : a));
  const repository = createContentRepository(records, false, "2026-10-24");
  expect(repository.getArticleBySlug(slug)).toBeUndefined();
  expect(repository.searchArticles("terras raras").some((a) => a.slug === slug)).toBe(false);
  const published = repository.getPublishedArticles();
  expect(published.some((a) => a.slug === slug)).toBe(false);
  expect(
    repository.getArticlesByCategory(parsed.frontmatter.category).some((a) => a.slug === slug),
  ).toBe(false);
  expect(buildTagTopics(published).some((t) => t.articles.some((a) => a.slug === slug))).toBe(
    false,
  );
  expect(generateSitemap(published)).not.toContain(slug);
  expect(generateRss(published)).not.toContain(slug);
});

test("distribuição do artigo real corresponde ao estado editorial persistido", () => {
  const repository = createContentRepository(articleRecords, false, "2099-01-01");
  const published = repository.getPublishedArticles();
  const isPublished = parsed.frontmatter.status === "published";
  expect(published.some((a) => a.slug === slug)).toBe(isPublished);
  expect(generateSitemap(published).includes(slug)).toBe(isPublished);
  expect(generateRss(published).includes(slug)).toBe(isPublished);
  if (isPublished) {
    expect(parsed.frontmatter.publishedAt).toBeDefined();
    expect(parsed.frontmatter.approvedAt).toBeDefined();
  }
});
