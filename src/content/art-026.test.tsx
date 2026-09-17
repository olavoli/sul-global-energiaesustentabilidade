import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { compile, run } from "@mdx-js/mdx";
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import * as runtime from "react/jsx-runtime";
import remarkFrontmatter from "remark-frontmatter";
import { editorialMdxComponents } from "@/components/editorial/mdx-components";
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

const slug = "e-possivel-resfriar-uma-casa-sem-ar-condicionado";
const articlePath = `content/articles/${slug}.mdx`;
const canonicalDocxPath =
  "docs/editorial/art-026-revisao/resfriar_casa_sem_ar_condicionado_revisado_v5.docx";
const imageDirectory = `public/images/articles/${slug}`;
const source = readFileSync(articlePath, "utf8");
const parsed = parseEditorialFile(source, articlePath);

const expectedTables = [
  [
    ["Princípio", "Mecanismo", "Aplicação e limite no badgir"],
    [
      "Pressão do vento",
      "A face a barlavento recebe pressão positiva; a face a sotavento tende a pressão menor.",
      "Pode promover entrada por um canal e exaustão por outro. Depende da direção do vento e da geometria.",
    ],
    [
      "Ventilação cruzada",
      "O ar percorre uma trajetória entre aberturas de entrada e saída.",
      "Remove calor e contaminantes e aumenta a velocidade do ar na zona ocupada.",
    ],
    [
      "Flutuabilidade térmica",
      "O ar aquecido fica menos denso e sobe.",
      "Pode manter exaustão pelo alto e induzir entrada inferior quando há diferença térmica e altura útil.",
    ],
    [
      "Massa térmica",
      "Paredes e pisos armazenam e liberam calor ao longo do tempo.",
      "Pode amortecer picos; precisa de condições para descarregar o calor acumulado.",
    ],
    [
      "Evaporação opcional",
      "A evaporação reduz a temperatura de bulbo seco e aumenta a umidade.",
      "Só deve ser incorporada quando o bulbo úmido e a qualidade da água tornam o processo adequado.",
    ],
  ],
  [
    [
      "Estratégia",
      "Mecanismo",
      "Quente-seco",
      "Quente-úmido",
      "Efeito principal",
      "Condições",
      "Limite crítico",
    ],
    [
      "Sombreamento",
      "Reduz radiação solar incidente",
      "Muito relevante",
      "Muito relevante",
      "Reduz ganhos e temperaturas de superfície",
      "Orientação e geometria",
      "Não remove calor já acumulado",
    ],
    [
      "Cobertura e isolamento",
      "Reduz fluxo de calor pela envoltória",
      "Muito relevante",
      "Muito relevante",
      "Reduz carga e picos internos",
      "Materiais, cor e execução",
      "Precisa ser compatível com umidade e uso",
    ],
    [
      "Ventilação cruzada e ventiladores",
      "Pressão do vento e movimento do ar",
      "Relevante",
      "Relevante com controle",
      "Remove calor quando o exterior ajuda e resfria pessoas",
      "Vento, aberturas e qualidade do ar",
      "Pode trazer calor, ruído, poluição ou umidade",
    ],
    [
      "Massa térmica e purga noturna",
      "Armazena calor e descarrega à noite",
      "Frequentemente favorável",
      "Condicionada",
      "Amortece picos e pode resfriar a estrutura",
      "Noites mais frias e vazão suficiente",
      "Pode reter calor quando a noite não permite descarga",
    ],
    [
      "Evaporativo",
      "Evaporação da água",
      "Frequentemente favorável",
      "Geralmente limitado",
      "Pode reduzir o bulbo seco",
      "Depressão de bulbo úmido, água e manutenção",
      "Eleva a umidade; não adotar por um limite fixo de UR",
    ],
    [
      "Torre de vento",
      "Pressão do vento e flutuabilidade",
      "Aplicável",
      "Aplicável com adaptação",
      "Ventila; pode somar evaporação quando apropriado",
      "Orientação, altura, seção e perdas",
      "Exige proteção contra chuva, poeira, insetos e ruído",
    ],
    [
      "Radiativo",
      "Emissão de infravermelho para o céu",
      "Potencial maior em céu claro e seco",
      "Potencial mais variável",
      "Pode resfriar superfícies e um fluido acoplado",
      "Céu, umidade, nuvens e material",
      "Não é garantia de resfriamento do ambiente inteiro",
    ],
  ],
] as const;

async function renderArticle() {
  const compiled = await compile(source, {
    outputFormat: "function-body",
    remarkPlugins: [remarkFrontmatter],
  });
  const { default: Content } = await run(String(compiled), runtime);
  return renderToStaticMarkup(<Content components={editorialMdxComponents} />);
}

