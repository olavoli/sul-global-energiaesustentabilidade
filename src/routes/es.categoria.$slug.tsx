import { createFileRoute } from "@tanstack/react-router";
import { loadTaxonomy } from "../lib/taxonomy-route";
import { taxonomyHead } from "../lib/taxonomy-seo";
import { TaxonomyPage } from "../components/article/TaxonomyPage";
export const Route = createFileRoute("/es/categoria/$slug")({
  loader: ({ params, location }) => loadTaxonomy("es", "category", params.slug, location.searchStr),
  head: ({ loaderData }) => taxonomyHead(loaderData),
  component: Page,
});

function Page() {
  return <TaxonomyPage topic={Route.useLoaderData()} />;
}
