# Inventário técnico

## Sprint 28

- `scripts/scientific-evidence/`: contratos, scaffold, readiness, checksum, storage, revisão e testes.
- `scripts/scientific-evidence-cli.ts`: comandos locais dry-run.
- `src/components/admin/AdminScientificEvidence.tsx`: dossiês privados.
- Storage ignorado: `newsroom/storage/scientific-evidence/`.

## Sprint 26

- `scripts/scientific-trends/`: contratos, política, métricas, cobertura, sinais, pipeline, revisão e testes.
- `newsroom/policies/scientific-trends.json`: thresholds conservadores versionados.
- `src/components/admin/AdminScientificTrends.tsx`: leitura e filtros privados.
- Storage ignorado: `newsroom/storage/scientific-trends/`.

## Sprint 25

- `scripts/scientific-memory/`: contratos, snapshots, projeção, engine, storage, checksum, dossiês, auditoria e testes.
- `scripts/scientific-memory-cli.ts`: update, rebuild e stats locais.
- `src/components/admin/AdminScientificMemory.tsx`: filtros e tabela temporal privada.
- Storage ignorado: `newsroom/storage/scientific-memory/`.

## Sprint 23

- `scripts/scientific-graph/`: contratos, fontes, builder, store, revisão e testes.
- `scripts/scientific-graph-cli.ts`: plan/build/show/list/review/stats.
- `src/components/admin/AdminScientificGraph.tsx`: tabela privada.
- Storage reservado: `scientific-graph/graphs`, fora do bundle público.

## Staging remoto

- `cloudflare/wrangler.staging.template.jsonc`: manifesto exclusivo de staging,
  com placeholder D1 e kill switches fechados.
- `scripts/staging*.ts` e `scripts/staging/`: validação, plano instrucional,
  migrations/seed/recovery emulados, geração SQL sanitizada e smoke remoto.
- `scripts/preview-worker.ts`: launcher que exige Node >=20 para o Wrangler,
  impedindo que Bun seja interpretado como Node no preview.
- `newsroom/staging/seed.v1.json`: fixtures privadas, fontes inativas e zero
  segredo/sessão/artigo.
- `.github/workflows/staging-readiness.yml`: dispatch manual, environment
  protegido e deploy de staging condicionado a autorização literal.
- `src/server.ts`: recupera o contexto Cloudflare anexado pelo Nitro ao request
  antes de configurar D1; `automation-config.ts` empacota a política padrão.
- Recursos ativos: Worker `sul-global-staging`, D1
  `sul-global-newsroom-staging` e um secret server-only. O D1 temporário de
  restore foi excluído após a comparação. Dependências novas: nenhuma.

## Central Editorial privada

- `src/lib/admin/`: autenticação, rate limit, contratos Zod, dados, ações e handler HTTP;
- `src/components/admin/`: shell, dashboard, tabelas, estados, detalhes e confirmações;
- `src/routes/admin.*`: login, visão geral, seções e detalhes;
- `NEWSROOM_ADMIN_SECRET`: segredo server-only, sem valor versionado;
- nenhuma dependência nova; Web Crypto, fetch, React e Zod existentes foram reutilizados;
- dados operacionais são carregados apenas pelo handler do servidor e nunca por import cliente.

## Sprint 16

- `scripts/newsroom/{daily-*,automation-*,run-store,retry-circuit,review-inbox,notifications,retention}.ts`: automação privada e modular.
- `newsroom/policies/daily-automation.json`: budgets, circuito, lock e retenção versionados.
- `newsroom/{runs,reports,inbox,notifications}/`: estado operacional fora do bundle.
- `.github/workflows/newsroom-daily.yml`: dispatch/cron protegido, sem deploy ou escrita Git.
- Dependências novas: nenhuma.

## Sprint 15

- `newsroom/policies/editorial-policy.json`: política executável v1.
- `scripts/newsroom/orchestrator*.ts`, `editorial-readiness.ts` e `decision-*.ts`: avaliação, risco, prontidão, fila e ações.
- `scripts/newsroom/pitch.ts`: pauta estrutural condicionada, sem MDX.
- `newsroom/decisions/index.json`: 30 decisões privadas; `newsroom/pitches/` permanece vazio.
- Nenhuma dependência nova ou importação pelo aplicativo público.

