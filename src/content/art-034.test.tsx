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
import { generateRss, generateSitemap } from "@/lib/distribution";

const slug = "terras-raras-o-brasil-tem-os-minerais-mas-quem-domina-a-tecnologia-parte-2";
const directory = "docs/editorial/art-034-pre-publicacao/";
const source = readFileSync(`content/articles/${slug}.mdx`, "utf8");
const parsed = parseEditorialFile(source);
const original = JSON.parse(readFileSync(directory + "word-original-extraido.json", "utf8")) as {
  blocks: { index: number; type: string; text?: string; rows?: string[][] }[];
};
const revision = JSON.parse(readFileSync(directory + "revisao-aplicada.json", "utf8")) as {
  replacements: {
    block?: number;
    table?: number;
    row?: number;
    column?: number;
    before: string;
    after: string;
  }[];
  citationMapping: Record<string, number>;
  numberedReferences: number;
};
const images = JSON.parse(readFileSync(directory + "imagens.json", "utf8")) as {
  name: string;
  originalFile: string;
  originalSha256: string;
  sizes: { src: string; width: number; height: number; sha256: string }[];
}[];
function revisedText(block: { index: number; text?: string }) {
  return (revision.replacements.find((r) => r.block === block.index)?.after ?? block.text ?? "")
    .replace(/\[(\d+)\]/g, (_, n: string) => `[${revision.citationMapping[n]}]`)
    .replace(/^\s*-\s*/, "");
}
function plain(html: string) {
  return html
    .replace(/<\/(?:p|h[1-6]|li|div|section|figcaption|td|th)>/g, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
async function renderArticle() {
  const compiled = await compile(source, {
    outputFormat: "function-body",
    remarkPlugins: [remarkFrontmatter],
  });
  const module = await run(String(compiled), { ...runtime, baseUrl: import.meta.url });
  return renderToStaticMarkup(<module.default components={editorialMdxComponents} />);
}

test("ART-034 preserves the six sections, two complete tables, five points and highlight", async () => {
  const html = await renderArticle();
  const text = plain(html);
  expect(parsed.frontmatter.title).toBe(
    "Terras raras: O Brasil tem os minerais, mas quem domina a tecnologia?",
  );
  expect(parsed.frontmatter.author).toBe("olavo-oliveira");
  expect(parsed.frontmatter.category).toBe("transicao-energetica");
  expect(parsed.body.match(/^## [1-6]\. /gm)).toHaveLength(6);
  expect(html.match(/<table\b/g)).toHaveLength(2);
  expect(html.match(/<figure\b/g)).toHaveLength(2);
  expect(html).toContain("art-034-cadeia");
  expect(html).toContain("art-034-paradoxo");
  expect(html.match(/role="region"/g)).toHaveLength(2);
  expect(html.match(/tabindex="0"/g)).toHaveLength(2);
  expect(parsed.body.match(/<Callout\b/g)).toHaveLength(1);
  expect(parsed.body.split("<KeyPoints>")[1].split("</KeyPoints>")[0].match(/^- /gm)).toHaveLength(
    5,
  );
  for (const block of original.blocks.filter(
    (b) =>
      b.text?.trim() &&
      ((b.index >= 8 && b.index <= 12) ||
        b.index === 18 ||
        (b.index >= 22 && b.index <= 97 && b.index !== 64)),
  )) {
    expect(text).toContain(plain(revisedText(block)));
  }
  for (const table of original.blocks.filter((b) => b.type === "table")) {
    table.rows?.forEach((row, ri) =>
      row.forEach((cell, ci) => {
        const change = revision.replacements.find(
          (r) => r.table === table.index && r.row === ri && r.column === ci,
        );
        expect(text).toContain(plain(change?.after ?? cell));
      }),
    );
  }
});

test("ART-034 reconciles every numbered citation in first-occurrence order", () => {
  const [body, bibliography] = parsed.body.split("## Referências");
  const entries = [...bibliography.matchAll(/^\[(\d+)\]/gm)].map((m) => Number(m[1]));
  const order = [...new Set([...body.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])))];
  expect(entries).toEqual(Array.from({ length: revision.numberedReferences }, (_, i) => i + 1));
  expect(order).toEqual(entries);
  expect(JSON.parse(readFileSync(directory + "bibliografia-original.json", "utf8"))).toHaveLength(
    19,
  );
  expect(parsed.body).toContain("2024;216:108889");
  expect(parsed.body).toContain("2025;500:140400");
  expect(parsed.body).not.toContain("14.994");
  expect(parsed.body).toContain("15.506");
  for (const link of parsed.body.matchAll(/\]\(\/artigo\/([^/)]+)\)/g)) {
    expect(articleRecords.some((a) => a.slug === link[1] && a.status === "published")).toBe(true);
  }
});

test("ART-034 preserves the original raster and does not certify the disputed 21 Mt", () => {
  expect(images).toHaveLength(3);
  for (const image of images) {
    const base = `public/images/articles/${slug}/`;
    expect(
      createHash("sha256")
        .update(readFileSync(base + image.originalFile))
        .digest("hex"),
    ).toBe(image.originalSha256);
    for (const size of image.sizes) {
      expect(existsSync("public" + size.src)).toBe(true);
      expect(
        createHash("sha256")
          .update(readFileSync("public" + size.src))
          .digest("hex"),
      ).toBe(size.sha256);
    }
  }
  expect(parsed.body).toContain("21 Mt foi preservado na arte original por decisão editorial");
  expect(parsed.body).toContain("não é apresentada como confirmação dos 21 Mt");
  expect(parsed.body).toContain("o rótulo “2025”");
  expect(parsed.body).toContain("2024");
  expect(parsed.frontmatter.cover.aiProvenance?.contributions.map((c) => c.tool)).toContain(
    "ChatGPT (OpenAI)",
  );
  expect(parsed.frontmatter.aiDisclosure).toContain(
    "logomarca do Sul Global foi incluída com PowerPoint",
  );
  expect(parsed.frontmatter.aiDisclosure).not.toContain("revisão humana integral concluída");
});

test("ART-034 public visibility follows the official editorial status", () => {
  const repository = createContentRepository(articleRecords, false);
  const publicArticle = repository.getPublishedArticles().find((a) => a.slug === slug);
  const sitemap = generateSitemap(repository.getPublishedArticles());
  const rss = generateRss(repository.getPublishedArticles());
  const published = parsed.frontmatter.status === "published";
  expect(Boolean(publicArticle)).toBe(published);
  expect(sitemap.includes(`/artigo/${slug}`)).toBe(published);
  expect(rss.includes(`/artigo/${slug}`)).toBe(published);
  if (!published) expect(parsed.frontmatter.publishedAt).toBeUndefined();
});
