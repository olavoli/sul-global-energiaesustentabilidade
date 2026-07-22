# Changelog

## Sprint 28 — dossiê científico de evidências

- EvidenceDossier V1 rastreável, storage privado e revisão humana.
- Coleta externa, conteúdo integral, IA e publicação permanecem bloqueados.

## Sprint 26 — sinais temporais científicos

- Motor determinístico e conservador sobre a Memória Temporal.
- Cobertura separada do score editorial, confiança temporal e warnings explicáveis.
- CLI dry-run, storage privado condicionado e revisão humana na Central.

## Sprint 25 — memória temporal científica

- Projeções anuais privadas para autores, instituições, periódicos, publishers, países e categorias.
- Atualização incremental por entidades afetadas e rebuild completo com checksum equivalente.
- Contexto histórico estrutural em dossiês, auditoria dedicada e filtros na Central.

## Sprint 24 — resolução determinística de entidades

- Identidades canônicas explicáveis para autores, instituições, periódicos, editoras, categorias, países e financiadores.
- Precedência fixa de identificadores, nome normalizado e aliases, sem IA ou fuzzy matching.
- Possíveis duplicatas sempre pendentes de revisão humana; nenhum merge automático.
- Central com ações de aceitar ou ignorar e auditoria sanitizada.

## Não publicado — Sprint 23

### Adicionado

- Grafo científico V1, CLI dry-run, persistência local condicionada e Mapa Científico privado.
- Testes offline e documentação do schema, revisão, proveniência, limites e dossiê.

### Segurança

- Sem IA, PDF, texto integral, artigo, publicação, agenda, deploy, staging ou produção.

## Não publicado — Sprint 20

### Adicionado

- Worker e D1 exclusivos de staging em Cloudflare, sem domínio personalizado.
- Migration remota, seed sanitizado idempotente e smoke público/autenticado.
- Backup remoto com checksum e restore integral em banco temporário isolado.
- Validação remota de sessão, rate limit, locks, fencing, auditoria e rollback.

### Corrigido

- O entrypoint recupera do request o contexto Cloudflare anexado pelo Nitro,
  permitindo que a Central receba bindings server-only no runtime.
- A política diária padrão é empacotada no Worker; caminhos alternativos
  continuam disponíveis apenas para operação local.
- Preview exige Node real >=20 e falha explicitamente quando indisponível.

### Segurança

- Secret rotacionado sem persistência no repositório; IDs reais permanecem em
  `.wrangler/`, ignorado pelo Git.
- Produção, domínio oficial, agenda, coleta, publicação, IA, tradução externa,
  anúncios e analytics não foram ativados.

## Não publicado — Sprint 19

### Adicionado

- Template Cloudflare de staging, seed sanitizado, CLI de preparação e smoke.
- Health privado e eventos operacionais estruturados da Central.
- Testes emulados de sessão, rate limit, locks, migrations e recovery.
- Workflow manual, runbooks e checklists de staging/promoção.

### Segurança

- Staging exige D1 e URL HTTPS distintos; produção, agenda e publicação não
  foram ativadas. Nenhum ID, segredo, recurso remoto ou deploy foi criado.

## Não publicado — Sprint 18

### Adicionado

- Contratos de persistência, adaptadores local, memória, D1 e emulador D1.
- Migration versionada, import/export com manifesto e checksums, backup e restore.
- Locks com fencing, sessões e rate limit server-side, auditoria append-only e objetos privados.
- Quarenta e cinco testes de contrato cobrindo 34 requisitos da persistência.

### Segurança

- Produção recusa filesystem local e binding ausente; queries D1 são parametrizadas.
- Nenhum recurso remoto, credencial, deploy, publicação ou agenda foi ativado.

## Não publicado — Sprint 17

### Adicionado

- Central Editorial privada com login, sessão, CSRF, rate limit, dashboard e navegação responsiva.
- Camada server-side para inbox, decisões, clusters, evidências, traduções, fontes, quarentena, runs, relatórios e pautas.
- Quarenta testes locais cobrindo os 37 cenários de segurança e operação.

