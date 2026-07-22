# Sul Global

## Sprint 28 — dossiê científico de evidências

O pacote privado organiza fontes, claims e evidências atribuídas sem IA, texto integral ou publicação. A coleta externa permanece bloqueada até autorização humana.

## Sprint 26 — sinais científicos temporais

O motor privado converte a memória temporal em métricas, cobertura, confiança e warnings determinísticos. É dry-run por padrão, não usa IA, não prevê e não publica. Consulte `docs/SCIENTIFIC_TRENDS.md`.

## Sprint 23 — Grafo Científico supervisionado

O subsistema privado modela trabalhos, autores, instituições, temas e relações bibliográficas somente de OpenAlex e Crossref. A coleta é limitada e dry-run por padrão; não interpreta citações, não baixa PDFs, não usa IA e não cria conteúdo. Consulte `docs/SCIENTIFIC_KNOWLEDGE_GRAPH.md`.

## Sprint 20 — staging remoto validado

O ambiente isolado de homologação está disponível em
`https://sul-global-staging.sul-global.workers.dev`, com Worker Cloudflare, D1
exclusivo, migration aplicada, seed sanitizado, Central Editorial protegida,
sessão durável, rate limit, locks com fencing, backup/restore e rollback
validados. Todos os kill switches mutáveis permanecem fechados. Produção,
domínio oficial, publicação, agenda, coleta, IA, tradução externa, anúncios e
analytics continuam inativos. Consulte `docs/STAGING_REMOTE_VALIDATION.md`.

## Sprint 17 — Central Editorial privada

O namespace `/admin/newsroom` oferece dashboard, inbox, decisões, clusters, evidências, traduções, fontes, quarentena, runs, relatórios e pautas sob sessão server-side. Configure `NEWSROOM_ADMIN_SECRET` somente no servidor. Cookie HttpOnly, CSRF, rate limit, noindex e cache privado protegem o acesso. A interface não publica, não cria artigo e bloqueia apply completo.

## Sprint 16 — automação diária supervisionada

O pipeline privado encadeia validação, processamento, decisões, relatório e inbox com dry-run padrão, kill switches, lock, orçamentos, circuit breaker e recuperação. Use `bun run newsroom:daily -- --process-existing`, `newsroom:report`, `newsroom:inbox:list`, `newsroom:run:list` e `newsroom:stats`. Apply exige habilitação explícita; nenhuma execução publica ou aprova conteúdo.

## Sprint 15 — orquestrador editorial supervisionado

A newsroom avalia clusters por política versionada, riscos, bloqueadores e prontidão, persistindo somente recomendações privadas. Use `bun run newsroom:orchestrate`, `newsroom:decision:list`, `newsroom:decision:review`, `newsroom:decision:stats` e `newsroom:pitch:list`. Ação humana exige ator, nota e `--apply`; nenhuma avaliação cria pauta, artigo ou publicação.

## Sprint 14 — clusters, evidências e tradução assistida

A redação local agora agrupa itens já coletados, extrai claims atribuídos, monta pacotes privados de evidência e mantém fila de tradução com fixture offline. Use `bun run newsroom:cluster`, `newsroom:cluster:list`, `newsroom:evidence`, `newsroom:claims` e `newsroom:translation:list`. Toda mutação é dry-run até `--apply`; nenhuma operação publica ou chama IA/API externa.

## Piloto de fontes reais

A redação local suporta cadastro com dossiê, health check, coleta manual RSS/Atom, cache condicional, quarentena, métricas e cobertura. O catálogo piloto contém MIT News Renewable Energy e NASA Technology, ambas verificadas e saudáveis. A coleta é limitada a 20 itens por fonte; não há publicação nem agenda automática. Consulte `docs/NEWSROOM_SOURCE_CURATION.md`.

## Redação algorítmica local

O MVP de triagem editorial opera fora do bundle público, com catálogo validado, RSS/Atom, fixtures offline, normalização, deduplicação, classificação, scoring, fila e auditoria. O catálogo externo começa vazio; nenhum feed foi inventado. Consulte `docs/ALGORITHMIC_NEWSROOM.md` e execute `bun run newsroom:sources`, `newsroom:collect`, `newsroom:list`, `newsroom:score` e `newsroom:stats`. Ações mutáveis exigem `--apply` e nunca publicam artigos.

Portal editorial sobre energia, sustentabilidade, ciência, tecnologia, transição energética e desenvolvimento.

## Objetivo

Disponibilizar conteúdo técnico em português do Brasil por meio de uma aplicação web com renderização no servidor, navegação por categorias e busca local.

## Stack

- React 19 e TypeScript
- TanStack Start, TanStack Router e TanStack Query
- Vite 8
- Tailwind CSS 4
- Bun

## Requisitos

- Bun 1.3.14 ou superior
- Node 20 ou superior para o preview do worker com Wrangler
- Git

## Instalação

```bash
git clone <URL_DO_REPOSITORIO>
cd sul-global-energiaesustentabilidade
bun install
```

Copie `.env.example` para sua configuração local e ajuste apenas valores públicos quando necessário. `VITE_PUBLIC_SITE_URL` centraliza a URL usada em metadata e links absolutos.

## Execução

```bash
bun run dev
```

## Build

```bash
bun run build
```

Para visualizar o build localmente com o runtime suportado pelo Wrangler:

```bash
bun run preview
```

O preview usa Node apenas para executar Wrangler sobre `.output/server/wrangler.json`; Bun continua responsável por instalação, testes e build. O launcher recusa a substituição silenciosa do Node pelo Bun e aceita `NODE_BINARY` quando o executável não estiver no `PATH`. Execute `bun run build` antes. Builds genéricos são tratados como preview e bloqueiam indexação. Produção exige `VITE_APP_ENV=production`, URL pública explícita e demos desativadas.

