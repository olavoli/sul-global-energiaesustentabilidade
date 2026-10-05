import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/legal/LegalPage";
import { resolveCanonical, socialMeta } from "@/lib/seo";

const title = "Termos de uso — Sul Global";
const description = "Termos iniciais de uso do conteúdo informativo e educativo do Sul Global.";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      ...socialMeta({ title, description, path: "/termos" }),
    ],
    links: [{ rel: "canonical", href: resolveCanonical("/termos") }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage eyebrow="Termos" title="Termos de uso" updatedAt="4 de outubro de 2026">
      <h2>Finalidade</h2>
      <p>
        O Sul Global publica conteúdo informativo e educativo. O material não substitui orientação
        jurídica, financeira, médica, técnica ou profissional adequada ao caso concreto.
      </p>
      <h2>Conteúdo e propriedade intelectual</h2>
      <p>
        Textos, identidade e ativos próprios permanecem protegidos pela legislação aplicável. A
        licença geral do projeto ainda precisa ser definida; ausência de licença explícita não
        autoriza redistribuição. Materiais de terceiros mantêm seus direitos e condições.
      </p>
      <h2>Links externos e disponibilidade</h2>
      <p>
        Links externos são oferecidos como referência e podem mudar ou possuir regras próprias. O
        portal pode corrigir, atualizar, suspender ou remover conteúdo para preservar precisão,
        segurança e integridade editorial.
      </p>
      <h2>Comentários e moderação</h2>
      <p>
        Comentários devem tratar do tema publicado e respeitar outras pessoas. Ofensas, ameaças,
        discriminação, spam, dados pessoais, publicidade e links maliciosos podem ser rejeitados ou
        ocultados, classificados como spam ou excluídos. Comentários e respostas válidos são
        publicados imediatamente e sujeitos a moderação posterior. A exclusão apaga o conteúdo e não
        permite restauração. Reações podem ser trocadas ou removidas. Denúncias são analisadas pela
        administração e não ocultam automaticamente o conteúdo. Não manipule reações ou denúncias
        nem use estes recursos para perseguir pessoas.
      </p>
      <h2>Contato e alterações</h2>
      <p>
        O formulário de contato é demonstrativo e ainda não entrega mensagens. Estes termos podem
        mudar antes do lançamento; a versão revisada deverá indicar a data e o canal operacional de
        contato, sem inventar dados institucionais.
      </p>
    </LegalPage>
  );
}
