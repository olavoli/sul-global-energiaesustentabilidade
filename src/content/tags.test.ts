import { describe, expect, test } from "bun:test";
import { articleRecords } from "./generated/articles";
import { buildTagTopics, tagSlug } from "./tags";
import { createContentRepository } from "./repository";
import { generateRss, generateSitemap } from "@/lib/distribution";

const today = "2026-10-12";
const tagged = (slug: string, tags = ["energia solar"], publishedAt = "2026-10-01") => ({
  slug,
  tags,
  publishedAt,
  status: "published",
  isDemo: false,
});

describe("navegação por tags", () => {
  test("gera endereços legíveis para acentos, siglas e parênteses", () => {
    expect(tagSlug("eficiência energética")).toBe("eficiencia-energetica");
    expect(tagSlug("armazenamento de longa duração (ldes)")).toBe(
      "armazenamento-de-longa-duracao-ldes",
    );
    expect(tagSlug("restrição de geração (curtailment)")).toBe("restricao-de-geracao-curtailment");
    expect(tagSlug("ferro-ar")).toBe("ferro-ar");
  });

  test("associação é exata, sem reutilizar a busca textual", () => {
    const topics = buildTagTopics([tagged("solar"), tagged("energia", ["energia"])], today);
    expect(topics.find((topic) => topic.slug === "energia")?.articles.map((a) => a.slug)).toEqual([
      "energia",
    ]);
  });

  test("exclui demos, rascunhos, aprovados, agendados e publicações futuras", () => {
    const topics = buildTagTopics(
      [
        tagged("real"),
        { ...tagged("demo", ["demo"]), isDemo: true },
        { ...tagged("draft", ["draft"]), status: "draft" },
        { ...tagged("approved", ["approved"]), status: "approved" },
        { ...tagged("scheduled", ["scheduled"]), status: "scheduled" },
        tagged("future", ["future"], "2099-01-01"),
        { ...tagged("undated", ["undated"]), publishedAt: undefined },
      ],
      today,
    );
    expect(topics.map((topic) => topic.name)).toEqual(["energia solar"]);
    expect(topics[0].articles.map((article) => article.slug)).toEqual(["real"]);
  });

  test("repetições não promovem uma página de um artigo à indexação", () => {
    const article = tagged("único", ["energia solar", "energia solar"]);
    const [topic] = buildTagTopics([article, article], today);
    expect(topic.articles).toHaveLength(1);
    expect(topic.indexable).toBe(false);
  });

  test("segunda publicação habilita o tema automaticamente e ordena por recência", () => {
    const first = tagged("primeiro");
    const second = tagged("segundo", ["energia solar"], "2026-10-12");
    expect(buildTagTopics([first], today)[0].indexable).toBe(false);
    const [topic] = buildTagTopics([first, second], today);
    expect(topic.indexable).toBe(true);
    expect(topic.articles.map((article) => article.slug)).toEqual(["segundo", "primeiro"]);
    expect(topic.slug).toBe(buildTagTopics([first], today)[0].slug);
  });

  test("não mistura etiquetas diferentes que colidam em um endereço", () => {
    expect(() => buildTagTopics([tagged("a", ["c++", "c#"])], today)).toThrow(
      "Tags diferentes geram o mesmo endereço",
    );
    expect(() => tagSlug("!!!")).toThrow("Tag sem slug navegável");
  });

  test("todas as tags reais publicadas têm uma página única, sem alterar os metadados", () => {
    const before = JSON.stringify(articleRecords);
    const topics = buildTagTopics(articleRecords, today);
    const published = createContentRepository(articleRecords, false, today).getPublishedArticles();
    expect(topics.length).toBe(new Set(published.flatMap((article) => article.tags)).size);
    for (const topic of topics) {
      expect<string[]>(topic.articles.map((article) => article.slug).sort()).toEqual(
        published
          .filter((article) => article.tags.includes(topic.name))
          .map((article) => article.slug)
          .sort(),
      );
    }
    expect(JSON.stringify(articleRecords)).toBe(before);
  });

  test("sitemap acrescenta apenas temas com cobertura e preserva URLs dos artigos", () => {
    const articles = createContentRepository(articleRecords, false, today).getPublishedArticles();
    const sitemap = generateSitemap(articles);
    for (const article of articles) {
      expect(sitemap).toContain(article.canonicalUrl ?? `/artigo/${article.slug}`);
    }
    for (const topic of buildTagTopics(articles, today)) {
      if (topic.indexable) expect(sitemap).toContain(`/tag/${topic.slug}</loc>`);
      else expect(sitemap).not.toContain(`/tag/${topic.slug}</loc>`);
    }
    expect(generateSitemap(articles, false)).not.toContain("/tag/");
    expect(generateRss(articles)).not.toContain("/tag/");
  });
});
