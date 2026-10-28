# O que é potência — autorização editorial e bloqueio de publicação

## Declaração recebida

Registro realizado em 28/10/2026, data desta instrução na conversa, não data de revisão linguística. A pessoa que se identifica como responsável pelo portal autorizou a publicação de EN/ES e aceitou conscientemente os três falsos positivos, quatro links PT identificados, raster originais em PT, interface auxiliar parcialmente localizada e limitações documentadas.

Essa declaração é uma autorização editorial do responsável, não prova de revisão linguística humana integral. Não foi atribuído nome de revisor a partir da autoria do artigo, da conta GitHub ou de inferência sobre a identidade do interlocutor. Nenhum parecer, reviewer, reviewedAt, approvedAt ou publishedAt foi fabricado. O registro não certifica a qualidade científica ou linguística.

## Nota de Transparência

Atualizada em ambas as cópias editoriais, mantendo a procedência Cloudflare Workers AI / Meta Llama 3.3 70B e esclarecendo verificações técnicas automáticas, correções editoriais assistidas por IA, autorização de publicação com limitações aceitas e ausência de declaração de revisão linguística humana integral ou certificação científica. A revisão humana exigida pelo fluxo continua pendente e o draft permanece não publicado. O corpo, imagens, fontes e sete avisos não foram alterados.

## Exigência vigente comprovada

- `src/content/translation-schema.ts`: `translationReviewAccepted` aceita o caminho humano approved somente com reviewer e reviewedAt, ou o caminho técnico automatic com atestação correspondente. A validação rejeita approved/scheduled/published enquanto o gate não estiver atendido.
- `scripts/editorial-operations.ts`: publishCheck bloqueia os registros atuais com “Tradução aguarda revisão editorial humana identificada.”. A CLI exige draft → review → approved → published e seus requisitos; autorização isolada não altera esses estados.
- `scripts/i18n-operations/automatic-discovery.ts`: edições manuais pending são PROTECTED. automatic-publication.ts, em installCandidates, recusa substituição com automatic-human-edition-protected. Não se criou policyId/runId/atestação artificial para contornar o caminho manual nem se ativou a automação.

Não existe no fluxo manual atual um campo de autorização isolada que substitua revisão humana efetiva. A declaração recebida foi registrada em documentação, sem reinterpretá-la como revisão.

## Pendência específica

Realizar e registrar revisão editorial humana efetiva das traduções, com identificação real do revisor e a data efetiva da revisão. O registro deve descrever honestamente seu escopo; não é necessário alegar uma revisão linguística integral que não ocorreu. A autorização de publicação e aceitação dos riscos já foram dadas e não estão sendo solicitadas novamente.

Até essa exigência ser satisfeita: status draft, translationReview pending, PR #15 draft; nenhum merge, deploy, exposição pública, nova inferência, alteração Cloudflare ou ativação contínua. Resultados do publish-check e validações são registrados no PR.

## Resultado dos comandos oficiais

Contexto local oficial: VITE_APP_ENV=production e VITE_PUBLIC_SITE_URL=https://sulglobalenergia.com.br, sem credenciais de provedor ou alterações remotas.

- `bun run content:review en:o-que-e-potencia` e edição es: exit 0, schema/autoria verified/quatro fontes válidos; um warning de revisão humana pendente por edição.
- `bun run content:publish-check en:o-que-e-potencia` e edição es: exit 1. Bloqueios exatos: “Tradução aguarda revisão editorial humana identificada.” e “Publicação exige estado approved ou scheduled elegível.” Não houve erro de ambiente oficial.
- `bun run content:status en:o-que-e-potencia review` e edição es, sem --apply: exit 1, “Pesquisa ainda não permite review: briefing ausente.” Falta o briefing da fonte `content/research/o-que-e-potencia.yml`, reutilizado pelo fluxo de traduções. O original PT legado não foi modificado nem reaberto editorialmente.
- Os rascunhos permanecem em draftStage writing. Depois de satisfeitos briefing e revisão efetiva, o fluxo exige review-ready e as transições oficiais; nenhuma foi executada nesta rodada. Não se criou um briefing retrospectivo ou parecer como se já existisse.

Validações do registro e das notas: content:generate, 12 testes focados, typecheck, lint pertinente e diff-check aprovados; duas verificações visuais EN/ES em 360×800 aprovadas, exibindo autorização, ausência de alegação de revisão linguística integral e estado não publicado. Corpos MDX, demais metadados, imagens, fonte PT, artefatos originais e ledger/head preservados. O PR permanece draft para manter o registro durável, sem merge ou deploy.

## Atualização: briefing reconstruído e validado

O resultado anterior “briefing ausente” permanece como evidência histórica, mas não é mais pendência atual. Foi criado content/research/o-que-e-potencia.yml, retrospectivo e com quatro consultas documentais reais desta etapa. Validador e dry-runs draft → review EN/ES aprovados. Os dois registros foram preparados tecnicamente em draftStage review-ready, mantendo status draft, translationReview pending e ausência de reviewer/reviewedAt. Nenhuma transição foi aplicada.

O bloqueio humano continua: o roteiro docs/I18N_POWER_HUMAN_REVIEW.md deve ser efetivamente conferido e preenchido pelo revisor real, com data, escopo e resultado por idioma. Autorização de publicação e aceitação dos riscos já estão registradas e não são solicitadas novamente.
