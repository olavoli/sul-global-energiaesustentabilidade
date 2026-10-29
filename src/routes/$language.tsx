import type { TranslationLocale } from "@/content/translation-schema";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { TranslationCatalog } from "@/components/article/TranslationCatalog";
import { discoveryHead } from "@/lib/discovery-seo";
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
    return discoveryHead(loaderData.locale, loaderData.filtered);
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