## Qualidade

```bash
bun run typecheck
bun run lint
bun run test
bun run content:validate
bun run smoke:artifact
```

Crie um rascunho tipado, sempre sem publicação automática:

```bash
bun run content:new -- --type explainer --title "Título provisório" --slug titulo-provisorio --author <autor-verificado> --category energia --date YYYY-MM-DD --tag "energia solar"
```

Antes, cadastre e valide a autoria real; os autores atuais são demos. Operação diária:

```bash
bun run content:list
bun run content:review -- <slug>
bun run content:status -- <slug> review
bun run content:publish-check -- <slug>
```

`content:status` é dry-run por padrão e exige `--apply` para gravar. Consulte `docs/EDITORIAL_OPERATIONS.md` e `docs/ARTICLE_REVIEW_CHECKLIST.md`.

Onboarding e pesquisa do primeiro conteúdo real:

```bash
bun run author:new -- <slug>
bun run author:validate -- <slug>
bun run author:status -- <slug> verified --verified-at YYYY-MM-DD --verified-by <id>
bun run author:list
bun run research:status -- rascunho-como-funciona-matriz-eletrica-brasileira
bun run research:validate -- rascunho-como-funciona-matriz-eletrica-brasileira
```

Onboarding e briefing são internos e não entram no bundle. A promoção de autor e as transições editoriais são dry-run sem `--apply`. Consulte `docs/AUTHOR_ONBOARDING.md`, `docs/RESEARCH_WORKFLOW.md` e `docs/FIRST_ARTICLE_PLAN.md`.

O CI executa instalação com lockfile congelado, typecheck, lint e build em pushes e pull requests direcionados à `main`.

Os 12 artigos de exemplo são conteúdo fictício de demonstração. O piloto adicional é um draft estrutural vazio. Nenhum deles é conteúdo de lançamento; em produção permanecem ocultos.

## Estrutura do projeto

```text
docs/             documentação técnica e de produto
public/           arquivos estáticos
src/components/   componentes de interface
src/data/         conteúdo editorial simulado
src/hooks/        hooks React
src/lib/          utilitários
src/routes/       rotas file-based do TanStack Start
src/types/        tipos TypeScript
```

## Como contribuir

1. Leia `PROJECT_RULES.md`, `AGENTS.md` e os documentos relacionados em `docs/`.
2. Crie uma branch específica para a alteração.
3. Faça mudanças incrementais e não misture assuntos distintos.
4. Execute `bun run typecheck`, `bun run lint` e `bun run build`.
5. Abra um pull request com escopo, justificativa e verificações realizadas.

## Conteúdo editorial

Os artigos vivem em `content/articles/`, um arquivo MDX por slug. `scripts/generate-content.ts` valida frontmatter, taxonomia e segurança, gera um índice resumido e loaders sob demanda. Rotas e componentes consomem somente `src/content/repository.ts`.

Consulte `docs/EDITORIAL_CONTENT_WORKFLOW.md` antes de criar ou publicar conteúdo.
Os templates vivem em `content/templates/` e são excluídos do índice. Taxonomia, tipos, fontes, workflow e correções estão em `docs/EDITORIAL_STANDARDS.md`; uso de IA, em `docs/AI_EDITORIAL_POLICY.md`. Nenhum dos 12 demos foi convertido em conteúdo real.

## Publicação e SEO

Canonicals, Open Graph, Twitter Cards e JSON-LD usam a configuração central do site. O servidor entrega `/robots.txt`, `/sitemap.xml` e `/rss.xml`; páginas de autor ficam em `/autor/:slug`. Consulte `docs/PUBLISHING_SEO.md` para pré-requisitos de produção, proteção de demos e checklist de validação.

## Operação e lançamento

Ambientes, headers, preview, artefato Cloudflare, rollback e variáveis públicas estão em `docs/DEPLOYMENT.md`. Antes de qualquer implantação, use `docs/RELEASE_CHECKLIST.md` e `docs/EDITORIAL_LAUNCH_CHECKLIST.md`. Privacidade, termos e política editorial são textos iniciais sujeitos a validação jurídica; o portal ainda não foi lançado.

## Mídia, performance e acessibilidade

Capas e figuras usam um contrato editorial único e o componente responsivo `EditorialImage`, com geometria estável, `sizes`, prioridade controlada e fallback acessível. As capas demo externas continuam temporárias e não devem ser redistribuídas sem licença comprovada. O orçamento e o checklist operacional estão em `docs/PERFORMANCE_ACCESSIBILITY.md`.

## Licença

Licença a definir.

## Persistência operacional da newsroom

A newsroom usa contratos independentes do backend. Desenvolvimento preserva o
filesystem local; produção serverless foi preparada para Cloudflare D1 via
binding privado `NEWSROOM_DB`, sem recurso remoto criado. MDX e conteúdo
editorial continuam versionados no Git.

```bash
bun run storage:health
bun run storage:migrate:status
bun run storage:export
bun run storage:verify
```

Import, backup, restore e migrations são dry-run por padrão e exigem `--apply`
para mutação. Consulte `docs/NEWSROOM_STORAGE.md` e
`docs/NEWSROOM_BACKUP_RECOVERY.md`.
# Workspace Editorial de Pesquisa

A Central privada agrega os módulos científicos em `/admin/research-workspace/:scientificWorkId`, com notas e checklist exclusivamente manuais. Consulte `docs/EDITORIAL_RESEARCH_WORKSPACE.md`. Não há IA, geração editorial, publicação ou acesso remoto nesse fluxo.