### Segurança

- Rotas privadas bloqueadas antes do SSR, respostas sem cache e `noindex`.
- Apply completo, publicação, artigo, credencial cliente e provider externo permanecem ausentes.

## 2026-07-15 — Sprint 16

- Pipeline diário supervisionado, modos seguros, lock, budgets, retry e circuit breaker.
- Runs, checkpoints, recovery, relatório, inbox, notificações locais, métricas e retenção.
- Workflow GitHub Actions protegido e 36 testes offline.
- Nenhuma publicação, pauta automática, artigo, IA, tradução externa ou deploy.

## 2026-07-15 — Sprint 15

- Orquestrador editorial determinístico, política versionada e readiness multidimensional.
- Matriz de riscos, bloqueadores, temas sensíveis e recomendações explicáveis.
- Fila de decisões, ações humanas e pauta estruturada sem artigo/publicação.
- CLI, métricas e 34 testes offline adicionados.

## 2026-07-15 — Sprint 14

- Clustering editorial determinístico, relações e contagem institucional independente.
- Claims atribuídos e pacotes de evidência privados.
- Fila de tradução, três providers locais/placeholder, glossário e QA com revisão humana.
- CLI para cluster, evidência, claims e tradução; auditoria ampliada.
- 34 testes offline; nenhuma coleta adicional, IA externa ou publicação.

## Sprint 12 — fontes reais e coleta controlada

- Cadastro seguro, health, ETag/Last-Modified, mudança e coleta seletiva.
- Quarentena, fila versionada com lock/backup, métricas e cobertura.
- Catálogo real vazio, fixtures offline e publicação desabilitada.

## Não publicado — Sprint 11

### Adicionado

- Autor real Olavo Oliveira, verificado por autorização do fundador e sem imagem.
- Catálogo de fontes, schemas, coletores RSS/Atom/fixture, normalização, deduplicação, classificação, scoring e fila local.
- CLI `newsroom:*`, auditoria, guardrails de copyright e testes offline determinísticos.
- Documentação de arquitetura, fontes, operações e scoring da redação algorítmica.

### Alterado

- O piloto vazio passa a usar Olavo, preservando `draft`, invisibilidade, fontes vazias e bloqueios editoriais.

### Segurança

- Coleta externa valida protocolo, DNS/IP privado, redirects, timeout, Content-Type e tamanho da resposta.

## Não publicado — Sprint 10

- Adicionado onboarding privado de autoria com validação de autorização, veracidade e credenciais opcionais.
- Adicionados comandos `author:new`, `author:validate`, `author:list` e `author:status` com dry-run.
- Adicionado briefing privado e comandos `research:status` e `research:validate`.
- Adicionados `draftStage`, gate de pesquisa para review e proteção de perfil pending.
- Expandido o piloto como scaffold sem conteúdo factual e adicionados 18 testes.

Nenhum dado pessoal, autor, credencial, fato, fonte, imagem ou artigo foi inventado ou publicado.

## Não publicado — Sprint 9

- Adicionados comandos `content:list`, `content:review`, `content:status` e `content:publish-check`.
- Formalizadas transições, autoria demo/provisória/validada e dry-run antes de qualquer escrita.
- Adicionado piloto vazio em draft, checklist por artigo e manual de operação.
- Adicionados 18 testes de transição, distribuição, autoria e coexistência com demos.

Nenhum artigo factual, fonte, autor real, credencial ou publicação foi criado.

## Não publicado — Sprint 8

### Adicionado

- Fontes estruturadas, workflow editorial completo, histórico de correções e guardrails por tipo.
- Seis templates, CLI segura de criação de drafts e validação editorial com resumo acionável.
- Página de metodologia, padrões editoriais, política de IA e plano de conteúdo para lançamento.
- Dezessete testes de fluxo editorial, sem novo framework ou dependência.

### Alterado

