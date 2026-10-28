import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  taxonomyCatalog,
  taxonomyLocales,
  sourceTerm,
  taxonomyPath,
  validateTaxonomy,
  validateTranslationTaxonomy,
  taxonomySlug,
} from "./taxonomy-catalog";
import { categories } from "../data/categories";
import { articleRecords } from "./generated/articles";
import { translationRecords } from "./generated/translations";
import { translationSchema, type TranslationRecord } from "./translation-schema";
import { searchTranslations, languageOptions } from "./i18n";
import { taxonomyTopics, taxonomyAlternates } from "./taxonomy-topics";
import { generateSitemap } from "../lib/distribution";
import { getPublishedArticles } from "./repository";
import { taxonomyHead } from "../lib/taxonomy-seo";
import { loadTaxonomy } from "../lib/taxonomy-route";
import { ArticleTags } from "../components/article/ArticleTags";
import { CategoryTag } from "../components/article/CategoryTag";
import { EditorialLocaleContext } from "./locale-context";
import { TaxonomyPage } from "../components/article/TaxonomyPage";
const power = "o-que-e-potencia";
// In-memory fixtures only: no editorial approval is claimed or written to any real article.
const approved: TranslationRecord[] = translationRecords
  .filter((r) => r.translationOf === power)
  .map((r) =>
    translationSchema.parse({
      ...r,
      status: "published",
      approvedAt: "2026-10-24",
      publishedAt: "2026-10-24",
      translationReview: {
        status: "approved",
        reviewer: "SYNTHETIC FIXTURE",
        reviewedAt: "2026-10-24",
      },
    }),
  );
