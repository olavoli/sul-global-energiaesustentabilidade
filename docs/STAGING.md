# Ambiente de staging

## Estado

O staging remoto autorizado está ativo em
`https://sul-global-staging.sul-global.workers.dev`. O Worker
`sul-global-staging`, o D1 `sul-global-newsroom-staging`, o binding privado e o
secret server-only foram validados. Produção, domínio oficial, publicação,
agenda, coleta, IA e integrações externas permanecem inativos.

## Arquitetura

O build Nitro usa preset `cloudflare-module`, entrypoint
`.output/server/index.mjs`, assets em `.output/public` e o binding público
`ASSETS`. O template `cloudflare/wrangler.staging.template.jsonc` adiciona o
binding privado `NEWSROOM_DB`; seu `database_id` é um placeholder deliberado.
O arquivo gerado com ID real vive em `.wrangler/`, ignorado pelo Git.

Staging exige `VITE_APP_ENV=staging`, URL HTTPS explícita,
`NEWSROOM_ENVIRONMENT=staging` e `NEWSROOM_STORAGE_DRIVER=d1`. O banco, a URL e
os segredos devem ser distintos dos de produção. Indexação, agenda, coleta,
tradução, orquestração, notificações, anúncios, analytics e publicação ficam
bloqueados.

## Comandos locais seguros

```bash
bun run staging:check
bun run staging:validate
bun run staging:smoke:local
bun run staging:provision
bun run staging:migrate
bun run staging:migrate -- --apply
bun run staging:seed
bun run staging:seed -- --apply
bun run staging:recovery:test
bun run staging:rollback:plan
```

`staging:check` reutiliza a validação determinística de configuração.
`staging:smoke:local` executa o smoke do worker já compilado, sem abrir porta e
sem acessar a rede.

`--apply` nos comandos acima afeta somente um emulador novo em memória. O plano
de provisionamento apenas imprime instruções; não chama a Cloudflare.

## Provisionamento executado

1. Conta e nomes revisados em modo leitura.
2. D1 exclusivo criado e ID mantido fora do Git.
3. Migration aplicada e repetição sem pendências.
4. Seed sanitizado aplicado e repetição idempotente.
5. Worker implantado somente em `workers.dev`.
6. Secret rotacionado por canal protegido.
7. Smoke público/autenticado, sessão, rate limit e locks validados.
8. Backup restaurado em D1 temporário isolado e já excluído.
9. Rollback real executado e versão atual restaurada.

Nenhuma etapa concede autorização para produção.

## Lacunas conhecidas

- autenticação permanece single-secret, sem identidade multiusuário;
- não há alerta externo, métricas de campo ou teste de penetração;
- revisão humana do diff e dos recursos Cloudflare ainda é necessária;
- domínio oficial, conteúdo real, revisão jurídica e produção permanecem pendentes.
