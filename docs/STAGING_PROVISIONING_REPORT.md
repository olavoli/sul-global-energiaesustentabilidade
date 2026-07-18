# Relatório de provisionamento de staging

Data: 2026-07-18  
Branch: `feat/staging-remote-validation`

## Escopo autorizado

Foram provisionados somente:

- Worker Cloudflare `sul-global-staging`;
- D1 `sul-global-newsroom-staging`;
- binding privado `NEWSROOM_DB`;
- secret server-only `NEWSROOM_ADMIN_SECRET`;
- URL temporária `https://sul-global-staging.sul-global.workers.dev`.

O ID real do D1 e o manifesto materializado permanecem em `.wrangler/`,
ignorado pelo Git. Nenhuma credencial foi gravada no repositório.

## Procedimento

1. autenticação OAuth e conta confirmadas em leitura;
2. nomes do Worker e D1 confirmados como disponíveis;
3. D1 criado e migration `0001_newsroom_core.sql` aplicada;
4. seed sanitizado aplicado e reaplicado sem novas linhas;
5. build de staging produzido com demos bloqueadas;
6. Worker implantado sem rota ou domínio personalizado;
7. secret administrativo aleatório configurado por canal protegido;
8. smoke remoto e controles duráveis validados;
9. backup exportado com checksum;
10. restore realizado em D1 temporário e o recurso excluído;
11. rollback do Worker ensaiado e a versão atual restaurada.

## Guardrails

`NEWSROOM_COLLECTION_ENABLED`, `NEWSROOM_TRANSLATION_ENABLED`,
`NEWSROOM_ORCHESTRATION_ENABLED`, `NEWSROOM_NOTIFICATIONS_ENABLED` e
`NEWSROOM_SCHEDULE_ENABLED` permaneceram `false`. Não houve domínio oficial,
produção, publicação, agenda, coleta externa, IA, tradução externa, anúncios ou
analytics.

## Recursos ao final

Permanecem apenas o Worker e o D1 de staging, além do secret server-only. O D1
`sul-global-newsroom-staging-restore-test` foi temporário e já foi excluído.
Não houve alteração de produção.
