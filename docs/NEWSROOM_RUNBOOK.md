# Runbook da automaÃ§Ã£o editorial

Para operação visual, consulte `EDITORIAL_CONSOLE_OPERATIONS.md`. A interface nunca substitui a CLI em apply completo, coleta externa ou recuperação avançada.

## Rotina segura

1. Execute `bun run newsroom:daily` para simulaÃ§Ã£o.
2. Use `--validate-only` para validar configuraÃ§Ã£o ou `--process-existing` para trabalhar offline.
3. Leia `newsroom:report`, `newsroom:inbox:list` e `newsroom:run:list`.
4. Para apply offline, configure apenas `NEWSROOM_ENABLED=true` e `NEWSROOM_ORCHESTRATION_ENABLED=true`, revise a saÃ­da e use `--process-existing --apply --actor <id>`.
5. Ative coleta somente em operaÃ§Ã£o autorizada, com `NEWSROOM_COLLECTION_ENABLED=true`; nunca amplie orÃ§amento durante incidente.

## Incidentes

- lock ativo: aguarde ou investigue owner/run; override somente se expirado;
- circuito aberto: revise falha, termos, formato e seguranÃ§a antes de resetar;
- orçamento: preserve o checkpoint e reduza o escopo;
- run interrompido: inspecione e use recovery;
- kill switch: comandos de leitura/validaÃ§Ã£o continuam disponÃ­veis;
- runner GitHub: trate artifacts como efÃªmeros sem backend/restauraÃ§Ã£o deliberada.

NotificaÃ§Ãµes suportadas sÃ£o console, arquivo ou disabled. NÃ£o existem e-mail, mensageria, dashboard externo ou fornecedor de mÃ©tricas. Cleanup Ã© dry-run e nunca remove decisÃ£o humana ou evidÃªncia editorial necessÃ¡ria.

## Storage

Diagnóstico inicial: `storage:health`, `storage:migrate:status` e
`storage:verify`. Em conflito, interrompa a mutação e recarregue o agregado. Em
indisponibilidade, preserve o portal público e feche a Central para escrita. Em
lock órfão, confirme expiração e fencing antes de override auditável.

## Staging

Comece com `staging:validate`, `staging:migrate`, `staging:seed` e
`staging:recovery:test`. Sem autorização remota, pare no emulador. Em incidente,
use `staging:rollback:plan`: o kill switch precede rollback de worker, restore
ou remoção de binding.

O staging remoto autorizado possui D1 e Worker próprios. Backup/restore e
rollback já foram ensaiados sem produção: restore sempre usa banco temporário,
e rollback do Worker nunca apaga nem reverte o D1. A URL, IDs e secrets reais
não devem ser copiados para documentação, issue ou log.
