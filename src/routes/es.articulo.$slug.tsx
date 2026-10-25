import { createFileRoute } from "@tanstack/react-router";
import { loadTranslatedArticle, translatedHead } from "@/lib/translation-page";
import { TranslatedArticlePage, TranslationNotFound } from "@/components/article/translated-route";
export const Route = createFileRoute("/es/articulo/$slug")({
  loader: ({ params }) => loadTranslatedArticle("es", params.slug),
  head: ({ loaderData }) => translatedHead(loaderData?.article),
  component: Page,
  notFoundComponent: () => <TranslationNotFound locale="es" />,
});
function Page() {
  return <TranslatedArticlePage article={Route.useLoaderData().article} />;
}
