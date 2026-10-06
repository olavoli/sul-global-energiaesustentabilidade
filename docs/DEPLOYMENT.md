# Implantação e operação

## Central Editorial

`NEWSROOM_ADMIN_SECRET` é server-only e obrigatório para habilitar acesso. Nunca use prefixo `VITE_`. Sem backend privado persistente, a Central mutável não deve ser ativada em Cloudflare multi-instância.

Este documento prepara uma implantação controlada; ele não autoriza deploy nem define domínio.

## Staging remoto

`cloudflare/wrangler.staging.template.jsonc` complementa o manifesto Nitro
gerado sem versionar IDs. A configuração materializada autorizada permanece em
`.wrangler/`, ignorada pelo Git. `bun run staging:validate` valida a
configuração; `staging:provision` mostra comandos sem executá-los. O workflow
`staging-readiness.yml` não reage a push e só pode implantar staging com input
literal, environment protegido e secrets próprios. Consulte `STAGING.md`.

## Matriz de ambientes

| Ambiente        | `VITE_APP_ENV`                         | URL                              | Demos                      | Indexação  |
| --------------- | -------------------------------------- | -------------------------------- | -------------------------- | ---------- |
| Desenvolvimento | `development`                          | local                            | habilitadas com aviso      | bloqueada  |
| Teste           | `test`                                 | local                            | permitidas em testes       | bloqueada  |
| Preview         | `preview` ou build sem valor explícito | local ou URL de preview          | somente com opt-in e aviso | bloqueada  |
| Staging         | `staging`                              | URL explícita de staging         | bloqueadas por padrão      | bloqueada  |
| Produção        | `production`                           | URL pública absoluta obrigatória | proibidas                  | habilitada |

`src/config/environment.ts` é a autoridade. Um build genérico é preview, nunca produção implícita. Produção falha se a URL pública estiver ausente/local ou se demos forem habilitadas.

## Variáveis públicas

- `VITE_APP_ENV`: ambiente da aplicação.
- `VITE_PUBLIC_SITE_URL`: origem de canonical, social, sitemap e RSS.
- `VITE_ALLOW_DEMO_CONTENT`: opt-in de demo apenas fora de produção oficial.

Toda variável `VITE_*` integra o cliente e não pode conter segredo. Tokens Cloudflare, chaves e credenciais não pertencem a `.env.example` nem ao repositório.

## Toolchain e artefato

- Bun `>=1.3.14`: instalação, geração MDX, typecheck, lint, testes, build e smoke.
- Node `>=20`: necessário para executar o Wrangler suportado.
- Vite 8 + Nitro 3 beta; preset `cloudflare-module`; Wrangler 4.

```bash
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun test
bun run build
bun run smoke:preview
bun run preview
```

O build gera assets em `.output/public`, entrypoint em `.output/server/index.mjs` e uma configuração automática do Nitro em `.output/server/wrangler.json`. Essa configuração automática atende ao runtime e ao preview, mas **não é a configuração oficial de deploy de produção**. `bun run preview` usa um launcher local que valida Node >=20 antes de iniciar o Wrangler, sem instalação global. Se Node não estiver no `PATH`, defina `NODE_BINARY` com o caminho do executável; o launcher falha de forma explícita em vez de permitir que Bun se apresente como Node. Essa substituição causou o erro local `Unexpected server response: 101` observado na Sprint 19. `bun run smoke:preview:artifact` automatiza dois builds de preview: valida rotas com demo explicitamente habilitada e recompila/valida o estado seguro com demos bloqueadas.

O smoke local é explicitamente de preview e preserva `noindex, nofollow` e `Disallow: /`. A produção possui um smoke remoto separado, somente leitura, que aceita exclusivamente a origem oficial e exige confirmação explícita:

```powershell
$env:PRODUCTION_BASE_URL='https://sulglobalenergia.com.br'
$env:PRODUCTION_TARGET_CONFIRMATION='PRODUCTION-READ-ONLY'
bun run smoke:production
```

O smoke de produção usa somente requisições GET, não autentica, não envia formulários e não executa ações administrativas.

## Segurança e indexação

Todas as respostas recebem CSP, `nosniff`, política de referrer/permissões, bloqueio de frames e COOP. HSTS só é emitido em produção oficial recebida por HTTPS. A CSP mantém Google Fonts e as capas Unsplash enquanto esses terceiros existirem. `unsafe-inline` permanece restrito a script/estilo por compatibilidade com hidratação SSR, estilos inline controlados e folhas do Google; `unsafe-eval` não é permitido.

Development, preview e staging recebem `noindex, nofollow` no HTML e em `X-Robots-Tag`; robots bloqueia tudo, e sitemap/RSS não listam conteúdo. Canonicals usam a origem local/explicitamente configurada, nunca um domínio oficial presumido.

## Procedimento de deploy controlado

