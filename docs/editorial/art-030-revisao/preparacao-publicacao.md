# ART-030 — preparação de publicação local

Este é o registro histórico da preparação antes da confirmação de conflitos. O bloqueador foi resolvido e as transições locais concluídas; o estado vigente está em [Liberação local final](liberacao-local-final.md). Os comandos de commit, push e deploy abaixo continuam apenas previstos.

Auditoria em 10/10/2026. Branch: `main`. Nenhum staging, commit, push ou deploy executado.

## Resultado e bloqueador

O checklist `content:review` passou com zero erros e zero warnings: schema, autor verificado, slug/taxonomia e cinco fontes corretos. V3, cinco pontos-chave, uma tabela e um Callout preservados. SEO, canonical, dimensões/alt das três imagens e transparência estão consolidados, sem informação provisória no texto público. A base de uso das artes foi resolvida no registro de proveniência.

O procedimento oficial em `docs/EDITORIAL_OPERATIONS.md` exige `draft → review → approved → published`; não permite troca direta. A transição inicial depende de briefing de pesquisa validado e `draftStage: review-ready`.

Foi criado `content/research/a-maquina-que-transforma-calor-desperdicado-em-eletricidade.yml` com a pesquisa já verificada. A confirmação humana de avaliação dos conflitos de interesse ainda não foi fornecida. `conflictsOfInterestEvaluated: false` registra essa falta de confirmação, não ausência de conflitos. O briefing permanece `fact-checking` até a resposta. Não foi simulada aprovação nem contornado o gate. A confirmação foi solicitada ao responsável nesta rodada.

Consequentemente, o MDX permanece `draft` / `writing`, sem `approvedAt` ou `publishedAt`. Ainda não está liberado para commit de publicação. As listagens, busca, consulta por slug, sitemap e RSS continuam excluindo-o, comprovado pelos testes. A inclusão real nesses canais deverá ser testada após as transições oficiais; não foi alegada inclusão enquanto o artigo está em draft.

## Arquivos previstos para o commit

30 arquivos pertencentes exclusivamente ao ART-030:

- Um MDX: `content/articles/a-maquina-que-transforma-calor-desperdicado-em-eletricidade.mdx`.
- Um briefing: `content/research/a-maquina-que-transforma-calor-desperdicado-em-eletricidade.yml`.
- Três PNGs no diretório `public/images/articles/a-maquina-que-transforma-calor-desperdicado-em-eletricidade/`: `art-030-hero.png`, `art-030-funcionamento.png`, `art-030-comparativo.png`.
- Um teste: `src/content/art-030.test.tsx`.
- Dois índices gerados: `src/content/generated/articles.ts` e `src/content/generated/loaders.ts`. As adições são somente o registro e o loader do ART-030.
- 22 documentos/capturas em `docs/editorial/art-030-revisao/`: 11 Markdown (incluindo este relatório) e 11 JPEGs da auditoria visual. Documentos de etapas anteriores preservam o histórico; não são conteúdo público do artigo.

`artifacts/` permanece fora desse conjunto e não será adicionado. Nenhum arquivo não relacionado aparece modificado. Não foi inspecionado, limpo ou modificado o conteúdo de `artifacts/`.

## Mudanças ainda necessárias

1. Receber a confirmação de avaliação de conflitos e registrar qualquer declaração aplicável sem inventá-la.
2. Atualizar o briefing para `ready-for-writing` somente após resolver o gate; validar com `research:validate`.
3. Marcar o MDX `draftStage: review-ready`, refletindo a revisão concluída.
4. Executar as transições locais oficiais `review`, `approved` e `published`. A CLI registra as datas reais de aprovação/publicação; não antecipá-las manualmente.
5. Ajustar o teste específico: verificar publicação e inclusão em lista/categoria/autor/busca/sitemap/RSS, mantendo uma regressão de exclusão quando o mesmo registro é draft. Conferir canonical absoluto com a base oficial e OG/Twitter.
6. Regenerar índices e repetir validações antes de apresentar o diff publicado para autorização.

## Validações realizadas

- Testes pertinentes: 43 aprovados, zero falhas na reexecução completa, 321 expectativas. Houve um timeout inicial de 5 s em teste preexistente do artigo piloto; passou isoladamente e na reexecução, sem alteração de código.
- Typecheck: aprovado.
- Lint do teste ART-030/índices gerados: aprovado.
- Validação de conteúdo: aprovada, 43 artigos, 26 avisos preexistentes e zero erros.
- Build: aprovado.
- `git diff --check`: aprovado.
- `content:review`: zero erros/warnings.
- `research:validate`: bloqueado por avaliação de conflitos não confirmada e estado ainda `fact-checking`. Não é falha técnica de compilação.

Os riscos visuais já documentados permanecem não bloqueantes: PNGs pesados, texto raster pequeno no celular e pequena rolagem interna da tabela no desktop. Nenhuma arte ou componente foi alterado para corrigir esses pontos nesta rodada.

## Comandos previstos — não executados

Após a confirmação faltante e os ajustes locais acima:

```powershell
$artSlug = 'a-maquina-que-transforma-calor-desperdicado-em-eletricidade'
bun run research:validate -- $artSlug
bun run content:status -- $artSlug review
bun run content:status -- $artSlug review --apply
bun run content:status -- $artSlug approved
bun run content:status -- $artSlug approved --apply
$env:VITE_APP_ENV='production'
$env:VITE_PUBLIC_SITE_URL='https://sulglobalenergia.com.br'
$env:VITE_ALLOW_DEMO_CONTENT='false'
bun run content:publish-check -- $artSlug
bun run content:status -- $artSlug published
bun run content:status -- $artSlug published --apply
bun run content:generate
```

Após validações e autorização explícita do diff:

```powershell
git add -- content/articles/a-maquina-que-transforma-calor-desperdicado-em-eletricidade.mdx content/research/a-maquina-que-transforma-calor-desperdicado-em-eletricidade.yml public/images/articles/a-maquina-que-transforma-calor-desperdicado-em-eletricidade src/content/art-030.test.tsx docs/editorial/art-030-revisao src/content/generated/articles.ts src/content/generated/loaders.ts
git diff --cached --check
git diff --cached --stat
git commit -m "feat(content): publish ART-030 on Organic Rankine Cycle"
git push origin main
```

Antes de deploy: verificar CI do SHA e exigir sucesso. Procedimento documentado em `docs/DEPLOYMENT.md`:

```powershell
# Ambiente de build: production, URL oficial e demos false, definidos acima.
bun run build
# PRODUCTION_D1_DATABASE_ID deve ser fornecido ao processo por canal protegido.
bun run production:config
bun run production:check
bun run production:dry-run
# Somente com autorização e guardas aprovadas:
bunx wrangler deploy --config .wrangler/production.generated.json --keep-vars
bun run smoke:production
```

Não executar migrations, alterar vars/secrets remotos ou usar a configuração automática de deploy do Nitro. O procedimento futuro preserva as configurações remotas com `--keep-vars`.
