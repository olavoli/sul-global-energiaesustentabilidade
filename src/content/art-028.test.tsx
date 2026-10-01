import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { compile, run } from "@mdx-js/mdx";
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import * as runtime from "react/jsx-runtime";
import remarkFrontmatter from "remark-frontmatter";
import { editorialMdxComponents } from "@/components/editorial/mdx-components";
import { AiEditorialCredit } from "@/components/editorial/AiEditorialCredit";
import {
  getArticleBySlug,
  getArticlesByCategory,
  getLatestArticles,
  getPublishedArticles,
  getRelatedArticles,
  searchArticles,
} from "@/content/repository";
import { generateRss, generateSitemap } from "@/lib/distribution";
import { articleJsonLd, socialMeta } from "@/lib/seo";
import { parseEditorialFile } from "../../scripts/generate-content";

const slug = "transicao-energetica-justa-em-santa-catarina-empregos-e-cidades-depois-do-carvao";
const canonicalTitle =
  "Transição Energética Justa em Santa Catarina: Empregos e cidades depois do carvão - Parte 1";
const transparencyNote =
  "Este artigo contou com o auxílio de ferramentas de Inteligência Artificial (ChatGPT) e imagens geradas por REVE (app.reve.com) e ChatGPT/OpenAI durante as etapas de pesquisa inicial, estruturação de tópicos e revisão gramatical. Todo o conteúdo factual foi verificado, expandido e editado por Olavo Oliveira, visando garantir a precisão das informações apresentadas.";
const articlePath = `content/articles/${slug}.mdx`;
const canonicalDocxPath = "docs/editorial/art-028-revisao/art-028-revisado-v2.docx";
const imageDirectory = `public/images/articles/${slug}`;
const source = readFileSync(articlePath, "utf8");
const parsed = parseEditorialFile(source, articlePath);

const expectedTable = [
  [
    "Município",
    "VA Total (R$ milhões)",
    "VA Mineração e Energia (R$ milhões)",
    "% do Setor sobre a Economia Local",
  ],
  ["Treviso", "272,8", "258,5", "95,0%"],
  ["Capivari de Baixo", "717,3", "542,7", "75,6%"],
  ["Lauro Müller", "237,3", "171,2", "72,1%"],
  ["Forquilhinha", "593,9", "246,6", "41,5%"],
  ["Siderópolis", "245,8", "82,5", "33,6%"],
  ["Içara", "886,8", "161,8", "18,2%"],
  ["Urussanga", "551,9", "94,1", "17,1%"],
  ["Criciúma", "3.043,6", "184,8", "6,1%"],
] as const;

async function renderArticle() {
  const compiled = await compile(source, {
    outputFormat: "function-body",
    remarkPlugins: [remarkFrontmatter],
  });
  const { default: Content } = await run(String(compiled), runtime);
  return renderToStaticMarkup(<Content components={editorialMdxComponents} />);
}

