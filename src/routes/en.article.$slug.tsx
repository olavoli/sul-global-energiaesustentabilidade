import { createFileRoute } from "@tanstack/react-router";
import { loadTranslatedArticle, translatedHead } from "@/lib/translation-page";
import { TranslatedArticlePage, TranslationNotFound } from "@/components/article/translated-route";
export const Route = createFileRoute("/en/article/$slug")({
  loader: ({ params }) => loadTranslatedArticle("en", params.slug),
  head: ({ loaderData }) => translatedHead(loaderData?.article),
  component: Page,
  notFoundComponent: () => <TranslationNotFound locale="en" />,
});
function Page() {
  return <TranslatedArticlePage article={Route.useLoaderData().article} />;
}