## Sprint 14

- `scripts/newsroom/{story-schema,clustering,cluster-mutations,evidence-packages,story-store}.ts`: clusters, claims, evidências e persistência.
- `scripts/newsroom/{translation-schema,translation-providers,translation-quality,translation}.ts`: fila e QA local.
- `newsroom/{clusters,claims,evidence-packages,translations}.json`: documentos operacionais privados, versionados e atômicos quando presentes.
- `newsroom/glossary.pt-BR.json`: glossário técnico v1.
- Nenhuma dependência nova e nenhuma importação por `src/` ou `public/`.

## Redação: piloto de fontes reais

- Transporte HTTP limitado, condicional e protegido contra SSRF/redirects.
- Catálogo, runtime, fila, quarentena e auditoria ficam fora do bundle público.
- Coleta manual RSS/Atom nunca busca URLs de matérias.
- Métricas, cobertura e frescor são explicáveis.
- Catálogo real vazio; dependências novas: nenhuma.

## Redação algorítmica — Sprint 11

- **CONFIRMADO:** `scripts/newsroom/` contém schemas, coletores RSS/Atom/fixture, segurança, normalização, deduplicação, classificação, scoring, pipeline e fila.
- **CONFIRMADO:** `newsroom/` armazena catálogo, fixtures e estado operacional fora de `src/` e `public/`.
- **CONFIRMADO:** catálogo externo inicial vazio; nenhuma URL de feed real foi criada.
- **CONFIRMADO:** Zod, APIs nativas de URL/fetch/crypto/DNS e YAML existente foram suficientes; nenhuma dependência foi adicionada.
- **CONFIRMADO:** snippets são limitados a 500 caracteres e não há download de imagens, scraping ou texto integral.
- **LIMITAÇÃO:** similaridade lexical e regras temáticas exigem revisão humana; não comprovam equivalência ou veracidade.

## Autoria e pesquisa — Sprint 10

- `content/authors.json`: somente campos públicos dos perfis; nenhum dado sensível.
- `content/templates/author-onboarding.yml` e `scripts/author-operations.ts`: onboarding, validação, listagem e promoção explícita.
- `content/research/*.yml` e `scripts/research-operations.ts`: briefing privado e gate de prontidão para redação.
- `src/content/schema.ts`: estados de autor, verificação temporal e estágio do draft.
- `src/content/author-research-operations.test.ts`: 18 cenários de autoria, privacidade, pesquisa e bundle.
- `docs/AUTHOR_ONBOARDING.md`, `RESEARCH_WORKFLOW.md` e `FIRST_ARTICLE_PLAN.md`: operação humana.

Onboarding e pesquisa não são importados pela aplicação. Nenhum autor, credencial, fonte, fato ou mídia real foi criado.

## Operação editorial — Sprint 9

- `scripts/editorial-operations.ts`: list, review, status dry-run/apply e publish-check.
- `content/articles/rascunho-como-funciona-matriz-eletrica-brasileira.mdx`: piloto estrutural draft.
- `content/authors.json` e `src/data/authors.ts`: cinco identidades demo e um marcador pending; zero autores reais verificados.
- `src/content/editorial-operations.test.ts`: 18 cenários operacionais.
- `docs/EDITORIAL_OPERATIONS.md` e `ARTICLE_REVIEW_CHECKLIST.md`: rotina do fundador e gate por artigo.

Nenhum backend, CMS, dependência, credencial, fato, fonte ou publicação foi adicionado.

## Preparação de conteúdo real — Sprint 8

- `src/content/schema.ts`: estados completos, fontes estruturadas, aprovação, agendamento, correções, opinião, entrevista e disclosure de IA.
- `src/content/taxonomy.ts`: normalização e equivalências conhecidas de tags, sem mudar slugs existentes.
- `content/templates/`: seis templates editoriais fora do índice público.
- `scripts/new-content.ts`: CLI multiplataforma que cria somente drafts e rejeita sobrescrita.
- `src/routes/metodologia.tsx`: metodologia pública SSR com canonical e metadata.
- `src/content/editorial-workflow.test.ts`: 17 guardrails adicionais.
- `docs/EDITORIAL_STANDARDS.md`, `AI_EDITORIAL_POLICY.md` e `LAUNCH_CONTENT_PLAN.md`: operação editorial sem conteúdo inventado.

