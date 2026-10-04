import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { compile, run } from "@mdx-js/mdx";
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import * as runtime from "react/jsx-runtime";
import remarkFrontmatter from "remark-frontmatter";
import { AiEditorialCredit } from "@/components/editorial/AiEditorialCredit";
import { editorialMdxComponents } from "@/components/editorial/mdx-components";
import { articleAiImageTools } from "@/content/image-ai-credit";
import { getArticleBySlug } from "@/content/repository";
import { parseEditorialFile } from "../../scripts/generate-content";

const slug =
  "transicao-energetica-justa-em-santa-catarina-quem-paga-a-conta-e-quem-decide-o-futuro-da-regiao-carbonifera-parte-2";
const source = readFileSync(`content/articles/${slug}.mdx`, "utf8");
const parsed = parseEditorialFile(source);
const imageDirectory = `public/images/articles/${slug}`;
const imageNames = [
  "art-029-hero.jpg",
  "art-029-figura-1-sete-eixos.png",
  "art-029-figura-2-governanca.png",
  "art-029-figura-3-financiamento.png",
  "art-029-figura-4-ods.png",
];
const imageHashes = [
  "c5df433401ed7ee6bd18b943de7c04e742e9c5946b6c4389f5f1779230a18508",
  "bfdddab7837b253746665b4a60ad3034641cf795bef81bfa55b5f89cfb8fd3e8",
  "b1824553a989179eae4107e8717e150dc368babd40ad963c9bac8b8fb39bbf1a",
  "2d885234c9765f7066ec5582c1fa8fc5149481a4ec1ec6e22024aeb1ef637345",
  "0bf0f5599d672f9ff2e53df5deb0980fb58b8d0537cee0a248c9951b0f408bf7",
];
const hash = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");

async function renderArticle() {
  const compiled = await compile(source, {
    outputFormat: "function-body",
    remarkPlugins: [remarkFrontmatter],
  });
  const { default: Content } = await run(String(compiled), runtime);
  return renderToStaticMarkup(<Content components={editorialMdxComponents} />);
}

describe("ART-029 — integração editorial aprovada", () => {
  test("exibe a nota personalizada uma única vez no modo detalhado", () => {
    const disclosure =
      "Este artigo foi elaborado com auxílio de inteligência artificial (IA) na revisão e organização do conteúdo. As imagens foram geradas com o ChatGPT. A direção editorial e a conferência final das informações foram realizadas por Olavo Oliveira, SGES (2026).";
    expect(parsed.frontmatter.aiDisclosureMode).toBe("detailed");
    expect(parsed.frontmatter.aiDisclosure).toBe(disclosure);

    const article = getArticleBySlug(slug);
    if (!article) throw new Error("ART-029 não encontrado.");
    expect(article.aiDisclosureMode).toBe("detailed");
    expect(article.aiDisclosure).toBe(disclosure);
    const pageDisclosure =
      article.aiDisclosureMode === "detailed" ? article.aiDisclosure : undefined;
    expect(pageDisclosure).toBe(disclosure);

    const html = renderToStaticMarkup(
      <AiEditorialCredit
        assistance={article.aiAssistance}
        publicationDate={article.publishedAt ?? article.createdAt}
        imageTools={articleAiImageTools(article)}
        disclosure={pageDisclosure}
      />,
    );
    expect(html.match(/Nota de Transparência/g)).toHaveLength(1);
    expect(html.split(disclosure)).toHaveLength(2);
    expect(html.replace(/<[^>]+>/g, "")).not.toContain(
      "Texto elaborado com auxílio de inteligência artificial (IA); direção editorial e conferência técnica: Olavo Oliveira, SGES (2026).",
    );
  });

  test("registra slug, categoria, título e fontes canônicas", () => {
    expect(getArticleBySlug(slug)).toMatchObject({
      slug,
      title:
        "Transição Energética Justa em Santa Catarina: quem paga a conta e quem decide o futuro da região carbonífera? — Parte 2",
      category: "transicao-energetica",
      status: "published",
    });
    expect(parsed.frontmatter.sources).toHaveLength(22);
    expect(
      parsed.frontmatter.sources.every((item) => item.title && item.url && item.note),
    ).toBeTrue();
    expect(source).not.toContain("sourceUrls");
    expect(source).toContain(
      "/artigo/transicao-energetica-justa-em-santa-catarina-empregos-e-cidades-depois-do-carvao",
    );
    expect(source).toContain("Na Parte 3");
    expect(source).not.toMatch(/\]\([^)]*parte-3[^)]*\)/);
  });

  test("usa exatamente a Hero e as quatro artes fornecidas, sem edição", () => {
    expect(readdirSync(imageDirectory).sort()).toEqual([...imageNames].sort());
    expect(parsed.frontmatter.cover.src).toBe(`/images/articles/${slug}/art-029-hero.jpg`);
    expect(parsed.frontmatter.cover.caption).toStartWith("Imagem ilustrativa:");
    expect(source.match(/<Figure\b/g)).toHaveLength(4);
    for (const [index, name] of imageNames.entries()) {
      expect(hash(`${imageDirectory}/${name}`)).toBe(imageHashes[index]);
    }
  });

  test("renderiza cinco pontos-chave, destaque e tabelas acessíveis completas", async () => {
    const html = await renderArticle();
    const keyPoints = html.match(/aria-label="Pontos-chave"[\s\S]*?<\/section>/)?.[0] ?? "";
    expect(keyPoints.match(/<li>/g)).toHaveLength(5);
    expect(html).toContain("Transição vs. prorrogação — o dilema regulatório no coração do plano");
    expect(source.match(/<Callout\b/g)).toHaveLength(1);
    expect(html).toContain("ponte");
    expect(html).toContain("âncora");
    expect(html).toContain("sete eixos estratégicos e 76 ações");
    const tables = [...html.matchAll(/<table[^>]*>(.*?)<\/table>/gs)].map((match) => match[1]);
    expect(tables).toHaveLength(2);
    for (const [index, table] of tables.entries()) {
      expect(table).toContain("<caption");
      expect(table).toContain("<thead");
      expect(table).toContain("<tbody");
      expect(table.match(/scope="row"/g)).toHaveLength(index === 0 ? 7 : 11);
      expect(table.match(/scope="col"/g)).toHaveLength(index === 0 ? 4 : 3);
      expect(table.match(/<tr\b/g)).toHaveLength(index === 0 ? 8 : 12);
    }
    expect(html).toContain('tabindex="0"');
    expect(html).toContain("overflow-x-auto");
    expect(html.match(/<img\b/g)).toHaveLength(4);
  });
});
