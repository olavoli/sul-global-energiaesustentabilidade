# Operação da redação algorítmica

## Operação pelo navegador

Com `NEWSROOM_ADMIN_SECRET` configurado no servidor, `/admin/newsroom` permite leitura e ações humanas controladas. A CLI permanece a autoridade para apply completo, coleta externa e manutenção avançada. Consulte `EDITORIAL_CONSOLE_OPERATIONS.md`.

## Automação diária

```text
bun run newsroom:daily [-- --validate-only|--process-existing|--collect-only] [--apply --actor <ator>]
bun run newsroom:report
bun run newsroom:inbox:list
bun run newsroom:run:list
bun run newsroom:circuit:list
bun run newsroom:stats
```

Dry-run é padrão. Apply exige `NEWSROOM_ENABLED=true`; coleta e demais capacidades exigem switches próprios. Consulte `NEWSROOM_RUNBOOK.md`.

## Orquestrador

```text
bun run newsroom:orchestrate [-- --apply --actor <ator>]
bun run newsroom:decision:list [-- --risk high]
bun run newsroom:decision:show -- <id>
bun run newsroom:decision:review -- <id>
bun run newsroom:decision:act -- <id> <ação> --actor <ator> --notes <nota> [--apply]
bun run newsroom:decision:stats
bun run newsroom:pitch:create -- <decision-id> --actor <ator> [--apply]
bun run newsroom:pitch:list
bun run newsroom:pitch:show -- <id>
bun run newsroom:pitch:update -- <id> --actor <ator> --reason <motivo> [--apply]
```

`publish` não é ação válida. Avaliar e listar não cria pauta. Pauta exige decisão humana `approve-for-pitch` persistida e sem bloqueadores.

## Comandos de clusters e tradução

```text
bun run newsroom:cluster [-- --apply]
bun run newsroom:cluster:list
bun run newsroom:cluster:show -- <cluster-id>
bun run newsroom:cluster:merge -- <id-a> <id-b> --actor <ator> --reason <motivo> [--apply]
bun run newsroom:cluster:split -- <id> --items <item-id,...> --actor <ator> --reason <motivo> [--apply]
bun run newsroom:evidence -- [cluster-id]
bun run newsroom:claims -- [cluster-id]
bun run newsroom:translation:list
bun run newsroom:translation:queue -- [cluster-id] [--apply]
bun run newsroom:translation:run -- --limit 3 [--apply]
bun run newsroom:translation:review -- <translation-id>
bun run newsroom:translation:approve -- <id> --actor <ator> --notes <notas> [--apply]
```

Sem `--apply`, nenhum arquivo muda. O provider fixture limita-se a três títulos versionados; nenhuma ação publica.

Comandos adicionais cobrem `source:*`, `review`, `coverage` e `quarantine:*`. Mutações exigem `--apply`; aprovação exige ator e confirmação. A fila tem versão, retenção, lock, backup e recuperação.

## Segurança operacional

Todos os comandos mutáveis são dry-run por padrão. Use `--apply` somente depois de revisar o output. Nenhum comando publica artigo. O catálogo inicial não contém fonte externa ativa; a coleta padrão é offline.

## Comandos

```bash
bun run newsroom:sources
bun run newsroom:collect
bun run newsroom:collect -- --apply
bun run newsroom:list
bun run newsroom:list -- --state=review
bun run newsroom:show -- <id>
bun run newsroom:score
bun run newsroom:reject -- <id>
bun run newsroom:reject -- <id> --apply
bun run newsroom:archive -- <id> --apply
bun run newsroom:approve -- <id> --apply
bun run newsroom:stats
```

`collect` limita cada fonte a 25 itens no CLI. Sem fonte ativa, processa `newsroom/fixtures/rss.xml` e `newsroom/fixtures/atom.xml`. `approve` move o item para `approved-for-draft` e cria `newsroom/briefings/<id>.yml`; não cria MDX nem altera o repositório público.

## Arquivos operacionais

- `newsroom/sources/catalog.json`: configuração versionada;
- `newsroom/queue.json`: fila local;
- `newsroom/rejected/`: rejeições aplicadas com motivo;
- `newsroom/audit/events.jsonl`: auditoria de execuções aplicadas;
- `newsroom/briefings/`: briefings aprovados para futura redação;
- `newsroom/inbox/` e `newsroom/processed/`: áreas reservadas para evolução.

Nada em `newsroom/` deve ser copiado para `public/` ou importado pelo bundle do site.

## Incidentes e erros

- fonte inativa/bloqueada: corrija o catálogo apenas com autorização;
- XML inválido: rejeite e registre; não tente scraping alternativo;
- URL privada ou protocolo bloqueado: trate como risco de SSRF;
- resposta excessiva: não aumente o limite sem decisão registrada;
- item sem título, URL ou data: preserve a rejeição auditável;
- duplicata: revise vínculos; não apague evidência.

## Auditoria

O registro contém comando, timestamp, origem, contadores, erros, duração, versão da configuração, ator e dry-run. Dry-runs imprimem o resumo sem escrever. Operações aplicadas persistem o registro. Não registre tokens, cookies, dados pessoais ou texto integral.

## Operação do piloto real

Use `source:add` primeiro em dry-run e depois com `--apply`. Execute health check antes da coleta. Coleta ampla exige `--all --confirm-all`; persistência exige `--apply`; o limite é 20 itens por fonte. Revisão amostral usa `newsroom:review` e não muda estado.
