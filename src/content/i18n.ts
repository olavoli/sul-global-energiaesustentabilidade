import { taxonomyCatalog, taxonomyPath, sourceTerm, type TaxonomyKind } from "./taxonomy-catalog";
import { discoveryCopyFor } from "./discovery-catalog";
import { authors } from "@/data/authors";
import { articleRecords } from "./generated/articles";
import { translationRecords } from "./generated/translations";
import {
  translatedArticlePath,
  translationReviewAccepted,
  type ContentLocale,
  type TranslationLocale,
  type TranslationRecord,
} from "./translation-schema";
import { createContentRepository } from "./repository";
import { resolveCanonical } from "@/lib/seo";
import { normalize } from "@/lib/format";
import type { Article } from "@/types/content";

export type TranslatedArticle = Article &
  Omit<TranslationRecord, "author" | "publishedAt" | "status">;
export const languageLabels = { "pt-BR": "Português", en: "English", es: "Español" };
export const ogLocales = { "pt-BR": "pt_BR", en: "en_US", es: "es_ES" };
export function languageForPath(path: string): ContentLocale {
  return /^\/en(?:\/|$)/.test(path) ? "en" : /^\/es(?:\/|$)/.test(path) ? "es" : "pt-BR";
}
export function publishedTranslations(
  records: readonly TranslationRecord[] = translationRecords,
  today = new Date().toISOString().slice(0, 10),
): TranslatedArticle[] {
  const originals = createContentRepository(articleRecords, false, today).getPublishedArticles();
  return records
    .filter(
      (r) =>
        r.status === "published" &&
        !r.isDemo &&
        r.publishedAt &&
        r.publishedAt <= today &&
        translationReviewAccepted(r) &&
        (r.translationReview.status !== "automatic" ||
          records.some(
            (pair) =>
              pair.locale !== r.locale &&
              pair.translationOf === r.translationOf &&
              pair.sourceRevision === r.sourceRevision &&
              pair.status === "published" &&
              pair.translationReview.status === "automatic" &&
              pair.translationReview.automation?.runId === r.translationReview.automation?.runId,
          )) &&
        originals.some((a) => a.slug === r.translationOf) &&
        authors[r.author]?.status === "verified",
    )
    .map((r) => ({
      ...r,
      id: `${r.locale}:${r.slug}`,
      status: "published" as const,
      publishedAt: r.publishedAt ?? "",
      author: authors[r.author],
    }))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.slug.localeCompare(b.slug));
}
export function findTranslation(
  locale: TranslationLocale,
  slug: string,
  records: readonly TranslationRecord[] = translationRecords,
) {
  return publishedTranslations(records).find((r) => r.locale === locale && r.slug === slug);
}
export function articleAlternates(
  originalSlug: string,
  records: readonly TranslationRecord[] = translationRecords,
) {
  const original = createContentRepository(articleRecords, false).getArticleBySlug(originalSlug);
  if (!original) return [];
  const pt = original.canonicalUrl ?? `/artigo/${original.slug}`;
  return [
    { rel: "alternate", hrefLang: "pt-BR", href: resolveCanonical(pt) },
    ...publishedTranslations(records)
      .filter((r) => r.translationOf === originalSlug)
      .map((r) => ({
        rel: "alternate",
        hrefLang: r.locale,
        href: resolveCanonical(translatedArticlePath(r.locale, r.slug)),
      })),
    { rel: "alternate", hrefLang: "x-default", href: resolveCanonical(pt) },
  ];
}
export function languageOptions(
  path: string,
  records: readonly TranslationRecord[] = translationRecords,
) {
  const topicMatch = path.match(/^\/(?:(en|es)\/)?(categoria|category|tag|tema)\/([^/]+)$/);
  if (topicMatch) {
    const from = (topicMatch[1] ?? "pt-BR") as ContentLocale;
    const kind: TaxonomyKind = ["categoria", "category"].includes(topicMatch[2])
      ? "category"
      : "tag";
    const term = taxonomyCatalog.find(
      (t) => t.kind === kind && t.editions[from].slug === topicMatch[3],
    );
    if (term)
      return (["pt-BR", "en", "es"] as const).map((locale) => {
        const articles =
          locale === "pt-BR"
            ? createContentRepository(articleRecords, false).getPublishedArticles()
            : createContentRepository(articleRecords, false)
                .getPublishedArticles()
                .filter((a) => discoveryCopyFor(a, locale));
        const available =
          term.kind === "category" || articles.some((a) => a.tags.includes(term.sourceKey));
        return {
          locale,
          href: available ? taxonomyPath(term, locale) : locale === "pt-BR" ? "/" : `/${locale}`,
          fallback: !available,
        };
      });
  }
  const translated = publishedTranslations(records).find(
    (r) => translatedArticlePath(r.locale, r.slug) === path,
  );
  const original =
    translated?.translationOf ??
    createContentRepository(articleRecords, false)
      .getPublishedArticles()
      .find((a) => (a.canonicalUrl ?? `/artigo/${a.slug}`) === path)?.slug;
  const source = original
    ? createContentRepository(articleRecords, false).getArticleBySlug(original)
    : undefined;
  return (["pt-BR", "en", "es"] as const).map((locale) => {
    const equivalent =
      original &&
      (locale === "pt-BR"
        ? source
          ? (source.canonicalUrl ?? `/artigo/${source.slug}`)
          : undefined
        : publishedTranslations(records).find(
            (r) => r.translationOf === original && r.locale === locale,
          )?.canonicalUrl);
    return {
      locale,
      href: equivalent || (locale === "pt-BR" ? "/" : `/${locale}`),
      fallback: Boolean(original && !equivalent),
    };
  });
}
export function searchTranslations(
  locale: TranslationLocale,
  query: string,
  filters: { category?: string; tag?: string } = {},
  records: readonly TranslationRecord[] = translationRecords,
) {
  const term = normalize(query.trim());
  return publishedTranslations(records).filter((r) => {
    if (r.locale !== locale) return false;
    const category = sourceTerm("category", r.category).editions[locale];
    const tags = r.tags.map((tag) => sourceTerm("tag", tag).editions[locale]);
    return (
      (!filters.category || filters.category === category.slug) &&
      (!filters.tag || tags.some((t) => t.slug === filters.tag)) &&
      (!term ||
        normalize(
          [
            r.title,
            r.subtitle,
            r.excerpt,
            category.label,
            ...tags.map((t) => t.label),
            ...r.tags,
          ].join(" "),
        ).includes(term))
    );
  });
}
