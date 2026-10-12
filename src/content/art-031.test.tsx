import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { describe, expect, test } from "bun:test";
import { compile, run } from "@mdx-js/mdx";
import { renderToStaticMarkup } from "react-dom/server";
import * as runtime from "react/jsx-runtime";
import remarkFrontmatter from "remark-frontmatter";
import { editorialMdxComponents } from "@/components/editorial/mdx-components";
import { parseEditorialFile } from "../../scripts/generate-content";
import { articleRecords } from "./generated/articles";
import { createContentRepository } from "./repository";
import { generateRss, generateSitemap } from "@/lib/distribution";
import { evaluateResearch, loadResearchBrief } from "../../scripts/research-operations";

const slug = "a-pandemia-salvou-o-sus";
const source = readFileSync(`content/articles/${slug}.mdx`, "utf8");
const parsed = parseEditorialFile(source);
const paragraphs: string[] = JSON.parse(
  readFileSync("docs/editorial/art-031-pre-publicacao/manuscrito-paragrafos.json", "utf8").replace(
    /^\uFEFF/,
    "",
  ),
);
const manifest = JSON.parse(
  readFileSync("docs/editorial/art-031-pre-publicacao/imagens.json", "utf8"),
) as Array<{
  original: string;
  sha256: string;
  fallback: { src: string; width: number; height: number };
  variants: Array<{ src: string; width: number; height: number }>;
}>;

