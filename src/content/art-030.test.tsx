import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { compile, run } from "@mdx-js/mdx";
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import * as runtime from "react/jsx-runtime";
import remarkFrontmatter from "remark-frontmatter";
import { editorialMdxComponents } from "@/components/editorial/mdx-components";
import { SourceList } from "@/components/editorial/SourceList";
import { AiEditorialCredit } from "@/components/editorial/AiEditorialCredit";
import { generateRss, generateSitemap } from "@/lib/distribution";
import { parseEditorialFile } from "../../scripts/generate-content";
import { articleRecords } from "./generated/articles";
import { createContentRepository } from "./repository";
import { evaluateResearch, loadResearchBrief } from "../../scripts/research-operations";
import { resolveCanonical, socialMeta } from "@/lib/seo";

const slug = "a-maquina-que-transforma-calor-desperdicado-em-eletricidade";
const source = readFileSync(`content/articles/${slug}.mdx`, "utf8");
const canonical = readFileSync("src/content/fixtures/art-030-restaurado-aprovado.md", "utf8");
const parsed = parseEditorialFile(source);
const hash = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");

async function renderArticle() {
  const code = await compile(source, {
    outputFormat: "function-body",
    remarkPlugins: [remarkFrontmatter],
  });
  const { default: Content } = await run(String(code), runtime);
  return renderToStaticMarkup(<Content components={editorialMdxComponents} />);
}