Os 12 MDX existentes continuam demonstrativos. Nenhum CMS, usuário, autenticação, provedor, dependência ou conteúdo real foi adicionado.

## Atualização de produção e operação — Sprint 7

- `src/config/environment.ts`: matriz tipada e fail-safe de ambiente, URL, demos e indexação.
- `src/lib/security-headers.ts`: CSP e headers de defesa aplicados pelo wrapper SSR.
- `src/lib/observability.ts`: interface local de erro, warning e métrica, sem envio externo.
- `src/routes/{privacidade,termos,politica-editorial}.tsx`: páginas legais iniciais.
- `scripts/smoke-worker.ts` e `scripts/run-smoke.ts`: smoke do artefato com rebuild seguro.
- `docs/DEPLOYMENT.md` e checklists: operação, release e lançamento editorial.

Node `>=20` é requisito explícito somente para Wrangler. Não foram adicionadas dependências, provedor, token, domínio, analytics ou publicidade.

## Atualização de performance e acessibilidade — Sprint 6

- `src/content/schema.ts`: contrato `EditorialImage` com alt, dimensões pareadas, crédito, origem, licença, foco, loading e variantes.
- `src/components/media/EditorialImage.tsx`: renderização responsiva, geometria estável, prioridade seletiva e fallback.
- `public/images/social/sul-global-editorial-placeholder.svg`: ativo local provisório 1200×630.
- `src/components/navigation/EditorialBreadcrumb.tsx`: breadcrumb semântico reutilizável.
- `src/components/ads/AdSlot.tsx` e `src/config/advertising.ts`: preparação publicitária inativa.
- `src/components/media/media-accessibility.test.tsx`: 13 testes, sem dependência nova.

As 12 capas permanecem externas, demonstrativas, sem dimensões/licença comprovadas e listadas para substituição. Não foram copiadas nem baixadas.

## Atualização de publicação — Sprint 5

- `src/lib/seo.ts`: URL absoluta central, metadados sociais e schemas Organization, WebSite, Article/NewsArticle, BreadcrumbList e Person.
- `src/lib/distribution.ts`: geradores puros de `robots.txt`, sitemap XML e RSS 2.0.
- `src/server.ts`: entrega os três endpoints antes do handler SSR.
- `src/routes/autor.$slug.tsx`: página pública de autor.
- `package.json`: preview do build Cloudflare via Wrangler e `.output/server/wrangler.json`.
- `src/lib/seo.test.ts`: 12 testes automatizados de SEO e distribuição.

O fallback visual social é um SVG local provisório 1200×630 e deve ser validado pelo fundador antes do lançamento. Não existem analytics, scripts publicitários ou `ads.txt` ativos.

## Atualização editorial — Sprint 4

- **CONFIRMADO:** `content/articles/` contém 12 artigos MDX; `src/data/` centraliza autores e categorias.
- **CONFIRMADO:** `src/content/` contém schema Zod, repositório, testes e manifestos gerados.
- **CONFIRMADO:** `scripts/generate-content.ts` valida frontmatter, referências, slugs únicos e o subconjunto MDX seguro.
- **CONFIRMADO:** imports, exports, expressões JavaScript e componentes fora da whitelist são rejeitados.
- **CONFIRMADO:** listagens usam somente metadata; cada corpo MDX é emitido em chunk próprio.
- **CONFIRMADO:** `src/data/articles.ts` foi removido; não existe fonte concorrente de artigos.
- **CONFIRMADO:** Bun fornece o runner dos 10 testes sem framework adicional.
- **DEPENDÊNCIAS:** `@mdx-js/rollup`, `remark-frontmatter` e `yaml` atendem ao pipeline; `@types/bun` tipa o runner nativo.

