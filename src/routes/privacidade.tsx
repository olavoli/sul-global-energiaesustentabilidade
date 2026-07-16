import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "@/components/legal/LegalPage";
import { resolveCanonical, socialMeta } from "@/lib/seo";

const title = "Política de privacidade — Sul Global";
const description = "Como o Sul Global trata dados e preferências na versão atual do portal.";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      ...socialMeta({ title, description, path: "/privacidade" }),
    ],
    links: [{ rel: "canonical", href: resolveCanonical("/privacidade") }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacidade"
      title="Política de privacidade"
      updatedAt="13 de julho de 2026"
    >
      <h2>Estado atual</h2>
      <p>
        O portal não utiliza analytics, publicidade ativa ou cadastro real de newsletter. Os
        formulários de contato e newsletter validam dados apenas no navegador: não enviam, não
        persistem e não registram nomes, e-mails ou mensagens.
      </p>
      <h2>Preferências e armazenamento</h2>
      <p>
        A preferência de tema claro ou escuro pode ser guardada no armazenamento local do navegador
        sob a chave <code>sul-global-theme</code>, até ser removida pelo usuário. A aplicação
        principal não define cookies nem usa armazenamento de sessão.
      </p>
      <h2>Busca, compartilhamento e terceiros</h2>
      <p>
        O termo de busca aparece na URL e pode integrar o histórico do navegador. Copiar ou
        compartilhar um link só ocorre após ação do usuário. Links, imagens e fontes externas podem
        seguir políticas próprias dos respectivos provedores.
      </p>
      <h2>Mudanças futuras</h2>
      <p>
        Newsletter, contato, analytics ou publicidade somente poderão ser ativados após revisão de
        finalidade, base legal, retenção, segurança e transparência. Um banner de cookies não é
        exibido porque não há cookies não essenciais ativos.
      </p>
    </LegalPage>
  );
}
