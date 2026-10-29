import { taxonomyCatalog, taxonomyPath, type TaxonomyTerm } from "./taxonomy-catalog";
import { getPublishedArticles } from "./repository";
import { publishedTranslations } from "./i18n";
import type { ContentLocale, TranslationRecord } from "./translation-schema";
import { translationRecords } from "./generated/translations";
import type { Article } from "../types/content";
export function topicArticles(term: TaxonomyTerm, articles: readonly Article[]) {
  return [...new Map(articles.map((a) => [a.id, a])).values()].filter((a) =>
    term.kind === "category" ? a.category === term.sourceKey : a.tags.includes(term.sourceKey),
  );
}
export function taxonomyArticles(
  locale: ContentLocale,
  records: readonly TranslationRecord[] = translationRecords,
) {
  return locale === "pt-BR"
    ? getPublishedArticles()
    : publishedTranslations(records).filter((a) => a.locale === locale);
}
export function taxonomyTopics(
  locale: ContentLocale,
  records: readonly TranslationRecord[] = translationRecords,
) {
  const articles = taxonomyArticles(locale, records);
  return taxonomyCatalog.map((term) => {
    const members = topicArticles(term, articles);
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
export type LocalizedTopic = ReturnType<typeof taxonomyTopics>[number];
/** Hreflang only references equivalent, indexable pages; counts are language-specific. */
export function taxonomyAlternates(
  term: TaxonomyTerm,
  records: readonly TranslationRecord[] = translationRecords,
) {
  const available = (["pt-BR", "en", "es"] as const).filter((locale) => {
    const count = topicArticles(term, taxonomyArticles(locale, records)).length;
    return count >= (term.kind === "tag" ? 2 : 1);
  });
  return [
    ...available.map((locale) => ({ locale, path: taxonomyPath(term, locale) })),
    ...(available.includes("pt-BR")
      ? [{ locale: "x-default", path: taxonomyPath(term, "pt-BR") }]
      : []),
  ];
}

export function portugueseTaxonomyAlternates(
  kind: "category" | "tag",
  sourceKey: string,
): { locale: string; path: string }[] {
  // International discovery summaries are not equivalent full-text editions of this collection.
  void kind;
  void sourceKey;
  return [];
}
