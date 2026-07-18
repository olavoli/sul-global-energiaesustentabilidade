# Rollback de staging

## Ordem de contenção

1. desativar `NEWSROOM_ENABLED`;
2. manter coleta, tradução, orquestração, notificações e agenda em `false`;
3. bloquear a Central removendo ou rotacionando o secret;
4. retornar operações ao modo somente leitura;
5. preservar logs, auditoria, backup e IDs da versão afetada;
6. reimplantar a versão anterior aprovada do worker de staging;
7. validar portal público antes de reabrir a Central.

## Dados e migrations

Não apagar dados para fazer rollback. Migration incompatível mantém mutações
bloqueadas. Confira o checksum e restaure primeiro em banco D1 isolado; compare
IDs, decisões, auditoria e objetos antes de qualquer troca. Migrations reversas
destrutivas não são automatizadas. Remover o binding é contenção final, após
preservar evidências.

Use `bun run staging:rollback:plan` para imprimir a sequência. A rotação do
secret e o rollback do worker são operações manuais da conta autorizada. Nunca
aplique este runbook à produção sem um plano e autorização próprios.

## Ensaio remoto

Em 2026-07-18, o Worker de staging foi revertido para a versão imediatamente
anterior do mesmo artefato. Home respondeu 200 e a Central anônima permaneceu
bloqueada com 401. A versão atual foi restaurada e confirmada. O D1 não foi
alterado nem substituído durante o rollback.
