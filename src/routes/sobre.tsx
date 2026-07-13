import { createFileRoute } from "@tanstack/react-router";
import { Container } from "@/components/layout/Container";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre — Sul Global" },
      {
        name: "description",
        content:
          "O Sul Global é um portal editorial brasileiro sobre energia, transição, ciência e desenvolvimento — independente, técnico e sem sensacionalismo.",
      },
      { property: "og:title", content: "Sobre — Sul Global" },
      {
        property: "og:description",
        content:
          "Portal editorial brasileiro sobre energia e transição. Independente, técnico e sem sensacionalismo.",
      },
    ],
  }),
  component: SobrePage,
});

function SobrePage() {
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-3xl">
        <span className="overline text-primary">Quem somos</span>
        <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          Sul Global
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">
          Um portal editorial brasileiro dedicado a cobrir com rigor técnico as áreas de energia,
          transição energética, sustentabilidade, ciência, tecnologia e desenvolvimento.
        </p>

        <section className="prose-editorial mt-10 text-foreground">
          <h2>Missão</h2>
          <p>
            Produzir reportagem e análise para pesquisadores, engenheiros, investidores, gestores
            públicos e estudantes que precisam de contexto — não de manchete.
          </p>
          <h2>Independência</h2>
          <p>
            Não somos um blog pessoal nem um agregador. Não temos vínculo com partido, empresa ou
            universidade específica. Patrocínios existem, são identificados como tal e não
            interferem em pauta.
          </p>
          <h2>Referências editoriais</h2>
          <p>
            Nos inspiramos em Reuters, Bloomberg Green e MIT Technology Review. Tom técnico,
            linguagem acessível, sem simplificação barata.
          </p>
          <h2>Como colaborar</h2>
          <p>
            Pesquisadores, colunistas e leitores podem entrar em contato pela página de contato.
            Publicamos textos de terceiros mediante avaliação editorial.
          </p>
        </section>
      </div>
    </Container>
  );
}
