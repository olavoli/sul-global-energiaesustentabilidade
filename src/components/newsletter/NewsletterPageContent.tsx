import { Container } from "@/components/layout/Container";
import { NewsletterCTA } from "./NewsletterCTA";

/** A redirect marker is a navigation hint, never evidence of confirmed subscription. */
export function NewsletterPageContent({ confirmationReturn }: { confirmationReturn: boolean }) {
  return (
    <>
      <Container className="py-16">
        <div className="mx-auto max-w-2xl">
          <span className="overline text-primary">Newsletter</span>
          <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Uma análise semanal, sem ruído.
          </h1>
          {confirmationReturn ? (
            <section
              aria-labelledby="newsletter-confirmation-title"
              className="mt-8 rounded-md border border-border bg-muted/40 p-5"
            >
              <h2 id="newsletter-confirmation-title" className="font-serif text-2xl font-semibold">
                Confirmação da inscrição
              </h2>
              <p className="mt-3 text-muted-foreground">
                Não foi possível verificar sua confirmação nesta página.
              </p>
              <p className="mt-3 text-muted-foreground">
                A confirmação é realizada pelo link enviado por e-mail. Se você já confirmou pelo
                link recebido, não é necessário se inscrever novamente.
              </p>
              <a
                href="/"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Explorar os artigos
              </a>
            </section>
          ) : (
            <p className="mt-4 text-lg text-muted-foreground">
              A proposta é oferecer uma síntese do que importa em energia, transição e
              desenvolvimento — com contexto, fontes e sem clickbait. Confirme seu e-mail para
              concluir a inscrição.
            </p>
          )}
          <h2 className="mt-8 font-serif text-2xl font-semibold text-foreground">
            O que você vai encontrar na newsletter Sul Global:
          </h2>
          <ul className="mt-5 list-disc space-y-3 pl-5 text-foreground">
            <li>Análises sobre energia, sustentabilidade, ciência e políticas públicas.</li>
            <li>Uma seleção de artigos e temas relevantes, com contexto e fontes.</li>
            <li>
              Reflexões sobre tecnologias, decisões e acontecimentos que ajudam a compreender o
              mundo.
            </li>
          </ul>
          <p className="mt-6 font-medium text-foreground">
            Informação com profundidade, sem excesso de ruído.
          </p>
        </div>
      </Container>
      {!confirmationReturn && <NewsletterCTA />}
    </>
  );
}
