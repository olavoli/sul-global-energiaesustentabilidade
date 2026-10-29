import type { TranslationRecord } from "../content/translation-schema";
import { notFound, redirect } from "@tanstack/react-router";
import { discoveryTopics } from "../content/discovery";
import { findTaxonomyTerm, taxonomyPath, type TaxonomyKind } from "../content/taxonomy-catalog";
import type { TranslationLocale } from "../content/translation-schema";
/** Accept legacy Portuguese keys only as permanent aliases; preserve query parameters. */
export function loadTaxonomy(
  locale: TranslationLocale,
  kind: TaxonomyKind,
  slug: string,
  search = "",
  records?: readonly TranslationRecord[],
) {
  const term = findTaxonomyTerm(kind, locale, slug) ?? findTaxonomyTerm(kind, "pt-BR", slug);
  if (!term) throw notFound();
  const topic = discoveryTopics(locale, records).find((t) => t.term.id === term.id);
  if (!topic || (kind === "tag" && !topic.articles.length)) throw notFound();
  if (term.editions[locale].slug !== slug)
    throw redirect({ href: taxonomyPath(term, locale) + search, statusCode: 301 });
  return topic;
}
