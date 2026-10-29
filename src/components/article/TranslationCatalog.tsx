import { discoveryTopics, searchDiscovery } from "@/content/discovery";
import { DiscoveryCard } from "./DiscoveryCard";
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
  const articles = searchDiscovery(locale, query, { category, tag });
  const topics = discoveryTopics(locale).filter((t) => t.articles.length > 0);
  const en = locale === "en";
  return (
    <section className="mx-auto max-w-7xl px-4 py-12" lang={locale}>
      <h1 className="font-serif text-3xl font-bold">
        {en ? "Sul Global in English" : "Sul Global en español"}
      </h1>
      <p className="my-4">
        {en
          ? "Explore energy, sustainability, science and public policy through English titles and summaries from our Portuguese-language archive."
          : "Explore energía, sostenibilidad, ciencia y políticas públicas a través de títulos y resúmenes en español de nuestro archivo en portugués."}
      </p>
      <p className="mb-6 text-sm">
        {en
          ? "These are localized summaries, not full translations. Each card identifies the language of the full article. For Portuguese articles, you can use your browser’s translation feature. Images may contain Portuguese text."
          : "Estos son resúmenes localizados, no traducciones completas. Cada tarjeta indica el idioma del artículo completo. Para los artículos en portugués, puede utilizar la traducción del navegador. Las imágenes pueden contener texto en portugués."}{" "}
        <a href="/" className="underline">
          Português
        </a>
      </p>
      <nav
        aria-label={en ? "Browse categories" : "Explorar categorías"}
        className="mb-8 flex flex-wrap gap-x-5 gap-y-3 text-sm"
      >
        {topics
          .filter((t) => t.term.kind === "category")
          .map((t) => (
            <a key={t.term.id} href={t.path} className="underline underline-offset-4">
              {t.label}
            </a>
          ))}
      </nav>
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
        <div className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <DiscoveryCard key={article.id} article={article} locale={locale} />
          ))}
        </div>
      ) : (
        <p role="status">
          {en
            ? "No articles match this selection. Try another topic or search term."
            : "Ningún artículo coincide con esta selección. Pruebe otro tema o término de búsqueda."}
        </p>
      )}
    </section>
  );
}
