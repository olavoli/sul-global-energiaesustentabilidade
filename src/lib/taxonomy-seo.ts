import { siteConfig } from "../config/site";
import { resolveCanonical, socialMeta, breadcrumbJsonLd } from "./seo";
import { taxonomyAlternates, type LocalizedTopic } from "../content/taxonomy-topics";
import type { TranslationRecord } from "../content/translation-schema";
import { ogLocales } from "../content/i18n";
export function taxonomyHead(
  topic: LocalizedTopic | undefined,
  enabled = siteConfig.indexingEnabled,
  records?: readonly TranslationRecord[],
) {
  if (!topic)
    return {
      meta: [{ title: "Not found — Sul Global" }, { name: "robots", content: "noindex, follow" }],
    };
  const { locale, label, description, path, indexable, term } = topic;
  const home = locale === "en" ? "Home" : locale === "es" ? "Inicio" : "Início";
  return {
    meta: [
      { title: `${label} — Sul Global` },
      { name: "description", content: description },
      {
        name: "robots",
        content: !enabled ? "noindex, nofollow" : indexable ? "index, follow" : "noindex, follow",
      },
      ...socialMeta({
        title: `${label} — Sul Global`,
        description,
        path,
        locale: ogLocales[locale],
      }),
    ],
    links: [
      { rel: "canonical", href: resolveCanonical(path) },
      ...(indexable && locale === "pt-BR"
        ? taxonomyAlternates(term, records).map((a) => ({
            rel: "alternate",
            hrefLang: a.locale,
            href: resolveCanonical(a.path),
          }))
        : []),
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: home, path: locale === "pt-BR" ? "/" : `/${locale}` },
            { name: label, path },
          ]),
        ),
      },
    ],
  };
}
