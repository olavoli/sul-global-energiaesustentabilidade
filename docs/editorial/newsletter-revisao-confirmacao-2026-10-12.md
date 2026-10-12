# Newsletter — revisão pontual e confirmação (local)

## Alterações

- Título preservado: **Uma análise semanal, sem ruído.**
- Substituídas as promessas de reportagem exclusiva, três leituras e gráfico semanal pelas três descrições aprovadas e pelo encerramento **Informação com profundidade, sem excesso de ruído.**
- Mantidos Container, largura editorial, tipografia, cores e formulário compartilhado do portal. A alteração do conteúdo se limita à página `/newsletter`.
- `?confirmado=1` serve somente para apresentar um aviso neutro. Não autentica um assinante nem habilita sucesso. O retorno não exibe e-mail, identificadores ou supostos tokens e não oferece outra inscrição; disponibiliza **Explorar os artigos**, para `/`.

## Fluxo efetivamente encontrado

1. `GET /api/newsletter/subscriptions` retorna configuração pública (`enabled` e site key), não o estado individual da inscrição.
2. `POST /api/newsletter/subscriptions` exige origem, consentimento, Turnstile e rate limit. Registra consentimento em `newsletter_consent_events` e o cadastro em `newsletter_kit_pending`.
3. O cliente Kit V4 cria `inactive`, guarda `kit_subscriber_id` e associa o assinante ao Form. A associação usa `referrer` terminado em `/newsletter`; não envia uma credencial de confirmação ao navegador. A resposta pública é HTTP 202 genérica, sem recibo privado ou cookie de inscrição.
4. A confirmação por e-mail acontece no Kit, não em um endpoint público de confirmação do portal. O retorno `/newsletter?confirmado=1` foi informado no histórico operacional pelo responsável; a configuração externa do Form não foi consultada nem alterada nesta rodada.
5. `POST /api/admin/newsletter/sync`, protegido por sessão, CSRF e origem, consulta o Kit. Apenas `active`, com identidade e geração de consentimento correspondentes ao pending associado, permite a promoção local. O webhook opcional `/api/newsletter/webhooks/kit` também exige assinatura e consulta da API antes de ativar.
6. `D1NewsletterRepository.activate()` registra `newsletter_subscribers.status=active`, `confirmed_at` e evento `subscription_confirmed`, removendo o pending processado. A confirmação é idempotente; descadastros e suppression possuem controles próprios.

Arquivos investigados: `src/lib/newsletter/handler.ts`, `kit-client.ts`, `repository.ts`, `sync.ts`, `contracts.ts`, `security.ts`, `src/server.ts` e as migrations 0002/0005. Nenhum deles foi alterado por esta tarefa.

## Limitação concreta

O estado ativo pode existir no D1, mas a requisição de retorno não contém uma prova que a vincule àquela inscrição. Não existe sessão privada de assinante ou endpoint de consulta individual autenticada. O parâmetro `confirmado=1`, e-mail, ID do Kit ou uma alegação `status=active` na URL não podem substituir essa prova.

Os campos históricos `confirmation_token_hash` e `confirmation_expires_at` da migration 0002 não constituem um fluxo local de confirmação implementado. No fluxo Kit atual, o pending está em outra tabela e não recebe esse token; os campos são nulos na promoção a active. Não foi ativado um segundo double opt-in.

Por isso, **a tela “Inscrição confirmada!” ainda não pode ser habilitada com segurança** dentro das restrições desta rodada. Nem uma confirmação real no Kit identifica automaticamente o visitante de `/newsletter`. Não foi criada uma tela de sucesso fictícia, nem feito sync público, ativação local ou consulta manual à API real.

## Menor correção segura proposta para a próxima etapa

