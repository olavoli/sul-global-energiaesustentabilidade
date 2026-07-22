# ARCHITECTURE.md — Sul Global

## Evidências científicas privadas

`scripts/scientific-evidence/` usa o adapter de storage, documentos segmentados e API administrativa server-side. Dados operacionais não são importados pelo portal público.

## Scientific Trend Engine

Camada server-side privada: Memória Temporal → elegibilidade → métricas → cobertura → confiança → warnings → sinal → revisão humana. O storage operacional permanece sob `newsroom/storage/`, fora do bundle público.

## Extensão privada — Grafo Científico

O Radar fornece trabalho e dossiê scaffold. O builder consulta metadados oficiais e mantém a saída em memória no dry-run. Após autorização, uma transação grava `scientific-graph/graphs` e somente IDs estruturais no dossiê. Nada entra no repositório público de conteúdo.

## Staging Cloudflare

O template de staging aponta o worker para `.output/server/index.mjs`, assets
para `.output/public` e D1 para o binding server-only `NEWSROOM_DB`. O ID real
fica somente em configuração gerada ignorada. Staging e produção não
compartilham URL, banco ou segredo; ausência de D1 fecha a Central sem afetar o
portal. Seed, migration e recovery são validados primeiro no emulador.

O staging remoto autorizado usa o Worker `sul-global-staging` e o D1 exclusivo
`sul-global-newsroom-staging`. Nitro anexa `env` e `context` ao `Request` antes
de delegar ao serviço SSR; `src/server.ts` resolve esse contexto para configurar
a Central sem estado global. A política diária padrão é empacotada
estaticamente, pois filesystem não existe no runtime Worker.

## Central Editorial privada

`src/server.ts` intercepta `/admin` e `/api/admin` antes do SSR. A autenticação server-only libera uma API privada que lê `newsroom/` por serviços existentes; componentes React recebem apenas respostas autorizadas e nunca importam arquivos operacionais. O portal público continua independente. A persistência por filesystem é adequada ao MVP local, não a workers multi-instância.

## Automação da newsroom

`scripts/newsroom/daily-pipeline.ts` coordena serviços especializados de coleta, processamento, relatório e estado. Runs/checkpoints, circuitos, inbox e relatórios ficam em `newsroom/`; o aplicativo em `src/` não os importa. Scheduler é adapter externo e não concede permissão editorial.

## Orquestração privada

`clusters/evidence/translations + policy → decisions → human action → pitches` é uma cadeia privada. Cada seta preserva IDs, versões, fingerprint e histórico. O avaliador é puro; persistência é explícita, atômica e bloqueada contra concorrência. Não existe dependência de `src/` para `newsroom/`.

## Camada privada de inteligência editorial

`queue.json → clusters.json → claims.json/evidence-packages.json → translations.json` é um fluxo unidirecional fora de `src/` e `public/`. Schemas versionados, escrita temporária com rename, backup e lock protegem as mutações. O clusterer e o provider fixture são funções locais determinísticas; nenhum módulo do site importa estado operacional.

## Camada operacional da redação

`newsroom/` mantém catálogo, runtime, fila, quarentena e auditoria fora do bundle. A CLI controla seleção/dry-run; transporte lê somente RSS/Atom; fila usa versão, lock, backup e escrita atômica. Nenhuma matéria é buscada.

## Fluxo de conteúdo real (Sprint 8)

`content/articles/` continua sendo a única entrada indexada. `content/templates/` contém modelos deliberadamente excluídos. `scripts/new-content.ts` cria arquivos com exclusividade (`wx`) e status `draft`; `scripts/generate-content.ts` valida schema, referências cruzadas e segurança antes de gerar metadata/loaders.

O workflow é metadata no Git: `draft → review → approved → published`, com `scheduled`, `archived` e `correction-needed` fora da distribuição. Não há usuários, CMS, painel ou aprovação automática. Conteúdo real publicado exige `approvedAt`, data não futura, requisitos do tipo, fonte estruturada quando aplicável e mídia licenciada. O repositório é a fronteira que expõe somente registros publicáveis.

Fontes, correções e disclosures integram o índice tipado; o corpo MDX permanece carregado sob demanda. `/metodologia` é SSR e integra sitemap. A arquitetura não gera artigos nem conecta IA; apenas registra disclosure de eventual uso humano de ferramentas.

## Produção e operação (Sprint 7)

`environmentConfig` centraliza development, test, preview, staging e production. Um build genérico é preview; somente `VITE_APP_ENV=production`, URL pública explícita e demos bloqueadas habilitam indexação. Configurações públicas usam `VITE_*` e nunca carregam segredo.