describe("ART-031 — integração fiel e aprovação editorial proporcional", () => {
  test("preserva todos os parágrafos autorais e as 22 referências", () => {
    for (const [index, paragraph] of paragraphs.entries()) {
      if (index === 0 || index === 1 || index === 7 || paragraph.startsWith("📚 Referências"))
        continue;
      const corrections = JSON.parse(
        readFileSync("docs/editorial/art-031-pre-publicacao/correcoes-finais.json", "utf8"),
      ) as Array<{ before: string; after: string }>;
      const correction = corrections.find((entry) => entry.before === paragraph);
      expect(source).toContain((correction?.after ?? paragraph).trim());
    }
    expect(paragraphs.filter((p) => /^\[\d+\]/.test(p))).toHaveLength(22);
    expect(source.match(/<KeyPoints>/g)).toHaveLength(1);
    const points = source.split("<KeyPoints>")[1].split("</KeyPoints>")[0];
    expect(points.match(/^- /gm)).toHaveLength(5);
    expect(source.match(/<Callout title="A Tese Central">/g)).toHaveLength(1);
    expect(source.match(/<Figure\s/g)).toHaveLength(3);
    expect(source).toContain("Em 26 de outubro de 2020");
    expect(source).toContain("Revogado em 28 de outubro pelo Decreto nº 10.533");
    expect(source).toContain(
      "não chegou a comprovar, por si só, uma transferência efetiva de gestão",
    );
    expect(source).toContain("10.1126/science.abh1558");
    expect(source).toContain("10.1590/0034-761220200354");
    expect(source).toContain("Na leitura editorial deste artigo");
    expect(source).toContain("Lei Complementar nº 200, de 30 de agosto de 2023");
    expect(source).toContain("até 19 de janeiro de 2023 quase 80% da população");
    expect(source).not.toContain("Em 12 meses, mais de 180 milhões de pessoas");
  });
  test("referências sequenciais e correções documentadas não restauram números sem evidência", () => {
    const bibliography = source.split("## Referências Bibliográficas")[1];
    expect([...bibliography.matchAll(/^\[(\d+)\]/gm)].map((match) => Number(match[1]))).toEqual(
      Array.from({ length: 22 }, (_, index) => index + 1),
    );
    const audit = JSON.parse(
      readFileSync("docs/editorial/art-031-pre-publicacao/referencias-saneadas.json", "utf8"),
    ) as Array<{ replacement: string; url: string }>;
    expect(audit).toHaveLength(16);
    for (const entry of audit) {
      expect(source).toContain(entry.replacement);
      expect(parsed.frontmatter.sources.some((item) => item.url === entry.url)).toBeTrue();
    }
    const body = source.split("</KeyPoints>")[1].split("## Referências Bibliográficas")[0];
    expect(body).not.toContain("R$ 48 bilhões");
    expect(body).not.toContain("superar 800 mil");
    expect(body).not.toContain("mais de R$ 600 bilhões");
    expect(source).toContain("as comissões intergestores já estão previstas");
    expect(source).toContain("não uma pesquisa representativa");
  });
  test("publica por aprovação proporcional sem declarar verificações inexistentes", async () => {
    expect(parsed.frontmatter.status).toBe("published");
    expect(parsed.frontmatter.author).toBe("olavo-oliveira");
    expect(parsed.frontmatter.category).toBe("politicas-publicas");
    expect(parsed.frontmatter.tags).toContain("saúde pública");
    expect(parsed.frontmatter.tags).toContain("financiamento da saúde");
    expect(parsed.frontmatter.approvedAt).toBeDefined();
    expect(parsed.frontmatter.publishedAt).toBe("2026-10-12");
    expect(parsed.frontmatter.cover.license).toBe("pending");
    expect(source).not.toContain("Todo o conteúdo factual foi verificado");
    const record = articleRecords.find((a) => a.slug === slug);
    expect(record?.status).toBe("published");
    for (const allowDemo of [false, true]) {
      const repo = createContentRepository(articleRecords, allowDemo);
      expect(repo.getArticleBySlug(slug)?.slug).toBe(slug);
      expect(repo.getPublishedArticles().some((a) => a.slug === slug)).toBeTrue();
      expect(repo.searchArticles("pandemia").some((a) => a.slug === slug)).toBeTrue();
      expect(generateSitemap(repo.getPublishedArticles())).toContain(slug);
      expect(generateRss(repo.getPublishedArticles())).toContain(slug);
      const draftRepo = createContentRepository(
        articleRecords.map((a) => (a.slug === slug ? { ...a, status: "draft" } : a)),
        allowDemo,
      );
      expect(draftRepo.getArticleBySlug(slug)).toBeUndefined();
      expect(generateSitemap(draftRepo.getPublishedArticles())).not.toContain(slug);
      expect(generateRss(draftRepo.getPublishedArticles())).not.toContain(slug);
    }
    const research = evaluateResearch(await loadResearchBrief(slug));
    expect(research.readyForWriting).toBeFalse();
    expect(research.readyForReview).toBeTrue();
    expect(research.riskApproval?.responsible).toBe("olavo-oliveira");
  });
  test("originais intactos, WebPs válidos e proporções sem crop", () => {
    expect(manifest).toHaveLength(4);
    for (const image of manifest) {
      expect(createHash("sha256").update(readFileSync(image.original)).digest("hex")).toBe(
        image.sha256,
      );
      for (const variant of image.variants) {
        const bytes = readFileSync(`public${variant.src}`);
        expect(bytes.subarray(0, 4).toString()).toBe("RIFF");
        expect(bytes.subarray(8, 12).toString()).toBe("WEBP");
        expect(
          Math.abs(variant.height / variant.width - image.fallback.height / image.fallback.width),
        ).toBeLessThan(0.003);
      }
    }
  });
  test("usa as versões qualitativas e preserva a proveniência declarada", () => {
    const edited = JSON.parse(
      readFileSync("docs/editorial/art-031-pre-publicacao/imagens-v2.json", "utf8"),
    ) as Array<{ edited: string; sha256: string; variants: Array<{ src: string }> }>;
    expect(edited).toHaveLength(2);
    for (const record of edited) {
      expect(createHash("sha256").update(readFileSync(record.edited)).digest("hex")).toBe(
        record.sha256,
      );
      for (const variant of record.variants) expect(source).toContain(variant.src);
    }
    expect(parsed.frontmatter.cover.aiProvenance?.contributions).toContainEqual({
      role: "generation",
      tool: "ChatGPT",
    });
    expect(parsed.frontmatter.cover.credit).toBe("Fonte: SGES, (2026).");
    expect(parsed.frontmatter.aiDisclosure).toContain("responsabilidade pelo conteúdo");
  });
  test("MDX renderiza pontos, destaque e figuras com alt e srcset", async () => {
    const code = await compile(source, {
      outputFormat: "function-body",
      remarkPlugins: [remarkFrontmatter],
    });
    const { default: Content } = await run(String(code), runtime);
    const html = renderToStaticMarkup(<Content components={editorialMdxComponents} />);
    expect(html).toContain("A Tese Central");
    expect(html.match(/<figure/g)).toHaveLength(3);
    expect(html.match(/<figcaption/g)).toHaveLength(3);
    expect(html).toContain("srcSet=");
    expect(html).toContain("Viva o SUS");
    expect(html).not.toContain('alt=""');
  });
});
