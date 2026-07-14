import { createFileRoute } from "@tanstack/react-router";

import { Container } from "@/components/layout/Container";
import { methodologyDescription, methodologyHead } from "@/lib/methodology";

export const Route = createFileRoute("/metodologia")({
  head: methodologyHead,
  component: MethodologyPage,
});

function MethodologyPage() {
  return (
    <Container className="py-16">
      <article className="mx-auto max-w-3xl">
        <header className="border-b border-border pb-8">
          <span className="overline text-primary">Transparência</span>
          <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight md:text-5xl">
            Metodologia editorial
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{methodologyDescription}</p>
        </header>
        <div className="prose-editorial mt-10 text-foreground">
          <h2>Escolha de pautas</h2>
          <p>
            Priorizamos questões relevantes para energia, sustentabilidade, ciência, tecnologia,
            desenvolvimento e o Sul Global. Atualidade, impacto público, valor educativo e
            possibilidade real de verificação orientam a decisão; disponibilidade de material demo
            não transforma uma pauta em conteúdo publicável.
          </p>
          <h2>Tipos de conteúdo</h2>
          <p>
            Notícias relatam fatos recentes; explicações esclarecem conceitos; análises separam
            evidência de interpretação; guias têm objetivo educacional; entrevistas preservam
            contexto e autorização; opiniões identificam autoria e conflitos. Fato confirmado,
            projeção e interpretação nunca devem ser apresentados como equivalentes.
          </p>
          <h2>Fontes e revisão</h2>
          <p>
            Fontes são registradas com título, origem, URL, tipo e data de verificação. Domínio ou
            reputação não substituem conferência do conteúdo. A operação atual pode ser individual;
            por isso não prometemos revisão jurídica, científica ou por uma equipe que ainda não
            existe. Toda publicação exige uma decisão humana explícita e os guardrails do
            repositório.
          </p>
          <h2>Atualizações e correções</h2>
          <p>
            Atualizações complementam o material e registram data e nota. Erros relevantes recebem
            correção visível com motivo e descrição; não são apagados silenciosamente. Conteúdo com
            correção pendente deixa a distribuição pública normal até ser revisto.
          </p>
          <h2>Patrocínio e conflitos</h2>
          <p>
            Conteúdo patrocinado identifica o financiador. Patrocínio e publicidade não concedem
            controle oculto sobre conclusões editoriais. Autores devem declarar vínculos ou
            conflitos capazes de influenciar a leitura.
          </p>
          <h2>Uso responsável de IA</h2>
          <p>
            IA pode apoiar organização, resumo, revisão, perguntas, comparação e tradução assistida.
            Não pode inventar fontes, falas ou verificação, substituir revisão humana ou publicar
            automaticamente. Participação substancial exige disclosure editorial.
          </p>
        </div>
      </article>
    </Container>
  );
}