describe("ART-030 — integração local da versão restaurada", () => {
  test("registra publicação aprovada, independente e com base de uso das imagens", () => {
    expect(parsed.frontmatter.status).toBe("published");
    expect(parsed.frontmatter.approvedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(parsed.frontmatter.publishedAt).toBe(parsed.frontmatter.approvedAt);
    expect(parsed.frontmatter.sponsored).toBeFalse();
    expect(parsed.frontmatter.sponsorName).toBeUndefined();
    expect(parsed.frontmatter.cover.license).toBe(
      "Output gerado no ChatGPT para o ART-030; uso editorial conforme os termos da OpenAI, na medida permitida pela lei aplicável",
    );
    expect(articleRecords.find((record) => record.slug === slug)?.status).toBe("published");
  });

  test("inclui a publicação em consultas públicas, busca, sitemap e RSS", () => {
    for (const allowDemo of [false, true]) {
      const repository = createContentRepository(articleRecords, allowDemo);
      expect(repository.getArticleBySlug(slug)?.slug).toBe(slug);
      expect(repository.getPublishedArticles().some((article) => article.slug === slug)).toBeTrue();
      expect(
        repository.getArticlesByAuthor("olavo-oliveira").some((article) => article.slug === slug),
      ).toBeTrue();
      expect(
        repository.getArticlesByCategory("energia").some((article) => article.slug === slug),
      ).toBeTrue();
      expect(
        repository.searchArticles("Rankine").some((article) => article.slug === slug),
      ).toBeTrue();
      expect(generateSitemap(repository.getPublishedArticles())).toContain(slug);
      expect(generateRss(repository.getPublishedArticles())).toContain(slug);
    }
  });

  test("continua ocultando o mesmo artigo se estiver em draft", () => {
    const drafts = articleRecords.map((record) =>
      record.slug === slug ? { ...record, status: "draft" as const } : record,
    );
    const repository = createContentRepository(drafts, false);
    expect(repository.getArticleBySlug(slug)).toBeUndefined();
    expect(
      repository.searchArticles("Rankine").some((article) => article.slug === slug),
    ).toBeFalse();
    expect(generateSitemap(repository.getPublishedArticles())).not.toContain(slug);
    expect(generateRss(repository.getPublishedArticles())).not.toContain(slug);
  });

  test("briefing satisfaz o gate de pesquisa após avaliação humana de conflitos", async () => {
    const report = evaluateResearch(await loadResearchBrief(slug));
    expect(report.readyForWriting).toBeTrue();
    expect(report.blockers).toEqual([]);
    expect(report.confirmedCount).toBe(5);
  });

  test("canonical e metadados sociais usam o título, descrição e hero aprovados", () => {
    const article = parsed.frontmatter;
    expect(resolveCanonical(article.canonicalUrl!, "https://sulglobalenergia.com.br")).toBe(
      `https://sulglobalenergia.com.br/artigo/${slug}`,
    );
    const meta = socialMeta({
      title: article.seoTitle!,
      description: article.seoDescription!,
      path: article.canonicalUrl!,
      type: "article",
      image: article.cover.src,
      imageAlt: article.cover.alt,
      imageWidth: article.cover.width,
      imageHeight: article.cover.height,
    });
    expect(meta).toContainEqual({ property: "og:type", content: "article" });
    expect(meta).toContainEqual({ property: "og:title", content: article.title });
    expect(meta).toContainEqual({ property: "og:description", content: article.seoDescription! });
    expect(meta).toContainEqual({ property: "og:image:width", content: "2848" });
    expect(meta).toContainEqual({ name: "twitter:card", content: "summary_large_image" });
  });

  test("preserva cinco pontos-chave, destaque e exemplo de eficiência elétrica líquida", async () => {
    const html = await renderArticle();
    const points = html.match(/aria-label="Pontos-chave"[\s\S]*?<\/section>/)?.[0] ?? "";
    expect(points.match(/<li>/g)).toHaveLength(5);
    expect(source.match(/<KeyPoints>/g)).toHaveLength(1);
    expect(source.match(/<Callout\b/g)).toHaveLength(1);
    expect(html.match(/O Paradoxo da Eficiência/g)).toHaveLength(1);
    expect(html).toContain("1 MW térmico efetivamente transferido ao ciclo");
    expect(html).toContain("eficiência elétrica líquida hipotética de 15%");
    expect(html).toContain("1 MW térmico × 0,15 = 150 kW elétricos líquidos");
    expect(html).toContain("A eficiência térmica do ciclo relaciona o trabalho mecânico líquido");
    expect(html).toContain("Já a eficiência elétrica líquida relaciona a eletricidade disponível");
  });

  test("preserva as quatro colunas e todas as células restauradas em tabela acessível", async () => {
    const html = await renderArticle();
    expect(html.match(/<table\b/g)).toHaveLength(1);
    expect(html).toContain('role="region"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain("overflow-x-auto");
    expect(html.match(/scope="col"/g)).toHaveLength(4);
    expect(html.match(/scope="row"/g)).toHaveLength(5);
    const cells = canonical
      .split(/\r?\n/)
      .filter((line) => line.startsWith("| ") && !line.startsWith("| ---"));
    for (const row of cells) {
      for (const cell of row.split("|").slice(1, -1)) expect(html).toContain(cell.trim());
    }
  });

  test("preserva a narrativa restaurada sem transportar marcadores ou comentários internos", () => {
    const body = canonical.split("## 5 Pontos-Chave")[1].split("## Referências Bibliográficas")[0];
    for (const paragraph of body.split(/\r?\n\s*\r?\n/)) {
      const value = paragraph.trim();
      if (
        !value ||
        value.startsWith("#") ||
        value.startsWith("|") ||
        value.startsWith("<!--") ||
        value.startsWith("![") ||
        value.startsWith("**Figura") ||
        value.startsWith("Fonte: SGES") ||
        value.startsWith("Fontes da tabela")
      )
        continue;
      expect(parsed.body).toContain(value.replace(/\s*\[[\d, –-]+\]\.?$/, ""));
    }
    expect(parsed.body).not.toContain("<!--");
    expect(parsed.body).not.toContain("Word B");
    expect(parsed.body).not.toContain("confirmação humana");
    expect(parsed.body).toContain(
      "Onde o ORC Já Está Mudando a Realidade: Aplicações Reais e Estudos de Engenharia",
    );
    expect(parsed.body).not.toContain("(Casos Reais)");
    expect(parsed.body).toContain("Starwood/Mendez Enerji");
    expect(parsed.body).toContain(
      "não de uma recuperação comprovada do calor já rejeitado pelos secadores",
    );
    expect(parsed.body).toContain(
      "Trata-se de otimização de projeto, não comprovação de um módulo instalado",
    );
    for (const rejected of ["Nesjavellir", "ThyssenKrupp", "Suzano", "Klabin", "Metsä"]) {
      expect(parsed.body).not.toContain(rejected);
    }
  });

  test("estrutura as dezoito referências restauradas e preserva as cinco fontes anteriores", () => {
    expect(parsed.frontmatter.sources).toHaveLength(18);
    expect(new Set(parsed.frontmatter.sources.map((item) => item.url)).size).toBe(18);
    for (const [index, item] of parsed.frontmatter.sources.entries()) {
      expect(canonical).toContain(item.url);
      if (parsed.body.includes(`[${index + 1}](`)) {
        expect(parsed.body).toContain(`[${index + 1}](${item.url})`);
      }
      expect(item.verifiedAt).toMatch(/^2026-10-(09|10)$/);
    }
    expect(
      parsed.frontmatter.sources.filter((item) => item.verifiedAt === "2026-10-09"),
    ).toHaveLength(5);
    expect(source).not.toContain("sourceUrls");
    expect(parsed.body).not.toContain("## Referências");
    const html = renderToStaticMarkup(<SourceList sources={parsed.frontmatter.sources} />);
    expect(html.match(/Fontes e referências/g)).toHaveLength(1);
    expect(html.match(/<li>/g)).toHaveLength(18);
  });

  test("preserva as três artes e centraliza a informação sobre IA na transparência", async () => {
    const directory = `public/images/articles/${slug}`;
    expect(readdirSync(directory).sort()).toEqual([
      "art-030-comparativo.png",
      "art-030-funcionamento.png",
      "art-030-hero.png",
    ]);
    expect(hash(`${directory}/art-030-funcionamento.png`)).toBe(
      "f251fc9998778981caaa41124952273c1e9a0cfa7b1113d386e350cfd295428a",
    );
    expect(hash(`${directory}/art-030-hero.png`)).toBe(
      "2043aa84f4f256650747381082f57edc3a7589306c52be3901be1bf2828f00ba",
    );
    expect(parsed.frontmatter.cover).toMatchObject({ width: 2848, height: 1600 });
    expect(parsed.frontmatter.cover.credit).toBe("Fonte: SGES, (2026).");
    expect(hash(`${directory}/art-030-comparativo.png`)).toBe(
      "8087b00769c7f61299cff1e030573b63ee67a919450d5cecf037b3f78867166f",
    );
    expect(parsed.frontmatter.cover.caption).toContain("representação didática");
    expect(parsed.frontmatter.cover.caption).not.toContain("IA");
    expect(parsed.frontmatter.aiDisclosureMode).toBe("detailed");
    expect(parsed.frontmatter.aiImageTools).toEqual(["ChatGPT/OpenAI"]);
    expect(parsed.frontmatter.aiDisclosure).toBe(
      canonical.split("## Nota de Transparência")[1].trim(),
    );
    expect(parsed.frontmatter.cover.aiProvenance).toBeUndefined();
    expect(parsed.body.match(/<Figure\b/g)).toHaveLength(2);
    const html = await renderArticle();
    expect(html.match(/<img\b/g)).toHaveLength(2);
    expect(html).toContain('width="941"');
    expect(html).toContain('height="1672"');
    expect(html).toContain("Alta e baixa pressão são relativas");
    expect(html).toContain('width="1024"');
    expect(html).toContain('height="1536"');
    expect(html).toContain("não são limites universais");
    expect(html).not.toContain("gerada por IA");
    expect(html).toContain("Figura 2.");
    expect(html).toContain("Figura 3.");
    expect(html.match(/Fonte: SGES, \(2026\)\./g)).toHaveLength(2);
  });

  test("usa a nota autorizada uma vez sem alegar revisão humana integral não confirmada", () => {
    const html = renderToStaticMarkup(
      <AiEditorialCredit
        assistance={parsed.frontmatter.aiAssistance}
        publicationDate={parsed.frontmatter.publishedAt!}
        imageTools={parsed.frontmatter.aiImageTools}
        disclosure={parsed.frontmatter.aiDisclosure}
      />,
    );
    expect(html.match(/Nota de Transparência/g)).toHaveLength(1);
    expect(parsed.body).not.toContain("Nota de Transparência");
    expect(html).not.toContain("pendente");
    expect(html).toContain("verificação documental");
    expect(html).toContain("A autoria e a direção editorial são de Olavo Oliveira");
    expect(html).toContain("não substitui a revisão factual humana integral");
    expect(html).not.toContain("Todo o conteúdo factual foi verificado, expandido e editado");
  });

  test("arquiva exatamente o manuscrito canônico V3 recebido", () => {
    expect(hash("docs/editorial/art-030-revisao/art-030-canonico-v3.md")).toBe(
      "1fae8d1ddc42a128d7c8a2701455d3eacfe2a8aa6fb4b10a363643393531aff5",
    );
  });
});
