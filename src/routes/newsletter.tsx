import { createFileRoute } from "@tanstack/react-router";
import { Container } from "@/components/layout/Container";
import { NewsletterCTA } from "@/components/newsletter/NewsletterCTA";

export const Route = createFileRoute("/newsletter")({
  head: () => ({
    meta: [
      { title: "Newsletter — Sul Global" },
      {
        name: "description",
        content:
          "Análise semanal do Sul Global sobre energia, transição energética e desenvolvimento. Sem ruído.",
      },
      { property: "og:title", content: "Newsletter — Sul Global" },
      {
        property: "og:description",
        content:
          "Análise semanal sobre energia, transição energética e desenvolvimento.",
      },
    ],
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
            Toda quinta-feira, uma síntese do que importa em energia, transição
            e desenvolvimento — com contexto, fontes e sem clickbait.
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