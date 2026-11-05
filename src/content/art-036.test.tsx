import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { compile, run } from "@mdx-js/mdx";
import remarkFrontmatter from "remark-frontmatter";
import { renderToStaticMarkup } from "react-dom/server";
import * as runtime from "react/jsx-runtime";
import { parseEditorialFile } from "../../scripts/generate-content";
import {
  loadResearchBrief,
  evaluateResearch,
  researchBriefSchema,
} from "../../scripts/research-operations";
import { editorialMdxComponents } from "@/components/editorial/mdx-components";
import { articleRecords } from "./generated/articles";
import { createContentRepository } from "./repository";
import { generateRss, generateSitemap } from "@/lib/distribution";

const slug =
  "transicao-energetica-justa-em-santa-catarina-quem-recupera-o-territorio-e-constroi-o-futuro-depois-do-carvao-parte-3";
const directory = "docs/editorial/art-036-pre-publicacao/";
const source = readFileSync(`content/articles/${slug}.mdx`, "utf8");
const parsed = parseEditorialFile(source);
const original = JSON.parse(readFileSync(directory + "word-original-extraido.json", "utf8")) as {
  blocks: { index: number; type: string; text?: string }[];
};
const adaptations = JSON.parse(readFileSync(directory + "adaptacoes-tecnicas.json", "utf8")) as {
  changes: { wordBlock: number; after: string }[];
};
function plain(value: string) {
  return value
    .replace(/<\/(?:p|h[1-6]|li|div|section|figcaption|td|th)>/g, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

test("ART-036 preserves every Word passage, key point, highlight and bibliography", async () => {
  const compiled = await compile(source, {
    outputFormat: "function-body",
    remarkPlugins: [remarkFrontmatter],
  });
  const module = await run(String(compiled), { ...runtime, baseUrl: import.meta.url });
  const html = renderToStaticMarkup(<module.default components={editorialMdxComponents} />);
  const text = plain(html);
  const structural = new Set([0, 2, 3, 5, 11, 141]);
  for (const block of original.blocks.filter((b) => b.text?.trim() && !structural.has(b.index))) {
    const approved = adaptations.changes.find((c) => c.wordBlock === block.index);
    const value = plain(approved?.after ?? block.text ?? "")
      .replace(/^\d+\.\s*/, "")
      .replace(/^-\s*/, "");
    expect(text).toContain(value);
  }
  if (!original.blocks[0]?.text || !original.blocks[3]?.text)
    throw new Error("Word title/subtitle absent");
  expect(parsed.frontmatter.title + " | Parte 3 de 3").toBe(original.blocks[0].text);
  expect(parsed.frontmatter.subtitle).toBe(original.blocks[3].text);
  expect(parsed.body.match(/^## \d+\. /gm)).toHaveLength(10);
  expect(parsed.body).toContain("## Conclusão crítica | O que revelam as dissertações da UFSC");
  expect(parsed.body.split("<KeyPoints>")[1].split("</KeyPoints>")[0].match(/^- /gm)).toHaveLength(
    5,
  );
  expect(parsed.body.match(/<Callout /g)).toHaveLength(1);
  expect(html.match(/<figure\b/g)).toHaveLength(2);
  const references = parsed.body.split("## Referências")[1];
  expect([...references.matchAll(/^\[(\d+)\]/gm)].map((m) => Number(m[1]))).toEqual(
    Array.from({ length: 16 }, (_, i) => i + 1),
  );
  const links = [...references.matchAll(/\[([^\]]+)\]\((https:\/\/[^)]+)\)/g)];
  expect(links).toHaveLength(16);
  for (const [, label, url] of links) expect(label).toBe(url);
  const seen = new Set<number>();
  for (const m of parsed.body.split("## Referências")[0].matchAll(/\[(\d+(?:,\s*\d+)*)\]/g))
    for (const value of m[1].split(",")) seen.add(Number(value));
  expect([...seen]).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
});

test("ART-036 uses only the three supplied originals and actual responsive derivatives", () => {
  const images = JSON.parse(readFileSync(directory + "imagens.json", "utf8")) as {
    originalFile: string;
    originalSha256: string;
    variants: { file: string; sha256: string }[];
  }[];
  expect(images).toHaveLength(3);
  for (const image of images) {
    expect(createHash("sha256").update(readFileSync(image.originalFile)).digest("hex")).toBe(
      image.originalSha256,
    );
    for (const variant of image.variants)
      expect(
        createHash("sha256")
          .update(readFileSync(`public/images/articles/${slug}/${variant.file}`))
          .digest("hex"),
      ).toBe(variant.sha256);
  }
  expect(parsed.frontmatter.cover.aiProvenance?.contributions.map((c) => c.tool)).toEqual([
    "ChatGPT (OpenAI)",
    "Microsoft PowerPoint (PPTX)",
  ]);
  expect(parsed.frontmatter.cover.width).toBe(1998);
  expect(parsed.frontmatter.cover.height).toBe(1125);
  expect(parsed.frontmatter.aiDisclosure).not.toContain("Pippit");
  expect(parsed.frontmatter.aiDisclosure).toContain("não registros fotográficos documentais");
});

test("ART-036 publication follows editorial approval and preserves distribution and taxonomy", async () => {
  expect(parsed.frontmatter.status).toBe("published");
  expect(parsed.frontmatter.approvedAt).toBeTruthy();
  expect(parsed.frontmatter.publishedAt).toBeTruthy();
  expect(parsed.frontmatter.reviewedAt).toBeUndefined();
  expect(parsed.frontmatter.tags).toEqual([
    "carvão",
    "santa catarina",
    "transição justa",
    "emprego",
    "sustentabilidade",
    "participação social",
    "ufsc",
    "ppges",
  ]);
  expect(source.match(/accessibleDescription=/g)).toHaveLength(2);
  const repo = createContentRepository(articleRecords, false);
  expect(repo.getPublishedArticles().some((a) => a.slug === slug)).toBe(true);
  expect(generateSitemap(repo.getPublishedArticles())).toContain(slug);
  expect(generateRss(repo.getPublishedArticles())).toContain(slug);
  const brief = researchBriefSchema.parse(await loadResearchBrief(slug));
  expect(brief.researchStatus).toBe("ready-for-writing");
  expect(brief.concreteImpediments).toHaveLength(0);
  expect(evaluateResearch(brief).readyForReview).toBe(true);
});
