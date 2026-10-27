import type { TranslationLocale } from "@/content/translation-schema";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { TranslationCatalog } from "@/components/article/TranslationCatalog";
import { searchTranslations, ogLocales } from "@/content/i18n";
import { resolveCanonical, socialMeta } from "@/lib/seo";
export const Route = createFileRoute("/$language")({
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    typeof search.q === "string" ? { q: search.q.slice(0, 120) } : {},
  loader: ({ params }): { locale: TranslationLocale } => {
    if (params.language !== "en" && params.language !== "es") throw notFound();
    return { locale: params.language };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ name: "robots", content: "noindex" }] };
    const { locale } = loaderData;
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
        ...(searchTranslations(locale, "").length < 2
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
    <TranslationCatalog locale={Route.useLoaderData().locale} query={Route.useSearch().q ?? ""} />
  );
}
