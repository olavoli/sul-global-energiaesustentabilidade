import { discoveryArticles } from "../content/discovery";
import { ogLocales } from "../content/i18n";
import { siteConfig } from "../config/site";
import type { TranslationLocale } from "../content/translation-schema";
import { resolveCanonical, socialMeta } from "./seo";
/** Discovery collections have their own canonical; summaries are not alternate full articles. */
export function discoveryHead(
  locale: TranslationLocale,
  filtered: boolean,
  enabled = siteConfig.indexingEnabled,
) {
  const path = `/${locale}`;
  const title = locale === "en" ? "Sul Global in English" : "Sul Global en español";
  const description =
    locale === "en"
      ? "English titles and summaries from Sul Global’s Portuguese archive: energy, sustainability, science and public policy."
      : "Títulos y resúmenes en español del archivo portugués de Sul Global: energía, sostenibilidad, ciencia y políticas públicas.";
  return {
    meta: [
      { title },
      { name: "description", content: description },
      {
        name: "robots",
        content: !enabled
          ? "noindex, nofollow"
          : filtered || discoveryArticles(locale).length < 2
            ? "noindex, follow"
            : "index, follow",
      },
      ...socialMeta({ title, description, path, locale: ogLocales[locale] }),
    ],
    links: [{ rel: "canonical", href: resolveCanonical(path) }],
  };
}
