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
      updatedAt="6 de outubro de 2026"
    >
      <h2>Estado atual</h2>
      <p>
        O portal não utiliza analytics ou publicidade ativa. O formulário de contato valida dados
        apenas no navegador e não os envia. A newsletter trata o e-mail conforme descrito abaixo.
      </p>
      <h2>Newsletter</h2>
      <p>
        Ao solicitar a newsletter, registramos seu e-mail, a versão e a data do consentimento e a
        origem da inscrição. O Kit é o provedor responsável pelo double opt-in e pelos envios: a
        inscrição só se torna ativa depois da confirmação feita pela mensagem enviada pelo Kit. Até
        lá, o registro permanece pendente.
      </p>
      <p>
        O descadastro pode ser realizado pelos links das mensagens. Após a sincronização com o Kit,
        removemos o e-mail legível da base local e mantemos somente o hash necessário à supressão,
        além da trilha de consentimento e auditoria. Uma nova inscrição é permitida apenas mediante
        novo consentimento explícito e exige outro double opt-in; ela nunca restaura silenciosamente
        o estado ativo.
      </p>
      <h2>Preferências e armazenamento</h2>
      <p>
        A preferência de tema claro ou escuro pode ser guardada no armazenamento local do navegador
        sob a chave <code>sul-global-theme</code>, até ser removida pelo usuário. A aplicação usa um
        cookie necessário à identificação de interações nos comentários, descrito abaixo.
      </p>
      <h2>Busca, compartilhamento e terceiros</h2>
      <p>
        O termo de busca aparece na URL e pode integrar o histórico do navegador. Copiar ou
        compartilhar um link só ocorre após ação do usuário. Links, imagens e fontes externas podem
        seguir políticas próprias dos respectivos provedores.
      </p>
      <h2>Comentários públicos</h2>
      <p>
        Comentários e respostas válidos são publicados imediatamente e sujeitos a moderação
        posterior. O nome ou apelido pode ser exibido; o e-mail permanece privado e é usado somente
        para moderação, segurança e pedidos de exclusão. Conteúdos ocultados ou classificados como
        spam podem ser restaurados enquanto seus dados estiverem retidos. A anonimização desses
        dados ocorre nos acessos administrativos às listas de comentários ou denúncias, para
        conteúdos ocultados ou classificados como spam há pelo menos 90 dias. Não há limpeza
        agendada; sem esses acessos, a anonimização pode ocorrer depois do prazo. A exclusão é
        irreversível e pode ser solicitada pelos canais de contato indicados pelo Sul Global.
      </p>
      <p>
        Gostei, Não gostei e denúncias usam um identificador aleatório em cookie protegido, com
        validade de 180 dias. Somente um hash dessa identidade é armazenado no banco para limitar
        duplicações e abuso. Não usamos fingerprint nem e-mail como identidade de reação. A
        identidade não comprova quem é a pessoa e não garante anonimato absoluto; remover o cookie
        ou mudar de dispositivo cria outra identidade. Denúncias são privadas e não ocultam
        automaticamente o comentário. Limites de requisições e verificação de segurança também
        protegem o serviço.
      </p>
      <p>
        Ao anonimizar ou excluir definitivamente um comentário, também eliminamos o detalhe livre
        das denúncias relacionadas. Preservamos o registro da denúncia, o motivo categórico, o
        estado, as datas, o hash necessário à unicidade e a identificação da revisão administrativa.
        Os eventos administrativos são preservados para auditoria.
      </p>
      <h2>Mudanças futuras</h2>
      <p>
        Contato, analytics ou publicidade somente poderão ser ativados após revisão de finalidade,
        base legal, retenção, segurança e transparência. Um banner de cookies não é exibido porque
        não há cookies não essenciais ativos.
      </p>
    </LegalPage>
  );
}
