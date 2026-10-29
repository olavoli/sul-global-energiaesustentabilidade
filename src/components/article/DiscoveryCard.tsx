import { ArticleCard } from "./ArticleCard";
import { sourceTerm, taxonomyPath } from "../../content/taxonomy-catalog";
import type { DiscoveryArticle } from "../../content/discovery";
import type { TranslationLocale } from "../../content/translation-schema";
/** Localized summary with explicit destination language; never claims a full translation. */
export function DiscoveryCard({
  article,
  locale,
  eager = false,
}: {
  article: DiscoveryArticle;
  locale: TranslationLocale;
  eager?: boolean;
}) {
  const en = locale === "en";
  return (
    <div className="min-w-0 border-b border-border pb-6">
      <p className="mb-3 text-sm font-medium text-primary">
        {article.fullTextLocale === "pt-BR"
          ? en
            ? "Full article in Portuguese (PT-BR)"
            : "Artículo completo en portugués (PT-BR)"
          : en
            ? "Full article in English"
            : "Artículo completo en español"}
      </p>
      <ArticleCard article={article} eager={eager} />
      <ul aria-label={en ? "Topics" : "Temas"} className="mt-4 flex flex-wrap gap-2 text-sm">
        {article.tags.map((tag) => {
          const term = sourceTerm("tag", tag);
          return (
            <li key={term.id}>
              <a
                className="break-words underline underline-offset-4"
                href={taxonomyPath(term, locale)}
              >
                {term.editions[locale].label}
              </a>
            </li>
          );
        })}
      </ul>
      <a
        href={article.sourceHref}
        hrefLang="pt-BR"
        lang={locale}
        className="mt-4 inline-block text-sm underline underline-offset-4"
      >
        {en ? "Read the Portuguese original" : "Leer el original en portugués"}
      </a>
    </div>
  );
}