describe("ART-026 — integração canônica do DOCX revisado v5", () => {
  test("mantém o DOCX canônico e o corpo MDX congelados", () => {
    expect(createHash("sha256").update(readFileSync(canonicalDocxPath)).digest("hex")).toBe(
      "774330bbd84ffa4ee18e743e08c1743d80bd8e39ca098879eda636125c8533ec",
    );
    expect(
      createHash("sha256").update(parsed.body.replace(/\r\n/g, "\n").trim()).digest("hex"),
    ).toBe("cb386aff6dce3bdeba5cbea890f4663f32cef9b77b3ff3290e52f8c7936f1f0b");
  });

  test("preserva título, categoria, quatro pontos-chave e referências", async () => {
    expect(parsed.frontmatter.title).toBe("É possível resfriar uma casa sem ar-condicionado?");
    expect(parsed.frontmatter.category).toBe("funcional");
    expect(parsed.frontmatter.status).toBe("published");
    expect(parsed.frontmatter.publishedAt).toBe("2026-09-17");
    expect(parsed.frontmatter.sources).toHaveLength(10);
    expect(parsed.frontmatter.sourceUrls).toHaveLength(10);

    const html = await renderArticle();
    const keyPoints = html.match(/aria-label="Pontos-chave"[\s\S]*?<\/section>/)?.[0] ?? "";
    expect(keyPoints.match(/<li>/g)).toHaveLength(4);
    expect(source).not.toContain("Registro de imagens");
    expect(source).not.toContain("Referências bibliográficas");
  });

  test("preserva as tabelas técnicas 6×3 e 8×7 célula a célula", async () => {
    const html = await renderArticle();
    const renderedTables = [...html.matchAll(/<table[^>]*>(.*?)<\/table>/gs)].map((table) =>
      [...table[1].matchAll(/<t[hd][^>]*>(.*?)<\/t[hd]>/gs)].map((cell) =>
        cell[1]
          .replace(/<[^>]+>/g, "")
          .replaceAll("&amp;", "&")
          .replace(/\s+/g, " ")
          .trim(),
      ),
    );
    expect(renderedTables).toEqual(expectedTables.map((table) => table.flat()));
  });

  test("usa somente os quatro assets aprovados e registra a proveniência individual", () => {
    expect(readdirSync(imageDirectory).sort()).toEqual([
      "art-026-figura-2-torre-de-vento.png",
      "art-026-figura-3-eastgate.png",
      "art-026-figura-4-cii-godrej.png",
      "art-026-hero.png",
    ]);
    expect(parsed.frontmatter.cover.aiProvenance?.contributions).toEqual([
      { role: "generation", tool: "ChatGPT/OpenAI" },
    ]);
    expect((source.match(/<Figure\b/g) ?? []).length).toBe(3);
    expect((source.match(/aiGenerationTool="ChatGPT\/OpenAI"/g) ?? []).length).toBe(2);
    expect((source.match(/aiGenerationTool="Gemini Notebook"/g) ?? []).length).toBe(1);
    expect((source.match(/credit="Fonte: SGES \(2026\)\."/g) ?? []).length).toBe(3);
    expect(parsed.frontmatter.cover.credit).toBe("Fonte: SGES (2026).");
    expect(source).not.toContain("art-026-imagem-1-torre-de-vento-corrigida-v1.png");
  });

  test("integra artigo, categoria, busca, home, sitemap e RSS", () => {
    const article = getArticleBySlug(slug);
    expect(article?.slug).toBe(slug);
    expect(getArticlesByCategory("funcional").map((article) => article.slug)).toContain(slug);
    expect(searchArticles("resfriar uma casa").map((article) => article.slug)).toContain(slug);
    expect(getLatestArticles(1)[0]?.slug).toBe(slug);
    expect(getRelatedArticles(article!).map((related) => related.slug)).not.toContain(slug);
    expect(getRelatedArticles(article!)).not.toHaveLength(0);

    const published = getPublishedArticles();
    expect(generateSitemap(published)).toContain(`/artigo/${slug}`);
    expect(generateRss(published)).toContain("É possível resfriar uma casa sem ar-condicionado?");

    expect(articleJsonLd(article!)).toMatchObject({
      headline: "É possível resfriar uma casa sem ar-condicionado?",
      image: [expect.stringContaining("art-026-hero.png")],
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
        { property: "og:image", content: expect.stringContaining("art-026-hero.png") },
      ]),
    );
  });
});
