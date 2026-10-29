import { getPublishedArticles } from "./repository";
import { publishedTranslations } from "./i18n";
import { discoveryCopyFor } from "./discovery-catalog";
import { taxonomyCatalog, taxonomyPath, sourceTerm } from "./taxonomy-catalog";
import type { TranslationLocale, TranslationRecord } from "./translation-schema";
import { translationRecords } from "./generated/translations";
import type { Article } from "../types/content";
import { normalize } from "../lib/format";
export type DiscoveryArticle = Article & {
  fullTextLocale: TranslationLocale | "pt-BR";
  sourceHref: string;
};
/** Only approved public originals and persisted localized summaries enter discovery. */
export function discoveryArticles(
  locale: TranslationLocale,
  records: readonly TranslationRecord[] = translationRecords,
): DiscoveryArticle[] {
  const translations = publishedTranslations(records).filter((a) => a.locale === locale);
  return getPublishedArticles().flatMap((source) => {
    const copy = discoveryCopyFor(source, locale);
    if (!copy) return [];
    const full = translations.find((a) => a.translationOf === source.slug);
    const sourceHref = source.canonicalUrl ?? `/artigo/${source.slug}`;
    return [
      {
        ...source,
        id: `${locale}:discovery:${source.slug}`,
        title: full?.title ?? copy.title,
        excerpt: full?.excerpt ?? copy.excerpt,
        canonicalUrl: full?.canonicalUrl ?? sourceHref,
        cover: full?.cover ?? { ...source.cover, alt: copy.title },
        fullTextLocale: full ? locale : "pt-BR",
        sourceHref,
      },
    ];
  });
}
export function discoveryTopics(locale: TranslationLocale, records?: readonly TranslationRecord[]) {
  const articles = discoveryArticles(locale, records);
  return taxonomyCatalog.map((term) => {
    const members = articles.filter((a) =>
      term.kind === "category" ? a.category === term.sourceKey : a.tags.includes(term.sourceKey),
    );
    return {
      term,
      locale,
      ...term.editions[locale],
      path: taxonomyPath(term, locale),
      articles: members,
      indexable: members.length >= (term.kind === "tag" ? 2 : 1),
    };
  });
}
export function searchDiscovery(
  locale: TranslationLocale,
  query: string,
  filters: { category?: string; tag?: string } = {},
) {
  const q = normalize(query.trim());
  return discoveryArticles(locale).filter((a) => {
    const category = sourceTerm("category", a.category).editions[locale];
    const tags = a.tags.map((t) => sourceTerm("tag", t).editions[locale]);
    return (
      (!filters.category || category.slug === filters.category) &&
      (!filters.tag || tags.some((t) => t.slug === filters.tag)) &&
      (!q ||
        normalize(
          [a.title, a.excerpt, category.label, ...tags.map((t) => t.label)].join(" "),
        ).includes(q))
    );
  });
}