describe("ART-028 — integração canônica do DOCX revisado v2", () => {
  test("mantém o DOCX canônico e o corpo MDX congelados", () => {
    expect(createHash("sha256").update(readFileSync(canonicalDocxPath)).digest("hex")).toBe(
      "dc6151cb9bec134cc37cea8bf38a4e364a09b1bba26e547f622a73d4bae487ce",
    );
    expect(
      createHash("sha256").update(parsed.body.replace(/\r\n/g, "\n").trim()).digest("hex"),
    ).toBe("93ee2ee8d348fe8f50d7a1f398ec803310d28bd89f325aa80edd4ce746a8361e");
  });

  test("preserva título, categoria, pontos-chave e referências", async () => {
    expect(parsed.frontmatter.title).toBe(canonicalTitle);
    expect(parsed.frontmatter.seoTitle).toBe(canonicalTitle);
    expect(parsed.frontmatter.subtitle).toBe("Parte 1 — Empregos e cidades depois do carvão");
    expect(parsed.frontmatter.category).toBe("transicao-energetica");
    expect(parsed.frontmatter.status).toBe("published");
    expect(parsed.frontmatter.publishedAt).toBe("2026-09-30");
    expect(parsed.frontmatter.sources).toHaveLength(8);
    expect(parsed.frontmatter.sources).toHaveLength(8);
    expect(parsed.frontmatter.aiDisclosureMode).toBe("detailed");
    expect(parsed.frontmatter.aiDisclosure).toBe(transparencyNote);

    const transparencyHtml = renderToStaticMarkup(
      <AiEditorialCredit
        assistance={parsed.frontmatter.aiAssistance}
        publicationDate={parsed.frontmatter.publishedAt!}
        imageTools={parsed.frontmatter.aiImageTools}
        disclosure={parsed.frontmatter.aiDisclosure}
      />,
    );
    expect(transparencyHtml.match(/Nota de Transparência/g)).toHaveLength(1);
    expect(transparencyHtml).toContain(transparencyNote);

    const html = await renderArticle();
    const keyPoints = html.match(/aria-label="Pontos-chave"[\s\S]*?<\/section>/)?.[0] ?? "";
    expect(keyPoints.match(/<li>/g)).toHaveLength(4);
    expect(source).not.toContain("## Referências");
    expect(source).not.toContain("Registro de imagens");
  });

  test("preserva a tabela 9×4 célula a célula", async () => {
    const html = await renderArticle();
    const renderedTable = [...html.matchAll(/<table[^>]*>(.*?)<\/table>/gs)].map((table) =>
      [...table[1].matchAll(/<t[hd][^>]*>(.*?)<\/t[hd]>/gs)].map((cell) =>
        cell[1]
          .replace(/<[^>]+>/g, "")
          .replaceAll("&amp;", "&")
          .replace(/\s+/g, " ")
          .trim(),
      ),
    );
    expect(renderedTable).toEqual([expectedTable.flat()]);
  });

  test("usa somente as três imagens aprovadas e registra a proveniência individual", () => {
    expect(readdirSync(imageDirectory).sort()).toEqual([
      "art-028-figura-1-va-municipal.png",
      "art-028-figura-2-cadeia.png",
      "art-028-hero.png",
    ]);
    expect(parsed.frontmatter.cover.aiProvenance?.contributions).toEqual([
      { role: "generation", tool: "Reve (app.reve.com)" },
    ]);
    expect((source.match(/<Figure\b/g) ?? []).length).toBe(2);
    expect((source.match(/aiGenerationTool="ChatGPT\/OpenAI"/g) ?? []).length).toBe(2);
    expect((source.match(/credit="Fonte: SGES \(2026\)\."/g) ?? []).length).toBe(2);
    expect(parsed.frontmatter.cover.credit).toBe("Fonte: SGES (2026).");
  });

  test("integra artigo, categoria, busca, home, sitemap, RSS e metadados sociais", () => {
    const article = getArticleBySlug(slug);
    expect(article?.slug).toBe(slug);
    expect(article?.title).toBe(canonicalTitle);
    expect(article?.seoTitle).toBe(canonicalTitle);
    expect(
      getArticlesByCategory("transicao-energetica").find((item) => item.slug === slug)?.title,
    ).toBe(canonicalTitle);
    expect(
      searchArticles("empregos e cidades depois do carvão").find((item) => item.slug === slug)
        ?.title,
    ).toBe(canonicalTitle);
    expect(getLatestArticles(1)[0]).toMatchObject({ slug, title: canonicalTitle });
    expect(getRelatedArticles(article!).map((related) => related.slug)).not.toContain(slug);
    expect(getRelatedArticles(article!)).not.toHaveLength(0);

    const published = getPublishedArticles();
    expect(generateSitemap(published)).toContain(`/artigo/${slug}`);
    expect(generateRss(published)).toContain(canonicalTitle);

    expect(articleJsonLd(article!)).toMatchObject({
      headline: canonicalTitle,
      image: [expect.stringContaining("art-028-hero.png")],
    });
    expect(
      socialMeta({
        title: article!.seoTitle!,
        description: article!.seoDescription!,
        path: article!.canonicalUrl!,
        image: article!.cover.src,
        imageAlt: article!.cover.alt,
        type: "article",
      }),
    ).toEqual(
      expect.arrayContaining([
        { property: "og:title", content: article!.seoTitle },
        { property: "og:image", content: expect.stringContaining("art-028-hero.png") },
      ]),
    );
  });
});
