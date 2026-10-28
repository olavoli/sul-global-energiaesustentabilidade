import { sourceTerm } from "@/content/taxonomy-catalog";
import { notFound } from "@tanstack/react-router";
import { translationRecords } from "@/content/generated/translations";
import type { TranslationRecord, TranslationLocale } from "@/content/translation-schema";
import {
  findTranslation,
  articleAlternates,
  ogLocales,
  type TranslatedArticle,
} from "@/content/i18n";
import { articleJsonLd, resolveCanonical, socialMeta } from "./seo";

export function loadTranslatedArticle(
  locale: TranslationLocale,
  slug: string,
  records: readonly TranslationRecord[] = translationRecords,
) {
  const article = findTranslation(locale, slug, records);
  if (!article) throw notFound();
  return { article };
}
export function translatedHead(
  article?: TranslatedArticle,
  records: readonly TranslationRecord[] = translationRecords,
) {
  if (!article)
    return { meta: [{ title: "Not found — Sul Global" }, { name: "robots", content: "noindex" }] };
  const canonical = resolveCanonical(article.canonicalUrl ?? "");
  return {
    meta: [
      { title: `${article.seoTitle ?? article.title} — Sul Global` },
      { name: "description", content: article.seoDescription ?? article.excerpt },
      { name: "author", content: article.author.displayName },
      {
        property: "article:section",
        content: sourceTerm("category", article.category).editions[article.locale].label,
      },
      ...article.tags.map((tag) => ({
        property: "article:tag",
        content: sourceTerm("tag", tag).editions[article.locale].label,
      })),
      { property: "article:published_time", content: article.publishedAt },
      ...socialMeta({
        title: article.seoTitle ?? article.title,
        description: article.seoDescription ?? article.excerpt,
        path: canonical,
        type: "article",
        image: article.cover.src,
        imageAlt: article.cover.alt,
        imageWidth: article.cover.width,
        imageHeight: article.cover.height,
        locale: ogLocales[article.locale],
      }),
    ],
    links: [
      { rel: "canonical", href: canonical },
      ...articleAlternates(article.translationOf, records),
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(articleJsonLd(article, article.locale)),
      },
    ],
  };
}
