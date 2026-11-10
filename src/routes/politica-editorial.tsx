import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/legal/LegalPage";
import { resolveCanonical, socialMeta } from "@/lib/seo";

const title = "Política editorial — Sul Global";
const description = "Princípios de independência, fontes e transparência editorial.";

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
    <LegalPage eyebrow="Governança" title="Política editorial" updatedAt="9 de novembro de 2026">
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
      <h2>Patrocínio e publicidade</h2>
      <p>
        Patrocínios devem identificar o financiador e a natureza comercial. A publicidade deve ser
        identificada e separada do conteúdo editorial. Anunciantes não têm controle sobre as
        conclusões editoriais. A <a href="/privacidade">Política de privacidade</a> descreve a
        integração publicitária do portal.
      </p>
      <h2>Uso responsável de inteligência artificial</h2>
      <p>
        Ferramentas de IA podem auxiliar pesquisa, organização ou revisão, mas não substituem
        verificação de fatos, atribuição de fontes, julgamento editorial e responsabilidade humana.
        Quando a assistência for substancial, a nota de transparência deve identificar sua função.
        Imagens conceituais devem ser identificadas como ilustrações.
      </p>
    </LegalPage>
  );
}
