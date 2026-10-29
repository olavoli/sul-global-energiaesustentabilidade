import { expect, test } from "bun:test";
import { discoveryArticles, discoveryTopics, searchDiscovery } from "./discovery";
import { discoveryCatalog, discoveryCopyFor } from "./discovery-catalog";
import { getPublishedArticles } from "./repository";
import { publishedTranslations, articleAlternates, languageOptions } from "./i18n";
import { discoveryHead } from "../lib/discovery-seo";
import { generateSitemap, generateRss, generateRobots } from "../lib/distribution";
import { loadTaxonomy } from "../lib/taxonomy-route";
import { taxonomyHead } from "../lib/taxonomy-seo";
import { portugueseTaxonomyAlternates } from "./taxonomy-topics";

test("curated discovery catalog covers every current public source exactly once in both languages", () => {
  const originals = getPublishedArticles();
  expect(new Set(discoveryCatalog.map((c) => c.slug)).size).toBe(discoveryCatalog.length);
  for (const locale of ["en", "es"] as const) {
    const cards = discoveryArticles(locale);
    expect(cards).toHaveLength(originals.length);
    for (const a of originals) {
      const copy = discoveryCopyFor(a, locale);
      expect(copy).toBeDefined();
      expect(copy?.title).not.toBe(a.title);
      expect(copy?.excerpt).not.toBe(a.excerpt);
      const card = cards.find((c) => c.sourceHref === (a.canonicalUrl ?? `/artigo/${a.slug}`));
      expect(card?.category).toBe(a.category);
      expect(card?.tags).toEqual(a.tags);
      expect(card?.cover.src).toBe(a.cover.src);
      expect(card?.cover.alt.trim()).toBeTruthy();
    }
  }
});
test("unknown or stale localized copy fails closed without an untranslated fallback", () => {
  const source = getPublishedArticles()[0];
  expect(discoveryCopyFor({ ...source, title: source.title + " changed" }, "en")).toBeUndefined();
  expect(discoveryCopyFor({ ...source, excerpt: "new summary" }, "es")).toBeUndefined();
  expect(discoveryCopyFor({ ...source, slug: "not-a-source" }, "en")).toBeUndefined();
});
test("summary-only cards point directly to PT; existing complete translations keep their own URLs", () => {
  for (const locale of ["en", "es"] as const) {
    const cards = discoveryArticles(locale);
    const summary = cards.find((a) => a.slug.includes("agrivoltaica"));
    expect(summary?.fullTextLocale).toBe("pt-BR");
    expect(summary?.canonicalUrl).toBe(summary?.sourceHref);
    const power = cards.find((a) => a.slug === "o-que-e-potencia");
    expect(power?.fullTextLocale).toBe(locale);
    expect(power?.canonicalUrl).toBe(
      locale === "en" ? "/en/article/o-que-e-potencia" : "/es/articulo/o-que-e-potencia",
    );
    expect(discoveryArticles(locale, []).every((a) => a.fullTextLocale === "pt-BR")).toBe(true);
  }
});
test("localized search and filters use stable memberships and never include drafts or demos", () => {
  expect(
    searchDiscovery("en", "copper").some(
      (a) => a.slug === "a-transicao-energetica-vai-ficar-sem-cobre",
    ),
  ).toBe(true);
  expect(searchDiscovery("es", "cobre").length).toBeGreaterThan(0);
  expect(
    searchDiscovery("en", "", { category: "energy" }).every((a) => a.category === "energia"),
  ).toBe(true);
  expect(searchDiscovery("en", "", { category: "invented" })).toHaveLength(0);
  expect(searchDiscovery("es", "", { tag: "potencia" })).toHaveLength(2);
  expect(
    searchDiscovery("es", "", { tag: "potencia" }).every((a) => a.tags.includes("potência")),
  ).toBe(true);
  expect(searchDiscovery("en", "impossible-selection-123")).toHaveLength(0);
  expect(discoveryArticles("en").every((a) => a.status === "published" && !a.isDemo)).toBe(true);
});
test("discovery topics deduplicate sources and retain empty/single-tag indexing thresholds", () => {
  for (const locale of ["en", "es"] as const)
    for (const t of discoveryTopics(locale)) {
      expect(new Set(t.articles.map((a) => a.slug)).size).toBe(t.articles.length);
      expect(t.indexable).toBe(t.articles.length >= (t.term.kind === "tag" ? 2 : 1));
      if (t.term.kind === "tag" && !t.articles.length)
        expect(() => loadTaxonomy(locale, "tag", t.slug)).toThrow();
      if (t.articles.length)
        expect(loadTaxonomy(locale, t.term.kind, t.slug).articles).toHaveLength(t.articles.length);
      expect(taxonomyHead(t, true).links?.some((l) => l.rel === "alternate")).toBe(false);
    }
});
test("discovery SEO is self-canonical, indexable only without filters, and never claims article hreflang equivalence", () => {
  for (const locale of ["en", "es"] as const) {
    const head = discoveryHead(locale, false, true);
    expect(head.links).toHaveLength(1);
    expect(head.links[0].href).toEndWith(`/${locale}`);
    expect(head.meta).toContainEqual({ name: "robots", content: "index, follow" });
    expect(discoveryHead(locale, true, true).meta).toContainEqual({
      name: "robots",
      content: "noindex, follow",
    });
    expect(discoveryHead(locale, false, false).meta).toContainEqual({
      name: "robots",
      content: "noindex, nofollow",
    });
  }
  expect(portugueseTaxonomyAlternates("tag", "potência")).toEqual([]);
  expect(articleAlternates("o-que-e-potencia").map((a) => a.hrefLang)).toEqual([
    "pt-BR",
    "en",
    "es",
    "x-default",
  ]);
  expect(articleAlternates("a-pandemia-salvou-o-sus").some((a) => a.hrefLang === "en")).toBe(false);
});
test("sitemap publishes real collections, never fabricated translated articles or filtered URLs; RSS remains full editions only", () => {
  const xml = generateSitemap(getPublishedArticles(), true);
  for (const locale of ["en", "es"] as const) {
    expect(xml).toContain(`/${locale}</loc>`);
    for (const t of discoveryTopics(locale))
      expect(xml.includes(`${t.path}</loc>`)).toBe(t.indexable);
    const rss = generateRss(
      publishedTranslations().filter((a) => a.locale === locale),
      true,
      locale,
    );
    expect(rss).toContain("o-que-e-potencia");
    expect(rss).not.toContain("agrivoltaica");
  }
  expect(xml).not.toContain("/en/article/agrivoltaica");
  expect(xml).not.toContain("?category=");
  expect(generateRobots(true)).toContain("Allow: /");
  expect(
    languageOptions("/artigo/a-pandemia-salvou-o-sus").find((o) => o.locale === "en"),
  ).toMatchObject({ href: "/en", fallback: true });
});