Levantamento estático do repositório na Sprint 1. “CONFIRMADO” identifica evidência direta no código; “POSSIVELMENTE” exige validação adicional antes de qualquer ação.

## Estrutura

- **CONFIRMADO:** `src/routes/` contém as rotas file-based e o layout raiz.
- **CONFIRMADO:** `src/components/` separa componentes de artigo, home, layout, navegação, newsletter e UI genérica.
- **CONFIRMADO:** `content/articles/` contém artigos MDX; `src/data/` contém autores e categorias em TypeScript.
- **CONFIRMADO:** `src/lib/` contém busca, formatação, classes CSS e tratamento de erros.
- **CONFIRMADO:** `src/hooks/` contém hooks de tema e detecção de viewport móvel.
- **CONFIRMADO:** `src/types/` contém os contratos do conteúdo editorial.
- **CONFIRMADO:** `docs/` contém visão, arquitetura, modelo de conteúdo, design system, regras e roadmap.
- **CONFIRMADO:** `public/` contém `favicon.ico` e o placeholder social local.
- **CONFIRMADO:** existe `content/articles/` com 12 arquivos MDX; não existe CMS conectado.

## Componentes em uso confirmado

- Layout: `Container`, `Logo`, `MobileMenu`, `SiteFooter`, `SiteHeader`, `SkipLink`, `ThemeToggle`.
- Home: `HeroStory`, `InPauta`, `SecondaryHighlights`, `SectionTitle`.
- Artigo: `ArticleBody`, `ArticleCard`, `Byline`, `CategoryTag`, `ShareBar`.
- Newsletter: `NewsletterCTA`.

## Dependências

### Uso confirmado pelo código alcançável da aplicação

- React e React DOM.
- TanStack Start, Router, Query e Zod Adapter.
- Zod.
- Tailwind CSS, `@tailwindcss/vite`, `clsx` e `tailwind-merge`.
- Lucide React.
- Configuração Vite do Lovable e plugins de build declarados.

### Possivelmente não utilizadas pela aplicação atual

Os pacotes abaixo aparecem em componentes genéricos de `src/components/ui/`, mas esses componentes não são importados pelas rotas ou pelos componentes principais atuais:

- Pacotes `@radix-ui/react-*`.
- `class-variance-authority`.
- `cmdk`.
- `embla-carousel-react`.
- `input-otp`.
- `react-day-picker`.
- `react-hook-form` e `@hookform/resolvers`.
- `react-resizable-panels`.
- `recharts`.
- `sonner`.
- `vaul`.

Também não foram encontradas importações no código-fonte para:

- **POSSIVELMENTE:** `date-fns`.
- **POSSIVELMENTE:** `tw-animate-css`.

Nenhuma dependência foi removida. A confirmação exige análise do build, geração de código e uso futuro planejado.

## Arquivos e conjuntos possivelmente não utilizados

- **POSSIVELMENTE:** todos os arquivos em `src/components/ui/`; não há importação deles a partir das rotas ou dos componentes principais. Alguns importam outros arquivos do mesmo conjunto.
- **POSSIVELMENTE:** `src/hooks/use-mobile.tsx`; é referenciado apenas por `src/components/ui/sidebar.tsx`, que também não está ligado ao fluxo atual.
- **CONFIRMADO:** `src/routeTree.gen.ts` é arquivo gerado e utilizado por `src/router.tsx`; não é órfão.
- **CONFIRMADO:** `src/start.ts`, `src/server.ts` e os utilitários de erro participam da inicialização e do tratamento SSR configurado em `vite.config.ts`.
- **CONFIRMADO:** `src/routes/README.md` é documentação específica das convenções de rota.

## Arquivos órfãos

- **CONFIRMADO:** nenhum arquivo de aplicação foi classificado como órfão com segurança apenas pela análise estática.
- **POSSIVELMENTE:** o conjunto `src/components/ui/` é scaffolding não conectado à aplicação atual.

## Conteúdo e comportamento

