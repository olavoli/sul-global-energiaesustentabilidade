import copy1 from "../data/discovery-1";
import copy2 from "../data/discovery-2";
import type { TranslationLocale } from "./translation-schema";
export const discoveryCatalog = [...copy1, ...copy2];
/** A changed source title/summary needs fresh localized copy, never a silent Portuguese fallback. */
export function discoveryCopyFor(
  source: { slug: string; title: string; excerpt: string },
  locale: TranslationLocale,
) {
  const copy = discoveryCatalog.find((c) => c.slug === source.slug);
  return copy?.sourceTitle === source.title && copy.sourceExcerpt === source.excerpt
    ? copy[locale]
    : undefined;
}
