# ART-032 — approved persistido

Transição oficial autorizada e executada: `bun run content:status agrivoltaica-e-possivel-colher-alimentos-e-eletricidade-na-mesma-terra approved --apply`. Regra em `scripts/editorial-operations.ts`: review permite approved; autor real deve ser verified; a CLI registra approvedAt e confirma por releitura. Aprovação editorial expressa recebida nesta conversa; não significa declaração de revisão factual humana integral.

Inicial: review / review-ready. Final: **approved / review-ready**, sem publishedAt. `approvedAt: 2026-10-17` foi gerado pelo mecanismo oficial em UTC (`toISOString().slice(0,10)`), durante a noite de **16/10/2026 em São Paulo**. Não foi corrigido manualmente para outra data. Comparação dos objetos e do corpo confirmou que somente status e approvedAt mudaram no MDX.

Validações: research:validate aprovado (15 fontes); content:review sem erros ou avisos; content:generate e content:validate sem erros e com os 27 avisos preexistentes de outros conteúdos; typecheck aprovado; 62 testes pertinentes aprovados; git diff --check aprovado. Uma expectativa inicial com data local falhou; foi ajustada à data UTC efetivamente registrada e a suíte passou. Testes preservam referências sequenciais e fontes estruturadas, cinco imagens e hashes, licença da Hero, transparência e exclusão de rotas públicas, busca, tags, RSS e sitemap. Briefing, SEO, categoria, tags, corpo científico, imagens e nota permanecem intactos.

O publish-check local agora tem **um único bloqueio**: ambiente oficial e URL pública. Não há bloqueio de status nem novo bloqueio de conteúdo apontado pelo comando. Incertezas documentais previamente registradas no briefing não foram artificialmente alteradas ou convertidas em autorização de terceiros.

## Inventário

Dos 33 caminhos anteriores, mudaram somente MDX, src/content/generated/articles.ts e src/content/art-032.test.tsx (expectativas approved/data). Os outros 30 permaneceram idênticos por hash. O inventário foi ampliado para **37 caminhos**, acrescentando a correção da CLI, seus testes e os registros diretamente pertinentes: scripts/editorial-operations.ts; src/content/editorial-operations.test.ts; correcao-cli-json-2026-10-16.md; este relatório. Capturas, scripts locais, artifacts/, secrets e mudanças alheias continuam excluídos. O JSON do inventário é controle local fora de sua própria lista. Conferir novamente após publicação local futura e antes de staging.

## Publicação futura — comandos propostos, não executados

O publish-check usa exclusivamente `VITE_APP_ENV=production` e uma `VITE_PUBLIC_SITE_URL` HTTPS não local para reconhecer o contexto oficial; ele não faz deploy, não prova estado remoto e não requer credenciais Cloudflare. Ambiente de build deve excluir demos. Após autorização expressa para published:

```powershell
$env:VITE_APP_ENV='production'
$env:VITE_PUBLIC_SITE_URL='https://sulglobalenergia.com.br'
$env:VITE_ALLOW_DEMO_CONTENT='false'
bun run research:validate agrivoltaica-e-possivel-colher-alimentos-e-eletricidade-na-mesma-terra
bun run content:review agrivoltaica-e-possivel-colher-alimentos-e-eletricidade-na-mesma-terra
bun run content:publish-check agrivoltaica-e-possivel-colher-alimentos-e-eletricidade-na-mesma-terra
# Apenas com autorização de publicação:
bun run content:status agrivoltaica-e-possivel-colher-alimentos-e-eletricidade-na-mesma-terra published --apply
bun run content:generate
bun run content:validate
bun run typecheck
bun run lint
bun run test
bun run build
git diff --check
```

Depois, rever inventário e fazer staging seletivo, commit e push somente quando autorizados; exigir CI oficial aprovado antes do deploy. O procedimento de produção é o documentado em docs/DEPLOYMENT.md: build com ambiente oficial, PRODUCTION_D1_DATABASE_ID por meio protegido, production:config, production:check, production:dry-run e `bunx wrangler deploy --config .wrangler/production.generated.json --keep-vars`, seguido de smoke:production somente leitura. Não usar configuração Nitro alternativa nem alterar bindings, banco ou secrets. Esses passos não foram executados nesta rodada.

**Pronto para decisão final de publicação.** Sem staging, commit, push, deploy, disponibilização pública, newsletter ou operação Kit.
