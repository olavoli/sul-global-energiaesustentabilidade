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

const slug = "terras-raras-o-brasil-pode-construir-sua-independencia-tecnologica-ate-2040-parte-3";
const directory = "docs/editorial/art-035-pre-publicacao/";
const source = readFileSync(`content/articles/${slug}.mdx`, "utf8");
const parsed = parseEditorialFile(source);
const original = JSON.parse(readFileSync(directory + "word-original-extraido.json", "utf8")) as {
  blocks: { index: number; type: string; text?: string }[];
};
const appliedCorrections = JSON.parse(
  readFileSync(directory + "correcoes-aplicadas.json", "utf8"),
) as {
  changes: { id: string }[];
  wordReplacements: { block: number; before: string; after: string }[];
};
function originalText(index: number): string {
  const block = original.blocks.find((b) => b.index === index);
  if (typeof block?.text !== "string") throw new Error(`Missing original Word block ${index}`);
  return block.text;
}
function plain(value: string) {
  return value
    .replace(/<\/(?:p|h[1-6]|li|div|section|figcaption|td|th)>/g, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/\*\*/g, "")
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
test("ART-035 keeps every substantive Word paragraph and all original references", async () => {
  const html = await renderArticle();
  const text = plain(html);
  expect(parsed.frontmatter.title).toBe(originalText(1));
  expect(parsed.frontmatter.subtitle).toBe(originalText(2));
  expect(parsed.body.match(/^## [1-9]\d?\. /gm)).toHaveLength(10);
  expect(parsed.body).toContain("## O Futuro do Brasil na cadeia das terras-raras");
  expect(parsed.body).toContain("## Referências\n");
  for (const block of original.blocks.filter(
    (b) => b.text?.trim() && ![1, 2, 4, 6].includes(b.index),
  )) {
    const approved = appliedCorrections.wordReplacements.find((c) => c.block === block.index);
    expect(text).toContain(plain(approved?.after ?? block.text ?? ""));
  }
  expect(html.match(/<figure\b/g)).toHaveLength(2);
  expect(parsed.body.match(/<Callout\b/g)).toHaveLength(1);
  expect(parsed.body.split("<KeyPoints>")[1].split("</KeyPoints>")[0].match(/^- /gm)).toHaveLength(
    5,
  );
  const references = parsed.body.split("## Referências\n")[1];
  expect([...references.matchAll(/^\[(\d+)\]/gm)].map((m) => Number(m[1]))).toEqual(
    Array.from({ length: 16 }, (_, i) => i + 1),
  );
  const links = [...references.matchAll(/\[([^\]]+)\]\((https:\/\/[^)]+)\)/g)];
  expect(links).toHaveLength(17);
  const seen = new Set<number>();
  for (const citation of parsed.body
    .split("## Referências\n")[0]
    .matchAll(/\[(\d+(?:[–-]\d+)?(?:,\s*\d+(?:[–-]\d+)?)*)\]/g)) {
    for (const part of citation[1].split(",")) {
      const [start, end = start] = part.trim().split(/[–-]/).map(Number);
      for (let n = start; n <= end; n++) seen.add(n);
    }
  }
  expect([...seen]).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));

  for (const [, label, url] of links) expect(label).toBe(url);
});
test("ART-035 preserves image originals and responsive variants byte for byte", () => {
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
    for (const v of image.variants)
      expect(
        createHash("sha256")
          .update(readFileSync(`public/images/articles/${slug}/${v.file}`))
          .digest("hex"),
      ).toBe(v.sha256);
  }
  expect(parsed.frontmatter.cover.aiProvenance?.contributions.map((c) => c.tool)).toEqual([
    "ChatGPT (OpenAI)",
    "Microsoft PowerPoint (PPTX)",
  ]);
  expect(parsed.frontmatter.cover.license).toContain(
    "Uso editorial e comercial das saídas ChatGPT",
  );
  expect(parsed.frontmatter.cover.license).toContain(
    "https://openai.com/policies/row-terms-of-use/",
  );
  expect(parsed.frontmatter.cover.src).toBe(
    `/images/articles/${slug}/art-035-hero-pesquisadores.jpg`,
  );
  expect(parsed.frontmatter.cover.width).toBe(1998);
  expect(parsed.frontmatter.cover.height).toBe(1125);
  expect(parsed.frontmatter.cover.sources).toBeUndefined();
  expect(parsed.frontmatter.aiDisclosure).not.toContain("Pippit");
  expect(parsed.frontmatter.aiDisclosure).toContain(
    "não constituindo registros fotográficos documentais",
  );
});
test("ART-035 publication has persisted editorial dates and appears in public distribution", () => {
  expect(parsed.frontmatter.status).toBe("published");
  expect(parsed.frontmatter.draftStage).toBe("review-ready");
  for (const field of ["publishedAt", "approvedAt"] as const)
    expect(parsed.frontmatter[field]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(parsed.frontmatter.reviewedAt).toBeUndefined();
  const repo = createContentRepository(articleRecords, false);
  expect(repo.getPublishedArticles().some((a) => a.slug === slug)).toBe(true);
  expect(generateSitemap(repo.getPublishedArticles())).toContain(`/artigo/${slug}`);
  expect(generateRss(repo.getPublishedArticles())).toContain(`/artigo/${slug}`);
});

test("ART-035 has an eligible brief without fabricating residual-risk approvals", async () => {
  const brief = researchBriefSchema.parse(await loadResearchBrief(slug));
  expect(brief.researchStatus).toBe("ready-for-writing");
  expect(brief.factChecks.every((f) => f.status === "confirmed")).toBe(true);
  expect(brief.conflictsOfInterestEvaluated).toBe(true);
  expect(brief.imageRequirements.license).toBe(parsed.frontmatter.cover.license);
  expect(brief.residualRiskApproval).toBeUndefined();
  expect(evaluateResearch(brief).readyForReview).toBe(true);
  const matrix = JSON.parse(readFileSync(directory + "matriz-auditoria.json", "utf8")) as {
    rows: { id: string; applied: boolean; severity: string }[];
  };
  expect(matrix.rows.filter((r) => r.applied).map((r) => r.id)).toEqual([
    "D01",
    "D02",
    "D03",
    "D04",
    "D05",
    "D06",
    "D07",
    "E01",
    "E02",
    "E03",
  ]);
  expect(matrix.rows.some((r) => r.severity === "crítico")).toBe(true);
});

test("ART-035 applies six authorized qualifications without claiming targets are achieved", () => {
  expect(appliedCorrections.changes.map((c) => c.id)).toEqual([
    "E01",
    "E02",
    "E03",
    "D07",
    "D06-BIB",
    "D06-PONT",
    "D06-PONTO",
    "D02-CITE",
    "D04-CITE",
    "D05-CITE",
    "D01",
    "D02",
    "D03",
    "D04",
    "D05",
    "D06",
  ]);
  for (const block of [20, 112, 113, 114, 115]) {
    const corrected = appliedCorrections.wordReplacements.find((c) => c.block === block);
    expect(corrected?.before).toBe(originalText(block));
    expect(corrected?.after).not.toBe(originalText(block));
    expect(parsed.body).toContain(corrected?.after ?? "MISSING");
  }
  expect(parsed.body).not.toContain("janela operacional de apenas 24 a 36 meses");
  expect(parsed.body).not.toContain("havia, em 2025, quatro áreas");
  expect(parsed.body).toContain("Em 2025, o órgão registrou 326 toneladas");
  expect(parsed.body).toContain("não de previsão nem de obrigação governamental");
  expect(parsed.body).toContain("não como regra geral vigente");
  expect(parsed.body).toContain("essa autorização não comprova sua constituição");
  expect(parsed.body).toContain("não uma medição atual independente");
  expect(parsed.body).toContain(
    "engenharia, construção, qualificação profissional e contratos de fornecimento",
  );
  expect(parsed.body).toContain("Decreto nº 13.118/2026");
  expect(parsed.body).toContain("Conselho Nacional de Minerais Críticos e Estratégicos (CNMCE)");
  expect(parsed.body).not.toContain("segurança tecnológica.A principal");
  expect(parsed.body).not.toContain("terras rarss");
  expect(parsed.body).toContain("[9] França SCA, Marrero Vera Y.");
  const matrix = JSON.parse(readFileSync(directory + "matriz-auditoria.json", "utf8")) as {
    rows: {
      id: string;
      classification: string;
      pendingEditorialDecision: boolean;
      currentPassage: string;
    }[];
  };
  expect(matrix.rows).toHaveLength(15);
  expect(matrix.rows.filter((r) => r.pendingEditorialDecision)).toHaveLength(0);
  for (const row of matrix.rows)
    expect(["confirmado", "parcialmente sustentado", "incorreto", "não verificável"]).toContain(
      row.classification,
    );
});
