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
    <LegalPage eyebrow="Termos" title="Termos de uso" updatedAt="13 de julho de 2026">
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
      <h2>Contato e alterações</h2>
      <p>
        O formulário de contato é demonstrativo e ainda não entrega mensagens. Estes termos podem
        mudar antes do lançamento; a versão revisada deverá indicar a data e o canal operacional de
        contato, sem inventar dados institucionais.
      </p>
    </LegalPage>
  );
}