`src/server.ts` envolve SSR e endpoints com headers uniformes. A CSP bloqueia objetos e frames, não usa `unsafe-eval` e autoriza temporariamente Google Fonts e imagens Unsplash. Inline script/style permanece por compatibilidade documentada com hidratação e estilos atuais. `ObservabilityReporter` separa captura de erros do fornecedor; o padrão não envia dados externamente.

O build continua `cloudflare-module`. Bun gera e testa; Node executa Wrangler sobre `.output/server/wrangler.json`. Smoke tests importam o entrypoint compilado sem rede externa e deixam um rebuild final não indexável, com demos bloqueadas.

## Mídia e acessibilidade (Sprint 6)

`editorialImageSchema` é o contrato único para capas e figuras. `EditorialImage` recebe esse objeto, reserva proporção, aplica `sizes`, usa variantes somente quando fornecidas e troca falhas por fallback acessível sem divergência de SSR. As capas demo externas continuam na fonte apenas como transição; a estrutura local futura é `public/images/articles/<slug>/`.

`advertisingConfig.enabled` permanece `false`. `AdSlot` não é montado nas páginas e retorna `null` quando desativado; não há rede, ID ou script. Breadcrumbs visíveis, disclosure patrocinado e menu com contenção/retorno de foco integram a camada de apresentação.

## Publicação e distribuição (Sprint 5)

`siteConfig` normaliza a origem pública e sinaliza se o ambiente pode ser indexado. `src/lib/seo.ts` deriva canonicals, metadados sociais e JSON-LD dessa origem. `src/lib/distribution.ts` gera robots, sitemap e RSS a partir do mesmo repositório que alimenta as rotas; `src/server.ts` intercepta esses caminhos antes do SSR.

O build Nitro produz um worker `cloudflare-module` em `.output/server/`. O preview oficial desta base usa Wrangler e o manifesto `.output/server/wrangler.json`, preservando o comportamento do artefato implantável.

## Stack (fase 1 — MVP)

- **React 19 + TypeScript** — UI.
- **TanStack Start + TanStack Router** — file-based routing com SSR nativo.
- **Vite 8** — build.
- **Tailwind CSS v4** — estilo, tokens em `src/styles.css`.
- **MDX no repositório** — fonte de conteúdo (artigos e autores).
- **Lovable Cloud (Supabase gerenciado)** — apenas para a tabela de
  assinantes de newsletter. Nenhum outro backend nesta fase.
- **Hospedagem** — Vercel (ou hosting Lovable). Edge/Worker compatível.
- **GitHub** — versionamento e fluxo de PR.

## Stack (fase 2 e além)

- Supabase para artigos, autores, categorias, assinantes premium, área de
  membros.
- Google Ad Manager, patrocínios estruturados, conteúdo patrocinado.
- API pública de dados de energia (fase 4).

## Estrutura de pastas

```text
sul-global/
├── docs/                     # documentos-constituição
├── content/
│   ├── artigos/              # um .mdx por artigo
│   ├── autores/              # perfis
│   └── categorias.json       # taxonomia fixa
├── public/                   # favicon, robots.txt, sitemap.xml, og estático
├── src/
│   ├── routes/               # TanStack file-based routing
│   │   ├── __root.tsx
│   │   ├── index.tsx
│   │   ├── categoria.$slug.tsx
│   │   ├── artigo.$slug.tsx
│   │   ├── autor.$slug.tsx
│   │   ├── sobre.tsx
│   │   ├── newsletter.tsx
│   │   ├── contato.tsx
│   │   └── busca.tsx
│   ├── components/
│   │   ├── layout/           # SiteHeader, SiteFooter, Container, SectionTitle
│   │   ├── editorial/        # ArticleCard, HeroStory, CategoryStrip, ...
│   │   ├── ads/              # AdSlot (placeholder)
│   │   ├── newsletter/       # NewsletterForm, NewsletterCTA
│   │   └── ui/               # shadcn base — só o que for usado
│   ├── content-lib/          # parse/leitura de MDX + frontmatter + índice
│   ├── lib/                  # utils genéricos
│   ├── hooks/
│   └── styles.css
└── PROJECT_RULES.md
```

## Decisões técnicas

### SSR obrigatório em rotas públicas

Toda rota que serve conteúdo deve renderizar server-side. Nenhum artigo pode
depender de `useEffect + fetch` para aparecer. Loaders usam
`context.queryClient.ensureQueryData(queryOptions)`; componentes leem com
`useSuspenseQuery(queryOptions)`.

### Metadata por rota

Cada `createFileRoute` define seu próprio `head()` com `title`, `description`,
`og:title`, `og:description`. `og:image` **só em leaf routes** (nunca no
`__root.tsx` ou em layouts).

### Conteúdo em MDX (fase 1)

