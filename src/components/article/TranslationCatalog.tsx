import { taxonomyTopics } from "@/content/taxonomy-topics";
import { ArticleCard } from "./ArticleCard";
import { searchTranslations } from "@/content/i18n";
import type { TranslationLocale } from "@/content/translation-schema";

export function TranslationCatalog({
  locale,
  query,
  category,
  tag,
}: {
  locale: TranslationLocale;
  query: string;
  category?: string;
  tag?: string;
}) {
  const articles = searchTranslations(locale, query, { category, tag });
  const topics = taxonomyTopics(locale).filter((t) => t.articles.length > 0);
  const en = locale === "en";
  return (
    <section className="mx-auto max-w-4xl px-4 py-12" lang={locale}>
      <h1 className="font-serif text-3xl font-bold">
        {en ? "Sul Global in English" : "Sul Global en español"}
      </h1>
      <p className="my-4">
        {en
          ? "Editorial analysis on energy, sustainability, science, and public policy. Only reviewed and published translations appear here."
          : "Análisis editorial sobre energía, sostenibilidad, ciencia y políticas públicas. Aquí solo aparecen traducciones revisadas y publicadas."}
      </p>
      <p className="mb-6 text-sm">
        {en
          ? "If an article has no translation, the language menu opens this catalog rather than an unrelated edition. The original Portuguese portal remains available."
          : "Si un artículo no tiene traducción, el menú de idiomas abre este catálogo en lugar de una edición no equivalente. El portal original en portugués sigue disponible."}{" "}
        <a href="/" className="underline">
          Português
        </a>
      </p>
      <form action={`/${locale}`} method="get" role="search" className="mb-8 flex flex-wrap gap-2">
        <label htmlFor="translation-search">
          {en ? "Search these articles" : "Buscar en estos artículos"}
        </label>
        <input
          id="translation-search"
          name="q"
          defaultValue={query}
          maxLength={120}
          className="min-w-0 rounded border border-border bg-background px-3 py-2"
        />
        {(["category", "tag"] as const).map((kind) => (
          <label key={kind} className="flex min-w-0 max-w-full flex-col gap-1 text-sm">
            {kind === "category" ? (en ? "Category" : "Categoría") : en ? "Topic" : "Tema"}
            <select
              name={kind}
              defaultValue={kind === "category" ? (category ?? "") : (tag ?? "")}
              className="max-w-full rounded border border-border bg-background px-3 py-2"
            >
              <option value="">{en ? "All" : "Todos"}</option>
              {topics
                .filter((t) => t.term.kind === kind)
                .map((t) => (
                  <option key={t.term.id} value={t.slug}>
                    {t.label}
                  </option>
                ))}
            </select>
          </label>
        ))}
        <button className="rounded border border-border px-3 py-2">
          {en ? "Search" : "Buscar"}
        </button>
      </form>
      {articles.length ? (
        <div className="grid gap-6 md:grid-cols-2">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <p role="status">
          {en
            ? "No published translations match this selection yet. Drafts awaiting editorial review are not public."
            : "Todavía no hay traducciones publicadas para esta selección. Los borradores pendientes de revisión editorial no son públicos."}
        </p>
      )}
    </section>
  );
}