- Repositório publica apenas estado `published` com data não futura; demos permanecem separados.
- Sitemap e smoke incluem metodologia; artigo pode exibir fontes estruturadas, atualizações e disclosures.

Nenhuma notícia, fonte, citação ou autoria real foi inventada. Não houve publicação automática, CMS, deploy ou integração externa.

## Não publicado — Sprint 7

### Adicionado

- Matriz de ambientes, headers de segurança, CSP e proteção explícita de previews.
- Páginas iniciais de privacidade, termos e política editorial.
- Observabilidade sem fornecedor, smoke tests do worker e documentação operacional de deploy/release.

### Alterado

- Preview Wrangler passou a declarar Node como runtime; Bun permanece no restante da toolchain.
- Formulários simulados e feeds não oficiais passaram a comunicar e falhar de forma segura.

Nenhum deploy, domínio, segredo, analytics, anúncio, CMS ou persistência foi ativado.

## Não publicado — Sprint 6

### Adicionado

- Contrato editorial de mídia e componente de imagem responsiva com fallback.
- Ativo social local provisório 1200×630, breadcrumbs visíveis e disclosure patrocinado acessível.
- Estrutura publicitária desativada e 13 testes de mídia/acessibilidade.
- Inventário de imagens externas, orçamento de performance e checklist pré-publicação.

### Alterado

- Capas passaram de strings dispersas para objetos validados; dimensões desconhecidas continuam explicitamente não informadas.
- Menu móvel passou a gerenciar foco e a tipografia externa deixou de solicitar o peso Newsreader 500 sem uso comprovado.

Nenhuma publicidade, analytics, CMS ou imagem de terceiro foi incorporada ao repositório.

## Não publicado — Sprint 5

### Adicionado

- Canonicals, Open Graph, Twitter Cards e dados estruturados coerentes por tipo de página.
- Rota pública de autor e endpoints `/robots.txt`, `/sitemap.xml` e `/rss.xml`.
- Preview do artefato Nitro/Cloudflare com Wrangler e 12 testes de SEO/distribuição.

### Alterado

- Conteúdo demo continua excluído por padrão em produção e ambientes sem URL pública ficam bloqueados para indexação.
- RSS identifica material patrocinado; nenhuma rede de anúncios ou identificador fictício foi ativado.

Todas as mudanças relevantes deste projeto serão documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Adicionado

- Pipeline MDX validado por Zod, índice editorial resumido e carregamento de corpos sob demanda.
- Componentes editoriais autorizados, fontes estruturadas e guardrails de patrocínio.
- Dez testes automatizados da camada editorial e fluxo de publicação documentado.

- Fundação documental do projeto.
- Política determinística de finais de linha com Git e EditorConfig.
- Script de typecheck e workflow mínimo de CI.
- Configuração central de informações públicas e exemplo de ambiente.
- Proteção em duas camadas para conteúdo editorial fictício.

### Corrigido

- Índice de `docs/` reconciliado com a existência do frontend atual e com a distinção entre implementação e arquitetura planejada.
- Estado documental atualizado com os resultados reais de instalação, lint, build e servidor de desenvolvimento.
- Mensagens raiz de 404 e erro traduzidas para português brasileiro.
- Baseline de lint restaurada sem desabilitação global de regras.

### Alterado

- Doze artigos demonstrativos migrados de TypeScript para arquivos MDX individuais.
- Home, artigo, categoria e busca passaram a consumir uma interface única de conteúdo.

### Removido

- `src/data/articles.ts` e o utilitário de busca acoplado à fonte anterior.

## [v0.1.0]

### Adicionado

- Primeira versão conhecida do portal Sul Global.

## 2026-07-15 — Sprint 13

- Adicionados dossiê obrigatório, duas fontes reais e documentação de curadoria.
- Adicionados 26 testes de regressão e um teste de falso positivo geográfico.
- Coleta real limitada a 20 itens por fonte.
- Fonte empresarial recebe penalidade promocional explícita.
- `Asia` exige limite de palavra na classificação.