- Um arquivo por artigo em `content/artigos/<slug>.mdx`.
- Frontmatter validado por Zod (schema em `docs/CONTENT_MODEL.md`).
- Índice construído em build time, lido via server function no loader.
- Vantagens: zero backend, versionamento nativo, deploy atômico, SEO ótimo.
- Limite prático: ~500 artigos. Depois, migrar para Supabase.

Implementação atual: `scripts/generate-content.ts` valida `content/articles/`, gera um índice somente com metadata e um mapa de imports dinâmicos. `src/content/repository.ts` é a interface consumida por listagens e busca. O corpo é compilado pelo plugin MDX e carregado apenas na rota correspondente.

O subconjunto editorial não aceita imports, exports, expressões JavaScript ou HTML arbitrário. Componentes JSX exigem whitelist explícita.

### Navegação

- Sempre `<Link>` do `@tanstack/react-router`. Nunca `<a href>` para rotas
  internas.
- Sem hash anchors como navegação principal entre seções.

### Imagens

- `EditorialImage` com loading, `sizes`, fallback e geometria estável.
- `srcset` somente quando o contrato fornecer variantes reais.
- Capas desejadas: 1200×630; dimensões não podem ser inventadas.
- Sempre `alt` descritivo, salvo decoração explicitamente marcada.

### Backend mínimo (Lovable Cloud)

Fase 1 tem exatamente uma tabela: `subscribers`.

- `id uuid`, `email text unique`, `created_at timestamptz`.
- RLS habilitado. Policy: `INSERT` público (via anon key), `SELECT` só
  `service_role`.
- Sem PII sensível, sem senhas, sem sessão.

### SEO técnico

- `public/robots.txt` liberado.
- `sitemap.xml` gerado dinamicamente em rota TanStack.
- Feed RSS gerado no build.
- JSON-LD (`Article`, `Organization`) via `head().scripts`.

### Monetização (reservada, inativa no MVP)

- Componente `AdSlot` reserva o espaço físico, mas não injeta script.
- Ativação (AdSense → Ad Manager) depende de tráfego mínimo e decisão
  editorial.

## Integrações

| Integração         | Fase | Uso                        |
| ------------------ | ---- | -------------------------- |
| Lovable Cloud      | 1    | Newsletter (`subscribers`) |
| Google Analytics 4 | 2    | Métricas de audiência      |
| AdSense            | 2    | Anúncios simples           |
| Ad Manager         | 3    | Campanhas e patrocínios    |
| Supabase (full)    | 3    | CMS, membros, premium      |
| Stripe             | 3    | Assinatura premium         |

## O que não usar

- WordPress, Blogger, Firebase.
- React Router DOM (usar TanStack Router).
- `useEffect + fetch` para render inicial.
- CSS-in-JS runtime (usar Tailwind).
- Lodash inteiro, moment.js, jQuery.
- Qualquer lib > 30kb sem justificativa.

## Redação algorítmica operacional

O subsistema de triagem reside em `scripts/newsroom/` e seus dados em `newsroom/`. Essa direção de dependência impede que catálogo, fila, rejeições, auditoria e briefings entrem no bundle público. O aplicativo continua consumindo apenas o repositório editorial gerado.

O pipeline usa adaptadores `SourceCollector`, normaliza para um schema comum e encaminha inválidos para rejeição. Deduplicação, classificação e scoring são funções puras e testáveis. Escritas da CLI são explícitas, locais e auditáveis; aprovação não atravessa o gate de conteúdo publicado.

Não foi adicionada dependência: o parser limitado atende RSS/Atom de metadados, e segurança usa APIs nativas. Scraping, tradução, IA, banco externo e publicação permanecem em fronteiras não implementadas.

## Gate de evidência

`source:add` carrega o dossiê indicado por `evidenceId` e valida decisão `confirmed`, titularidade, URL exata, domínio oficial, termos, copyright e rejeição de sitemap/tentativa. Catálogo, runtime, fila e auditoria ficam em `newsroom/`, fora do bundle público. Mudança de URL exige nova evidência.

## Persistência durável

O domínio operacional depende de `StorageAdapter`, não de paths. O adapter local
preserva os JSON existentes; D1 atende produção por binding server-only com
documentos versionados, tabelas especializadas e transações. A Central, CLI e
automação compartilham a mesma fronteira. O portal público e o MDX permanecem
independentes, portanto indisponibilidade da newsroom não derruba conteúdo.
# Read model de pesquisa

O servidor administrativo compõe um read model por `scientificWorkId` a partir dos stores científicos existentes. Cada loader é isolado, de modo que um módulo ausente resulte em estado parcial. Somente notas e checklist possuem escrita, sempre pelo endpoint administrativo com CSRF.
