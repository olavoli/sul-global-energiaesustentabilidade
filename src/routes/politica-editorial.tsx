import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/legal/LegalPage";
import { resolveCanonical, socialMeta } from "@/lib/seo";

const title = "Política editorial — Sul Global";
const description = "Princípios iniciais de independência, fontes e transparência editorial.";

export const Route = createFileRoute("/politica-editorial")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      ...socialMeta({ title, description, path: "/politica-editorial" }),
    ],
    links: [{ rel: "canonical", href: resolveCanonical("/politica-editorial") }],
  }),
  component: EditorialPolicyPage,
});

function EditorialPolicyPage() {
  return (
    <LegalPage eyebrow="Governança" title="Política editorial" updatedAt="13 de julho de 2026">
      <h2>Independência e formatos</h2>
      <p>
        Pauta, apuração e conclusão editorial devem ser independentes. Notícia, análise, opinião,
        explicação e conteúdo patrocinado precisam ser identificados de forma perceptível e não
        podem ser apresentados como equivalentes.
      </p>
      <h2>Fontes, correções e conflitos</h2>
      <p>
        Afirmações factuais devem usar fontes verificáveis. Correções relevantes devem ser claras,
        datadas e proporcionais ao erro. Autores e editores devem revelar conflitos de interesse
        capazes de influenciar a cobertura.
      </p>
      <h2>Demonstrações, patrocínio e publicidade</h2>
      <p>
        Conteúdo demo não pode ser publicado como notícia real. Patrocínios devem informar o
        financiador sem ocultar a natureza comercial. Publicidade futura será visualmente separada e
        não dará ao anunciante controle sobre conclusões editoriais.
      </p>
      <h2>Uso responsável de inteligência artificial</h2>
      <p>
        Ferramentas de IA podem auxiliar pesquisa, organização ou revisão, mas não substituem
        verificação de fatos, atribuição de fontes, julgamento editorial e responsabilidade humana.
        Conteúdo sensível ou substancialmente gerado por IA exige revisão e transparência adequadas.
      </p>
    </LegalPage>
  );
}
