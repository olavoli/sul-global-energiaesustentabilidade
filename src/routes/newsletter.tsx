import { createFileRoute } from "@tanstack/react-router";
import { NewsletterPageContent } from "@/components/newsletter/NewsletterPageContent";
import { resolveCanonical, socialMeta } from "@/lib/seo";

export const Route = createFileRoute("/newsletter")({
  validateSearch: (search: Record<string, unknown>): { confirmado?: 1 } =>
    search.confirmado === "1" || search.confirmado === 1 ? { confirmado: 1 } : {},
  head: () => ({
    meta: [
      { title: "Newsletter — Sul Global" },
      {
        name: "description",
        content:
          "Análise semanal do Sul Global sobre energia, transição energética e desenvolvimento. Sem ruído.",
      },
      ...socialMeta({
        title: "Newsletter — Sul Global",
        description: "Análise semanal sobre energia, transição energética e desenvolvimento.",
        path: "/newsletter",
      }),
    ],
    links: [{ rel: "canonical", href: resolveCanonical("/newsletter") }],
  }),
  component: NewsletterPage,
});

function NewsletterPage() {
  const { confirmado } = Route.useSearch();
  return <NewsletterPageContent confirmationReturn={confirmado === 1} />;
}
