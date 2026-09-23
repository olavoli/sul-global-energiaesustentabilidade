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

const slug = "e-possivel-produzir-eletricidade-de-dia-e-de-noite";
const articlePath = `content/articles/${slug}.mdx`;
const canonicalDocxPath = "docs/editorial/art-027-revisao/art-027-revisado-v4.docx";
const imageDirectory = `public/images/articles/${slug}`;
const source = readFileSync(articlePath, "utf8");
const parsed = parseEditorialFile(source, articlePath);

const notice =
  "Antes de iniciar a montagem, consulte o estudo original e as fichas técnicas dos componentes citados nas referências. A massa e a fração de enchimento do PCM, as dimensões internas do reservatório, a expansão do PEG utilizado, a pressão de montagem do TEG, as propriedades ópticas do filme e os parâmetros do conversor precisam ser definidos para os componentes escolhidos. Parte dessas especificações não foi confirmada nas fontes consultadas; quando não estiver disponível, solicite orientação ao fabricante ou aos autores. O roteiro não garante alimentação contínua da carga.";

const expectedTables = [
  [
    ["Estudo", "Condição", "Fase ou período", "Grandeza", "Resultado", "Interpretação"],
    [
      "[1]",
      "8 simuladores; 5 h de exposição",
      "Iluminação / transição posterior",
      "Energia elétrica por área",
      "4,4 / 0,19 Wh/m²",
      "Valores de fases diferentes; não são potências.",
    ],
    [
      "[1]",
      "10 h de exposição",
      "Transição posterior",
      "Duração e energia por área",
      "8,18 h; 414 mWh/m²",
      "Não associar essa duração aos 0,19 Wh/m² da linha anterior.",
    ],
    [
      "[1]",
      "Quase 10 h; unidade isolada com filme",
      "Total do ensaio",
      "Energia elétrica por área",
      "8,78 Wh/m²",
      "Resultado dessa configuração, não produção diária garantida.",
    ],
    [
      "[2]",
      "80-AB; 8 simuladores",
      "Condição analisada",
      "Média da potência máxima por área",
      "0,84 W/m²",
      "Métrica reportada, não potência constante durante 24 h.",
    ],
    [
      "[2]",
      "80-AB; cerca de 968 W/m²",
      "Condição analisada",
      "Eficiência exergética máxima",
      "Cerca de 0,124%",
      "Não é eficiência fotovoltaica nem rendimento universal do TEG.",
    ],
    [
      "[2]",
      "10 h de exposição",
      "Projeção anual",
      "Emissões evitadas estimadas",
      "Até cerca de 1,11 kg de CO₂/ano",
      "Estimativa dependente de hipóteses; não medição anual em campo.",
    ],
  ],
  [
    ["Aspecto", "Potencial", "Limitação"],
    [
      "Operação",
      "O PCM pode prolongar diferenças de temperatura.",
      "Capacidade térmica finita; transições e clima podem interromper a alimentação útil.",
    ],
    [
      "Projeto térmico e elétrico",
      "O TEG converte calor sem peças móveis no módulo.",
      "Contatos, vedação, circuito, isolamento e durabilidade precisam de validação.",
    ],
    [
      "Economia",
      "Pode ser interessante para sensores de difícil acesso.",
      "Custo total, manutenção e autonomia devem ser comparados para a mesma função; não há vantagem universal demonstrada.",
    ],
    [
      "Ambiente",
      "Pode aproveitar calor disponível e reduzir trocas de baterias em aplicações adequadas.",
      "Benefício depende da energia efetivamente substituída, fabricação, materiais, vida útil e descarte.",
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

describe("ART-027 — integração canônica do DOCX revisado v4", () => {
  test("mantém o DOCX canônico e o corpo MDX congelados", () => {
    expect(createHash("sha256").update(readFileSync(canonicalDocxPath)).digest("hex")).toBe(
      "af9f90b2972dc0701637f51d302d9a0d78005a9d6fde51ab51af1d4be1cadf83",
    );
    expect(
      createHash("sha256").update(parsed.body.replace(/\r\n/g, "\n").trim()).digest("hex"),
    ).toBe("9bfc2af93edb97be8094d31ae66df256ff75a2b46449590b124270002e49c2e4");
    expect(parsed.body.match(new RegExp(notice, "g"))).toHaveLength(1);
    expect(parsed.body.indexOf(notice)).toBeGreaterThan(
      parsed.body.indexOf("## Fazendo um gerador termoelétrico"),
    );
  });

  test("preserva título, categoria, quatro pontos-chave e referências", async () => {
    expect(parsed.frontmatter.title).toBe("É possível produzir eletricidade de dia e de noite?");
    expect(parsed.frontmatter.category).toBe("funcional");
    expect(parsed.frontmatter.status).toBe("published");
    expect(parsed.frontmatter.publishedAt).toBe("2026-09-23");
    expect(parsed.frontmatter.sources).toHaveLength(11);
    expect(parsed.frontmatter.sourceUrls).toHaveLength(12);

    const html = await renderArticle();
    const keyPoints = html.match(/aria-label="Pontos-chave"[\s\S]*?<\/section>/)?.[0] ?? "";
    expect(keyPoints.match(/<li>/g)).toHaveLength(4);
    expect(source).not.toContain("## Fontes e referências");
    expect(source).not.toContain("Registro de imagens");
  });

  test("preserva as tabelas técnicas 7×6 e 5×3 célula a célula", async () => {
    const html = await renderArticle();
    const renderedTables = [...html.matchAll(/<table[^>]*>(.*?)<\/table>/gs)].map((table) =>
      [...table[1].matchAll(/<t[hd][^>]*>(.*?)<\/t[hd]>/gs)].map((cell) =>
        cell[1]
          .replace(/<[^>]+>/g, "")
          .replaceAll("&amp;", "&")
          .replaceAll("&lt;", "<")
          .replaceAll("&gt;", ">")
          .replace(/\s+/g, " ")
          .trim(),
      ),
    );
    expect(renderedTables).toEqual(expectedTables.map((table) => table.flat()));
  });

  test("usa somente os quatro assets aprovados e registra a proveniência individual", () => {
    expect(readdirSync(imageDirectory).sort()).toEqual([
      "art-027-figura-1-teg.png",
      "art-027-figura-3-dia-noite.png",
      "art-027-figura-4-tutorial.png",
      "art-027-hero.jpg",
    ]);
    expect(parsed.frontmatter.cover.aiProvenance?.contributions).toEqual([
      { role: "generation", tool: "Reve (app.reve.com)" },
    ]);
    expect((source.match(/<Figure\b/g) ?? []).length).toBe(3);
    expect(source).toContain('aiGenerationTool="Grok/xAI"');
    expect(source).toContain('aiGenerationTool="ChatGPT/OpenAI"');
    expect(source).toContain('aiGenerationTool="Reve (app.reve.com)"');
    expect(
      (source.match(/aiEditingTool="Ferramenta de imagens da OpenAI \(Codex\)"/g) ?? []).length,
    ).toBe(3);
    expect((source.match(/credit="Fonte: SGES \(2026\)\."/g) ?? []).length).toBe(3);
    expect(parsed.frontmatter.cover.credit).toBe("Fonte: SGES (2026).");
  });

  test("integra artigo, categoria, busca, home, sitemap, RSS e metadados sociais", () => {
    const article = getArticleBySlug(slug);
    expect(article?.slug).toBe(slug);
    expect(getArticlesByCategory("funcional").map((item) => item.slug)).toContain(slug);
    expect(searchArticles("termoelétrico").map((item) => item.slug)).toContain(slug);
    expect(getLatestArticles(1)[0]?.slug).toBe(slug);
    expect(getRelatedArticles(article!).map((related) => related.slug)).not.toContain(slug);
    expect(getRelatedArticles(article!)).not.toHaveLength(0);

    const published = getPublishedArticles();
    expect(generateSitemap(published)).toContain(`/artigo/${slug}`);
    expect(generateRss(published)).toContain("É possível produzir eletricidade de dia e de noite?");

    expect(articleJsonLd(article!)).toMatchObject({
      headline: "É possível produzir eletricidade de dia e de noite?",
      image: [expect.stringContaining("art-027-hero.jpg")],
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
        { property: "og:image", content: expect.stringContaining("art-027-hero.jpg") },
      ]),
    );
  });
});