1. Emitir um recibo privado assinado pelo servidor, em cookie HttpOnly/Secure/SameSite, vinculado ao pending e à geração de consentimento de uma nova associação inactive efetivamente concluída. Usar segredo server-only e finalidade criptográfica própria; nunca expor e-mail, hash, credencial ou ID na URL. Não emitir prova de titularidade simplesmente porque um e-mail fornecido já consta como active ou associated.
2. Acrescentar uma consulta de estado somente leitura, por exemplo `GET /api/newsletter/subscription-status`, validando esse recibo e sua expiração antes de consultar o D1. Retornar somente estado sanitizado, com `private, no-store`; não aceitar e-mail/ID públicos como autorização e não invocar o sync nem alterar a inscrição.
3. Exibir o sucesso aprovado somente quando o D1 comprovar active para a mesma geração de consentimento, com confirmação registrada e sem suppression. Enquanto a reconciliação ainda estiver pendente, informar que a verificação não está concluída. Um recibo ausente, inválido ou expirado nunca deve produzir sucesso. Repetições válidas devem ser somente leitura e idempotentes.
4. Quando não houver esse contexto (outro dispositivo, cookie ausente ou expirado), permanecer neutro. O vencimento do recibo não significa vencimento do link do Kit. Validar o link de e-mail do provedor exigiria um mecanismo verificável adicional do Kit, que não foi presumido ou implementado.

Essa proposta preserva o double opt-in do Kit. Depende de alterações adicionais no handler/repositório e testes do recibo e da consulta privada; **não foi implementada nesta rodada**. A promoção no D1 continua dependente do sync administrativo ou webhook existente. Não se promete sucesso imediato antes dessa reconciliação.

## Testes e alcance

- Testes novos da página: redação e título; retorno aparentemente válido sem comprovante; parâmetros inválidos com dados fictícios não refletidos; alegação de expiração não confiável; retorno repetido neutro sem outra inscrição.
- Testes existentes, com Kit simulado e SQLite em memória: estado `active` consultado na API simulada e promoção local; estado `inactive`, identidade divergente e falhas não ativam; confirmações/reconciliações repetidas não duplicam eventos; webhook inválido ou assinatura vencida não ativa indevidamente.
- **Não se afirma ter testado a validade ou expiração de links reais de confirmação do Kit.** Não há endpoint local para isso. Os testes de assinatura expirada do webhook e de parâmetros da URL são guardrails diferentes desse caso.

## Arquivos desta tarefa

- `src/routes/newsletter.tsx`
- `src/components/newsletter/NewsletterPageContent.tsx`
- `src/components/newsletter/NewsletterPageContent.test.tsx`
- Este registro.

Sem alteração de outras páginas, integrações Kit, banco, migrations, secrets ou configurações. Sem commit, push, deploy ou disparo de newsletters. `artifacts/` e alterações locais anteriores preservados.

## Resultados finais

- **32 testes focados aprovados**, zero falhas: cinco da página e os testes existentes de handler, sync e segurança, todos com dados fictícios e sem API real.
- Typecheck, lint dos três arquivos TypeScript afetados, build e `git diff --check` aprovados.
- HTML inicial do Worker local verificado em `/newsletter`, `/newsletter?confirmado=1` e no retorno com alegação `status=expired`: HTTP 200, título preservado e nenhuma afirmação de sucesso. Os retornos com marcador mostram o aviso neutro e não oferecem nova inscrição.
- Testes utilizam `defaultParseSearch`, o parser real do roteador. O marcador é mantido como número `1`, evitando um redirecionamento de normalização para uma string JSON entre aspas. A tipagem não confere autenticidade ao marcador.
- Prévia Vite a 1440 e 390 px: texto legível, estilos existentes, botão para `/` e ausência de rolagem horizontal nas telas verificadas.
- A geração de conteúdo manteve 0 erros e os mesmos 27 avisos preexistentes; nenhum artigo foi alterado.
- **Pendência remanescente:** a tela de sucesso solicitada não está habilitada. Depende do recibo privado e da consulta de estado propostos acima. Validade/expiração do link real do Kit permanecem sob controle do provedor e não foram simuladas como se fossem comprovadas pelo portal.