test("closed catalog covers all real article bindings and preserves every PT category/tag URL", () => {
  expect(() => validateTaxonomy()).not.toThrow();
  for (const a of articleRecords.filter((r) => !r.isDemo)) validateTranslationTaxonomy(a, a);
  for (const c of categories) {
    const t = sourceTerm("category", c.slug);
    expect(t.editions["pt-BR"]).toEqual({
      label: c.name,
      slug: c.slug,
      description: c.description,
    });
    expect(taxonomyPath(t, "pt-BR")).toBe(`/categoria/${c.slug}`);
  }
  for (const t of taxonomyCatalog.filter((r) => r.kind === "tag"))
    expect(taxonomyPath(t, "pt-BR")).toBe(`/tag/${taxonomySlug(t.sourceKey)}`);
});
test("IDs, localized labels and slugs are unique and malformed/duplicate definitions fail closed", () => {
  for (const locale of taxonomyLocales)
    for (const kind of ["tag", "category"] as const) {
      const items = taxonomyCatalog.filter((t) => t.kind === kind);
      expect(new Set(items.map((t) => t.editions[locale].slug)).size).toBe(items.length);
    }
  const t = sourceTerm("tag", "potência");
  expect(() => validateTaxonomy([t, { ...t }])).toThrow();
  const other = structuredClone(sourceTerm("tag", "energia"));
  other.editions.en.slug = t.editions.en.slug;
  expect(() => validateTaxonomy([t, other])).toThrow();
  const source = { category: "ciencia", tags: ["potência"] };
  expect(() => validateTranslationTaxonomy(source, { ...source, tags: ["Power"] })).toThrow();
  expect(() =>
    validateTranslationTaxonomy(
      { ...source, tags: ["free invented tag"] },
      { ...source, tags: ["free invented tag"] },
    ),
  ).toThrow();
  expect(() => validateTranslationTaxonomy(source, { ...source, category: "energia" })).toThrow();
});
test("published language-specific membership drives categories/tags; drafts never count", () => {
  for (const locale of ["en", "es"] as const) {
    const empty = taxonomyTopics(locale).find((t) => t.term.sourceKey === "potência");
    expect(empty?.articles).toHaveLength(0);
    const topics = taxonomyTopics(locale, approved);
    const tag = topics.find((t) => t.term.sourceKey === "potência");
    const category = topics.find(
      (t) => t.term.sourceKey === approved[0].category && t.term.kind === "category",
    );
    expect(tag?.articles).toHaveLength(1);
    expect(tag?.indexable).toBe(false);
    expect(category?.articles).toHaveLength(1);
    expect(category?.indexable).toBe(true);
    const duplicated = taxonomyTopics(locale, [...approved, ...approved]);
    expect(duplicated.find((t) => t.term.sourceKey === "potência")?.indexable).toBe(false);
  }
});
test("localized search and filters match canonical memberships without changing stored IDs", () => {
  const en = searchTranslations("en", "Power", {}, approved);
  expect(en).toHaveLength(1);
  expect(searchTranslations("es", "Potencia", {}, approved)).toHaveLength(1);
  expect(searchTranslations("en", "", { tag: "power" }, approved)).toHaveLength(1);
  expect(searchTranslations("es", "", { tag: "potencia" }, approved)).toHaveLength(1);
  expect(searchTranslations("en", "", { category: "invented" }, approved)).toHaveLength(0);
  expect(en[0].tags).toEqual(approved[0].tags);
});
test("localized SEO uses self canonical, local count robots and reciprocal eligible alternates", () => {
  const term = sourceTerm("category", approved[0].category);
  const links = taxonomyAlternates(term, approved);
  expect(links.map((l) => l.locale)).toEqual(["pt-BR", "en", "es", "x-default"]);
  for (const locale of ["en", "es"] as const) {
    const topic = taxonomyTopics(locale, approved).find((t) => t.term.id === term.id);
    const head = taxonomyHead(topic, true, approved);
    expect(head.links?.find((l) => l.rel === "canonical")?.href).toContain(
      taxonomyPath(term, locale),
    );
    expect(head.links?.filter((l) => l.rel === "alternate")).toHaveLength(4);
    const one = taxonomyTopics(locale, approved).find((t) => t.term.sourceKey === "potência");
    expect(taxonomyHead(one, true, approved).meta).toContainEqual({
      name: "robots",
      content: "noindex, follow",
    });
    const zero = taxonomyTopics(locale, approved).find(
      (t) => t.term.sourceKey === "desenvolvimento",
    );
    expect(taxonomyHead(zero, true, approved).meta).toContainEqual({
      name: "robots",
      content: "noindex, follow",
    });
    expect(taxonomyHead(topic, false, approved).meta).toContainEqual({
      name: "robots",
      content: "noindex, nofollow",
    });
  }
});
test("sitemap excludes drafts/empty collections/one-article tags and keeps existing PT routes", () => {
  const articles = getPublishedArticles();
  const before = generateSitemap(articles, true, []);
  expect(before).not.toContain("/en/category/");
  const sitemap = generateSitemap(articles, true, approved);
  expect(sitemap).toContain(taxonomyPath(sourceTerm("category", approved[0].category), "en"));
  expect(sitemap).not.toContain("/en/tag/power</loc>");
  expect(sitemap).not.toContain("/es/categoria/desarrollo</loc>");
  expect(sitemap).toContain("/categoria/ciencia");
  expect(generateSitemap(articles, false, approved)).not.toContain("<url><loc>");
});
test("two published source articles enable localized tag indexing without counting the other language", () => {
  const original = translationRecords.find((r) => r.translationOf !== power && r.locale === "en");
  if (!original) throw Error("Second source fixture required");
  const second = translationSchema.parse({
    ...original,
    tags: ["potência"],
    status: "published",
    publishedAt: "2026-10-24",
    approvedAt: "2026-10-24",
    translationReview: {
      status: "approved",
      reviewer: "SYNTHETIC FIXTURE",
      reviewedAt: "2026-10-24",
    },
  });
  const topics = taxonomyTopics("en", [...approved, second]);
  const powerTopic = topics.find((t) => t.term.sourceKey === "potência");
  expect(powerTopic?.articles).toHaveLength(2);
  expect(powerTopic?.indexable).toBe(true);
  expect(
    taxonomyTopics("es", [...approved, second]).find((t) => t.term.sourceKey === "potência")
      ?.indexable,
  ).toBe(false);
});
test("rendered article taxonomy labels and destinations localize; PT labels and URLs remain unchanged", () => {
  for (const locale of taxonomyLocales) {
    const html = renderToStaticMarkup(
      <EditorialLocaleContext.Provider value={locale}>
        <CategoryTag slug="ciencia" />
        <ArticleTags tags={["potência"]} />
      </EditorialLocaleContext.Provider>,
    );
    expect(html).toContain(taxonomyPath(sourceTerm("category", "ciencia"), locale));
    expect(html).toContain(taxonomyPath(sourceTerm("tag", "potência"), locale));
    expect(html).toContain(sourceTerm("category", "ciencia").editions[locale].label);
    expect(html).toContain(sourceTerm("tag", "potência").editions[locale].label);
  }
});
test("topic language switcher uses equivalent paths and labels a missing translation fallback", () => {
  const options = languageOptions("/tag/potencia", approved);
  expect(options.find((o) => o.locale === "en")?.href).toBe("/en/tag/power");
  const missing = languageOptions("/tag/potencia", []).find((o) => o.locale === "es");
  expect(missing).toEqual({ locale: "es", href: "/es", fallback: true });
});
test("unknown/empty tags return 404, empty categories stay valid, PT aliases preserve query in 301", () => {
  expect(() => loadTaxonomy("en", "tag", "invented")).toThrow();
  expect(() => loadTaxonomy("en", "tag", "power")).toThrow();
  expect(loadTaxonomy("en", "category", "development").articles).toHaveLength(0);
  try {
    loadTaxonomy("en", "category", "energia", "?q=test", approved);
    throw Error("redirect missing");
  } catch (e) {
    expect(e).toMatchObject({ status: 301, options: { href: "/en/category/energy?q=test" } });
  }
  expect(loadTaxonomy("en", "tag", "power", "", approved).label).toBe("Power");
});
