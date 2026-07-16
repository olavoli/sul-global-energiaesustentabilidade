# AutomaÃ§Ã£o diÃ¡ria supervisionada

## Central Editorial

A interface pode iniciar somente dry-run, validate-only, process-existing e report-only. Apply completo e coleta externa mutável estão bloqueados.

A Sprint 16 encadeia a infraestrutura privada da newsroom em uma execuÃ§Ã£o reproduzÃ­vel. O pipeline verifica ambiente e configuraÃ§Ã£o, adquire lock quando mutÃ¡vel, pode verificar/coletar fontes autorizadas, processa estado, clusteriza, monta evidÃªncias, enfileira traduÃ§Ã£o, avalia decisÃµes, gera relatÃ³rio e inbox, notifica localmente, limpa e libera o lock.

Modos: `dry-run`, `apply`, `validate-only`, `collect-only`, `process-existing`, `report-only` e `recovery`. Dry-run Ã© o padrÃ£o. `process-existing` nunca acessa rede. Apply exige `--apply` e `NEWSROOM_ENABLED=true`; coleta, traduÃ§Ã£o, orquestraÃ§Ã£o, notificaÃ§Ã£o e agenda possuem switches separados.

Os orÃ§amentos versionados limitam fontes, itens, bytes, duraÃ§Ã£o, redirects, retries, erros, quarentena, clusters, traduÃ§Ãµes e decisÃµes. Limite atingido gera `stopReason`, sem ampliaÃ§Ã£o automÃ¡tica. Retry aceita apenas falha transitÃ³ria e circuit breaker impede insistÃªncia em fonte degradada ou insegura.

Nada neste pipeline publica, aprova pauta, cria artigo, aprova traduÃ§Ã£o ou chama IA. Dados, locks, runs, relatÃ³rios e inbox ficam em `newsroom/`, fora do bundle pÃºblico.

## Agendamento

Execução mutável no workflow exige driver `d1` autorizado; o padrão continua
dry-run local e a agenda permanece bloqueada por variável. O workflow não
exporta banco, binding ou segredo como artifact. O lock global durável impede
duas execuções mutáveis concorrentes.

`.github/workflows/newsroom-daily.yml` oferece dispatch manual e cron protegido por `NEWSROOM_SCHEDULE_ENABLED=true`. O workflow usa Bun fixado, lockfile congelado, concorrÃªncia, timeout e artifact privado. NÃ£o faz deploy, commit, push ou pull request. Sem backend ou restauraÃ§Ã£o deliberada de artifact, o filesystem do runner Ã© efÃªmero.