- **CONFIRMADO:** 12 artigos demonstrativos com status `published` estão em `content/articles/*.mdx`.
- **CONFIRMADO:** 5 autores demo e 1 marcador pending estão definidos em `content/authors.json`; `src/data/authors.ts` expõe somente o modelo público validado.
- **CONFIRMADO:** 6 categorias estão definidas em `src/data/categories.ts`.
- **CONFIRMADO:** newsletter e contato não enviam nem persistem dados.
- **CONFIRMADO:** a busca é executada localmente sobre os artigos publicados.
- **CONFIRMADO:** não há integração de Supabase, Lovable Cloud, analytics, anúncios ou e-mail no código atual.

## Arquivos de configuração

- `package.json` — scripts e dependências.
- `bun.lock` e `bunfig.toml` — resolução e política de instalação do Bun.
- `tsconfig.json` — TypeScript estrito e alias `@/*`.
- `vite.config.ts` — configuração TanStack Start fornecida pelo Lovable e entrada SSR customizada.
- `eslint.config.js` — lint para TypeScript, React Hooks e Prettier.
- `components.json` — configuração do gerador de componentes.

## Validação do ambiente

- **CONFIRMADO:** Bun 1.3.14 instala as dependências registradas sem modificar `bun.lock`.
- **CONFIRMADO:** o build de produção conclui as etapas de cliente, SSR e Nitro com Vite 8.0.16.
- **CONFIRMADO:** lint e typecheck passam no estado atual.
- **CONFIRMADO:** `.gitattributes`, `.editorconfig` e Prettier definem LF para texto versionado.
- **CONFIRMADO:** seis padrões legítimos de export do scaffolding shadcn possuem exceções locais documentadas para React Refresh.
- **CONFIRMADO:** `package.json` define testes Bun e smoke tests do worker compilado.
- **CONFIRMADO:** `bun run dev` iniciou e respondeu com HTTP 200 em `http://127.0.0.1:8080/`; os processos criados pela validação foram encerrados.

## Configuração pública e proteção editorial

- **CONFIRMADO:** `src/config/site.ts` centraliza nome, descrição, URL, locale, idioma e imagem social.
- **CONFIRMADO:** `.env.example` documenta somente `VITE_PUBLIC_SITE_URL` e `VITE_ALLOW_DEMO_CONTENT`, sem segredos.
- **CONFIRMADO:** os 12 artigos são marcados com `isDemo: true` por construção.
- **CONFIRMADO:** desenvolvimento permite demos com aviso visual; produção os oculta por padrão e exige opt-in explícito para uma implantação demonstrativa.
- **LIMITAÇÃO:** as strings demo ainda são incluídas no bundle; a separação física depende da futura arquitetura de conteúdo.

## Curadoria de fontes públicas

- `scripts/newsroom/evidence.ts`: schema e gate de evidência para ativação.
- `newsroom/sources/evidence/`: oito dossiês de pesquisa pública.
- `newsroom/sources/curated/`: entradas usadas pelo comando transacional.
- `newsroom/sources/catalog.json`: duas fontes reais ativas.
- `newsroom/queue.json`: estado local fora do bundle público.
- Nenhuma dependência foi adicionada.

## Persistência operacional

- `scripts/newsroom/storage/contracts.ts`: contratos e tipos neutros.
- `local-adapter.ts`: arquivos legados, escrita atômica, backup e validação.
- `d1-adapter.ts`: backend serverless estruturado por binding privado.
- `d1-emulator.ts` e `memory-adapter.ts`: testes offline.
- `migrations.ts` e `0001_newsroom_core.sql`: schema versionado.
- `snapshot.ts`: manifesto, checksums, documentos, auditoria e objetos.
- `scripts/storage-cli.ts`: health, migrations, import/export, backup/restore.
- `NEWSROOM_STORAGE_DRIVER`: `local`, `memory` ou `d1`; produção aceita apenas
  backend durável configurado.
- Nenhuma dependência, conta, banco, token ou binding real foi adicionado.
# Workspace de pesquisa

- `scripts/research-workspace/`: contratos, agregação, busca, sanitização, notas e checklist.
- `src/components/admin/AdminResearchWorkspace.tsx`: UI privada em abas.
- storage privado: `research-workspace/notes` e `research-workspace/checklists`.
