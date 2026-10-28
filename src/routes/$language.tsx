import type { TranslationLocale } from "@/content/translation-schema";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { TranslationCatalog } from "@/components/article/TranslationCatalog";
import { searchTranslations, ogLocales } from "@/content/i18n";
import { resolveCanonical, socialMeta } from "@/lib/seo";
export const Route = createFileRoute("/$language")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { q?: string; category?: string; tag?: string } => ({
    q: typeof search.q === "string" ? search.q.slice(0, 120) : undefined,
    category: typeof search.category === "string" ? search.category.slice(0, 120) : undefined,
    tag: typeof search.tag === "string" ? search.tag.slice(0, 120) : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ params, deps }): { locale: TranslationLocale; filtered: boolean } => {
    if (params.language !== "en" && params.language !== "es") throw notFound();
    return { locale: params.language, filtered: Boolean(deps.q || deps.category || deps.tag) };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ name: "robots", content: "noindex" }] };
    const { locale, filtered } = loaderData;
    const path = `/${locale}`;
    const title = locale === "en" ? "Sul Global in English" : "Sul Global en español";
    const description =
      locale === "en"
        ? "Reviewed articles about energy, sustainability, science, and public policy."
        : "Artículos revisados sobre energía, sostenibilidad, ciencia y políticas públicas.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        ...(filtered || searchTranslations(locale, "").length < 2
          ? [{ name: "robots", content: "noindex, follow" }]
          : []),
        ...socialMeta({ title, description, path, locale: ogLocales[locale] }),
      ],
      links: [{ rel: "canonical", href: resolveCanonical(path) }],
    };
  },
  component: Page,
});
function Page() {
  return (
    <TranslationCatalog
      locale={Route.useLoaderData().locale}
      query={Route.useSearch().q ?? ""}
      category={Route.useSearch().category}
      tag={Route.useSearch().tag}
    />
  );
}
