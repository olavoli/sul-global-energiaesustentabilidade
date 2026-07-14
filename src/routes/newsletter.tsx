import { createFileRoute } from "@tanstack/react-router";
import { Container } from "@/components/layout/Container";
import { NewsletterCTA } from "@/components/newsletter/NewsletterCTA";
import { resolveCanonical, socialMeta } from "@/lib/seo";

export const Route = createFileRoute("/newsletter")({
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
  return (
    <>
      <Container className="py-16">
        <div className="mx-auto max-w-2xl">
          <span className="overline text-primary">Newsletter</span>
          <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Uma análise semanal, sem ruído.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            A proposta é oferecer uma síntese do que importa em energia, transição e desenvolvimento
            — com contexto, fontes e sem clickbait. O envio ainda não está ativo.
          </p>
          <ul className="mt-8 space-y-3 text-foreground">
            <li>• Uma reportagem exclusiva por edição.</li>
            <li>• Três leituras recomendadas com comentário editorial.</li>
            <li>• Gráfico da semana, com fonte primária.</li>
          </ul>
        </div>
      </Container>
      <NewsletterCTA />
    </>
  );
}
