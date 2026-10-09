import { createFileRoute } from "@tanstack/react-router";
import { Container } from "@/components/layout/Container";
import { resolveCanonical, socialMeta } from "@/lib/seo";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato — Sul Global" },
      {
        name: "description",
        content: "Fale com a redação do Sul Global. Pautas, correções e parcerias editoriais.",
      },
      ...socialMeta({
        title: "Contato — Sul Global",
        description: "Fale com a redação do Sul Global. Pautas, correções e parcerias.",
        path: "/contato",
      }),
    ],
    links: [{ rel: "canonical", href: resolveCanonical("/contato") }],
  }),
  component: ContatoPage,
});

function ContatoPage() {
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-2xl">
        <span className="overline text-primary">Fale conosco</span>
        <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          Contato editorial
        </h1>
        <p className="mt-4 text-muted-foreground">
          Este é o canal de contato com o Sul Global para assuntos editoriais, sugestões de pauta,
          correções, privacidade e assuntos gerais.
        </p>
        <div className="mt-10 rounded-md border border-border bg-muted/40 p-6">
          <p className="text-sm text-muted-foreground">E-mail de contato</p>
          <a
            href="mailto:olavoli20@gmail.com"
            className="mt-2 block break-all text-lg text-primary underline"
          >
            olavoli20@gmail.com
          </a>
          <a
            href="mailto:olavoli20@gmail.com"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 font-medium text-primary-foreground hover:opacity-90"
          >
            Enviar e-mail
          </a>
          <p className="mt-4 text-sm text-muted-foreground">
            O botão abre seu aplicativo de e-mail. Você também pode copiar o endereço e usá-lo no
            serviço de sua preferência.
          </p>
        </div>
      </div>
    </Container>
  );
}