1. Concluir [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) e [EDITORIAL_LAUNCH_CHECKLIST.md](./EDITORIAL_LAUNCH_CHECKLIST.md).
2. Fazer o build aprovado com `VITE_APP_ENV=production`, `VITE_PUBLIC_SITE_URL=https://sulglobalenergia.com.br` e `VITE_ALLOW_DEMO_CONTENT=false`.
3. Obter o `database_id` do D1 `sul-global-newsroom-production` por canal protegido e defini-lo somente no processo local:

   ```powershell
   $env:PRODUCTION_D1_DATABASE_ID='<ID protegido>'
   bun run production:config
   ```

4. Executar a sequência oficial, que consulta a versão ativa somente para comparar estrutura e nunca exibe o ID:

   ```powershell
   bun run production:check
   bun run production:dry-run
   ```

5. Revisar o dry-run. Somente após autorização humana explícita, executar manualmente:

   ```powershell
   bunx wrangler deploy --config .wrangler/production.generated.json --keep-vars
   ```

6. Executar `smoke:production` e validar headers, status, canonical, robots, sitemap, RSS e páginas legais no domínio real.

`cloudflare/wrangler.production.template.jsonc` é a fonte de verdade versionada para a estrutura pública do deploy. O único placeholder é preenchido por `production:config`, que cria exclusivamente `.wrangler/production.generated.json`; todo `.wrangler/` permanece ignorado. O template fixa `sul-global-production`, `compatibility_date: 2026-09-24`, `nodejs_compat`, `ASSETS`, `NEWSROOM_DB` e o nome público do D1. IDs, tokens e secrets não pertencem ao Git.

`production:check` recusa staging, entrypoint automático do Nitro, data inferior à aprovada, downgrade em relação à versão ativa, mudança do D1 e desaparecimento dos bindings obrigatórios. A comparação remota é somente leitura. `production:dry-run` sempre repete essas guardas e usa `--keep-vars`; o mesmo parâmetro é obrigatório no deploy manual para preservar variáveis e secrets remotos não declarados no template. A configuração automática `.output/server/wrangler.json` nunca deve ser passada ao deploy de produção.

## Newsletter com Kit

A newsletter permanece desativada por padrão. A ativação exige a migration 5 previamente auditada e aplicada, um Form do Kit com double opt-in e webhook apontando para `/api/newsletter/webhooks/kit`, configurado para `subscriber.activated` e `subscriber.unsubscribed`. Configure fora do Git:

- secrets server-side: `KIT_API_KEY`, `KIT_WEBHOOK_SECRET`, `NEWSLETTER_HASH_SECRET` e `TURNSTILE_SECRET_KEY`;
- vars de runtime: `KIT_FORM_ID`, `NEWSLETTER_ENABLED` e `TURNSTILE_SITE_KEY`.

`NEWSLETTER_HASH_SECRET` deve ser exclusivo da newsletter. O endpoint público cria o subscriber explicitamente como `inactive`, associa-o ao Form e aguarda o webhook assinado antes de marcar a assinatura como ativa no D1. Nunca inclua esses valores no template versionado ou em variáveis `VITE_*`. O deploy oficial continua usando `--keep-vars` para preservar a configuração remota.

## Cache, rollback e operação

Assets com hash podem usar cache imutável; HTML, robots, sitemap e RSS devem permitir atualização controlada. Não armazenar respostas personalizadas em cache futuro sem revisão. Para rollback, manter o artefato/commit anteriormente aprovado e reimplantar essa versão pela plataforma; nunca reescrever histórico publicado.

A observabilidade atual não envia dados: em desenvolvimento registra diagnóstico; fora dele registra apenas categoria e contexto seguro. Não registrar corpo de formulário, e-mail, mensagem, query sensível ou token. Uma integração futura implementa `ObservabilityReporter` após avaliação de privacidade e retenção.

## Limitações

- o deploy de produção permanece manual e depende de autorização humana, autenticação Wrangler e ID D1 fornecido por canal protegido;
- Node precisa estar instalado para o preview Wrangler;
- imagens demo externas, ativo social e revisão jurídica continuam pendentes;
- não há E2E de navegador, monitoramento remoto ou métricas de campo;
- conteúdo demo ainda integra fisicamente o bundle, embora seja bloqueado.

## Persistência da newsroom

Preview e produção exigem `NEWSROOM_STORAGE_DRIVER=d1`, binding privado
`NEWSROOM_DB` e migrations validadas. `local` é recusado em produção; binding
ausente deixa a Central indisponível para mutações sem afetar o portal público.
Nunca prefixar o binding ou o segredo com `VITE_`.

Em staging, migration, seed, export, restore isolado, smoke autenticado e
rollback foram validados em 2026-07-18. O Worker responde somente em
`https://sul-global-staging.sul-global.workers.dev`. Esse resultado não
autoriza domínio oficial nem produção.
