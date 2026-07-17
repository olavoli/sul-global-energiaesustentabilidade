# Status de implementação

## Sprint 19 — preparada localmente

- [x] Configuração formal de staging, D1 e kill switches com placeholders.
- [x] Seed sanitizado, migration idempotente e backup/restore no emulador.
- [x] Sessão, rate limit, lock e Central validados sobre adapter D1 emulado.
- [x] Smoke remoto configurável e health privado sem exposição de infraestrutura.
- [x] Workflow manual protegido, rollback e checklists.
- [ ] Worker, D1, binding, secret e smoke remotos aguardam autorização/configuração.
- [ ] Produção permanece inativa e intocada.

## Sprint 17 — implementada localmente

- Central Editorial privada em `/admin/newsroom`, separada do portal e bloqueada antes do SSR.
- Sessão HMAC, cookie HttpOnly, CSRF, expiração, logout, rate limit e erros sanitizados.
- Dashboard, inbox, decisões, clusters/evidências, traduções, fontes, quarentena, runs, relatórios e pautas.
- Ações humanas reutilizam serviços de domínio; apply completo, publicação e criação de artigo não existem.
- Persistência operacional em filesystem continua local; produção sem segredo bloqueia a Central.

## Sprint 16 — implementada localmente

- Pipeline diário de 17 estágios, sete modos, checkpoints, recovery e relatório privado.
- Kill switches fail-safe, lock global expirável, orçamentos, retries e circuit breaker por fonte.
- Inbox supervisionada, providers locais/desativado, métricas e retenção dry-run.
- GitHub Actions protegido; nenhuma agenda apply, publicação ou persistência por commit.

## Sprint 15 — implementada localmente

- Política editorial executável, matriz de 13 riscos, bloqueadores e prontidão multidimensional.
- Decisão determinística/idempotente com fingerprint, razões, ações e histórico.
- Fila privada de decisões; revisão humana obrigatória; pauta condicionada a aprovação explícita.
- Métricas somente observacionais e proteção de temas sensíveis.
- Amostra: 30 decisões, nenhuma ação humana e nenhuma pauta automática.

## Sprint 14 — implementada localmente

- `StoryCluster`, relações, fonte primária candidata, claims e `EvidencePackage` possuem schemas versionados.
- Clustering determinístico em camadas evita agrupar por tema genérico e distingue instituições.
- Tradução usa fixture, passthrough ou placeholder externo desabilitado; QA e aprovação humana são obrigatórios.
- Dados ficam em `newsroom/`, fora do bundle. Não há geração, tradução integral, aprovação editorial ou publicação automática.
- 34 testes específicos são offline e determinísticos.

## Sprint 12 — fontes reais controladas

- [x] Cadastro dry-run/apply com evidência, unicidade e HTTPS.
- [x] Health, cache condicional, frescor, quarentena, métricas e cobertura.
- [x] Coleta real somente manual e explicitamente selecionada.
- [ ] Primeira fonte real depende de URL e evidência fornecidas.
- [ ] Agenda diária continua fora do escopo.

## Atualização da Sprint 11

- [x] Olavo Oliveira cadastrado como autor real `verified`, sem imagem e somente com dados autorizados.
- [x] Artigo piloto atribuído a Olavo, ainda `draft`, invisível, sem fontes e sem conteúdo factual.
- [x] Catálogo externo vazio e validado; fixtures RSS/Atom locais funcionam offline.
- [x] Normalização, rejeição auditável, deduplicação, classificação e scoring determinísticos.
- [x] Fila local, CLI dry-run, briefing não publicável e trilha de auditoria implementados.
- [x] Proteções de SSRF, timeout, redirects, tamanho, copyright e atribuição implementadas.
- [ ] Nenhuma fonte externa está autorizada ou ativa.
- [ ] Tradução, IA, agenda e publicação automática permanecem fora do escopo.

## Atualização da Sprint 10

- [x] Modelo público de autor suporta `pending`, `verified`, `inactive` e `demo`; verificação exige data e ação explícita.
- [x] Onboarding versionado separa campos públicos das confirmações internas e não solicita dado sensível.
- [x] CLI cria, valida, lista e promove autores com dry-run; nenhuma pessoa foi criada automaticamente.
- [x] Briefing privado e comandos de pesquisa distinguem fontes candidatas, confirmadas e rejeitadas.
- [x] Gate exige pesquisa pronta, autor verificado, fact-checks, conflitos e imagem licenciada antes de review.
- [x] Piloto permanece em `draftStage: scaffold`, invisível e sem conteúdo factual.
- [x] Dezoito testes adicionais cobrem autoria, privacidade, pesquisa e bundle.
- [x] Validação final: instalação congelada, typecheck, lint, 95 testes, content:validate, build, dev, preview e smoke de 17 endpoints aprovados.
- [ ] Primeiro autor e material factual aguardam informações e autorização do fundador.

## Atualização da Sprint 9

- [x] CLI editorial lista, revisa, valida transições e executa publish-check somente leitura.
- [x] Autores demo e pending possuem estados explícitos; nenhum autor real foi inventado.
- [x] Piloto estrutural real existe como draft invisível, sem fatos, fontes ou imagem externa.
- [x] Produção funciona com zero, um ou vários artigos reais e nunca preenche espaços com demos.
- [x] Dezoito testes operacionais adicionais cobrem transições, distribuição, autoria e piloto.
- [ ] Primeiro artigo real continua bloqueado por autoria, fontes, mídia e aprovação humana.

## Atualização da Sprint 8

- [x] Taxonomia de lançamento preserva os seis slugs existentes e normaliza tags de conteúdo real.
- [x] Workflow tipado inclui `approved` e `correction-needed`; apenas `published` não futuro é público.
- [x] Fontes estruturadas, aprovação, correções, mídia e disclosure por tipo possuem guardrails.
- [x] Seis templates excluídos do índice e CLI `content:new` criam somente drafts sem sobrescrita.
- [x] Página SSR `/metodologia`, política de IA e plano de conteúdo foram adicionados.
- [x] Validação relata 12 demos, templates excluídos, warnings e erros acionáveis.
- [x] Validação final: instalação congelada, typecheck, lint, 59 testes, build, dev, preview e smoke de 15 endpoints aprovados.
- [ ] Nenhum conteúdo real foi produzido ou publicado; autores, fontes, imagens e pautas reais dependem de trabalho humano.

## Atualização da Sprint 7

- [x] Matriz de ambientes centralizada; build genérico é preview e produção exige configuração explícita.
- [x] Headers de segurança e CSP aplicados a SSR e endpoints de distribuição.
- [x] Preview Wrangler usa Node explicitamente, sem instalação global.
- [x] Rotas de privacidade, termos e política editorial adicionadas com ressalva jurídica.
- [x] Observabilidade abstrata sem fornecedor e logs de produção minimizados.
- [x] Formulários simulados declaram que não enviam nem persistem dados.
- [x] Smoke runner valida o worker compilado com e sem demos.
- [x] Documentação de deploy e checklists de release/editorial criados.
- [ ] Domínio, conta Cloudflare, textos jurídicos finais, ativos licenciados e conteúdo real permanecem pendentes.

## Atualização da Sprint 4

- [x] Fonte editorial versionada em 12 arquivos MDX.
- [x] Frontmatter validado por Zod, com slugs únicos e referências válidas de autor/categoria.
- [x] Repositório único desacopla rotas da fonte editorial.
- [x] Índice resumido separado dos corpos carregados sob demanda.
- [x] Drafts e demos são bloqueados nas consultas públicas conforme ambiente.
- [x] Patrocínio exige identificação e fontes externas possuem renderização segura.
- [x] Dez testes automatizados cobrem os invariantes mínimos.

## Estado geral

- [x] Aplicação React com TypeScript e renderização via TanStack Start.
- [x] Estrutura editorial navegável com dados locais simulados.
- [x] Layout responsivo com tema claro e escuro.
- [ ] Fonte de conteúdo persistente ou fluxo editorial de publicação.
- [ ] Integrações externas de audiência, envio ou monetização.

## Atualização da Sprint 6

- [x] Contrato editorial de mídia validado e usado pelas capas e figuras MDX.
- [x] Imagem responsiva com `sizes`, dimensões quando conhecidas, prioridade seletiva e fallback.
- [x] Ativo social local provisório em 1200×630 substitui o favicon.
- [x] Menu móvel com foco inicial, contenção e retorno ao gatilho.
- [x] Breadcrumbs semânticos e disclosure patrocinado acessível.
- [x] Abstração publicitária criada e completamente desativada.
- [x] Treze testes de mídia/acessibilidade adicionados sem nova dependência.

## Validação técnica

- [x] `bun install` concluído com Bun 1.3.14, sem alteração de `bun.lock`.
- [x] `bun run build` concluído para cliente, SSR e Nitro/Cloudflare.
- [x] `bun run typecheck` concluído com `tsc --noEmit`.
- [x] `bun run lint` concluído sem erros ou warnings após normalização LF e exceções locais justificadas para seis módulos shadcn.
- [x] `bun run dev` iniciou em `http://127.0.0.1:8081/`; home e artigo demo responderam HTTP 200 e a rota inexistente, 404. O processo foi encerrado de forma controlada.
- [x] `bun run preview` executado com Wrangler via Node conforme o script oficial; respondeu em `http://127.0.0.1:8787/`, com headers de segurança e `noindex`. O processo foi encerrado de forma controlada.
- [x] CI mínimo criado para typecheck, lint e build com lockfile congelado.
- [x] `bun test` cobre conteúdo, SEO, mídia e acessibilidade estática.

## Baseline de qualidade e segurança editorial

- [x] Política LF definida em `.gitattributes`, `.editorconfig` e Prettier.
- [x] URL pública centralizada em `src/config/site.ts` e `VITE_PUBLIC_SITE_URL`.
- [x] Mensagens raiz de 404 e erro traduzidas para português brasileiro.
- [x] Artigos identificados por `isDemo` e ocultos em produção por padrão.
- [x] Ambiente local exibe aviso inequívoco quando conteúdo demo está habilitado.
- [ ] O conteúdo demo ainda integra o bundle compilado, embora não seja exibido por padrão em produção.

## Funcionalidades implementadas

- [x] Home editorial com destaque, matérias secundárias e seções por categoria.
- [x] Página de artigo por slug.
- [x] Página de categoria por slug.
- [x] Busca local por título, resumo, conteúdo, autor, categoria e tags.
- [x] Páginas institucionais Sobre, Newsletter e Contato.
- [x] Navegação desktop e móvel.
- [x] Alternância de tema persistida em `localStorage`.
- [x] Compartilhamento de artigo por Web Share, cópia de link, X e LinkedIn.
- [x] Metadados básicos definidos por rota.
- [x] Tratamento de rota dinâmica inexistente.

## Funcionalidades simuladas

- [x] Conteúdo editorial demonstrativo armazenado em `content/articles/*.mdx`; autores e categorias permanecem em `src/data/*.ts`.
- [x] Cadastro de newsletter valida o e-mail, mas não o persiste nem o envia.
- [x] Formulário de contato valida os campos, mas não envia a mensagem.

## Funcionalidades ausentes

- [x] Pipeline MDX versionado e validado.
- [ ] Banco de dados e autenticação.
- [ ] Integração de newsletter e e-mail de contato.
- [x] Página pública de autor com artigos relacionados e schema `Person`.
- [x] Sitemap, RSS, `robots.txt`, canonical, metadados sociais e JSON-LD.
- [ ] Analytics.
- [x] Abstração de slot desativada; nenhum script ou anúncio real.
- [x] Testes automatizados e integração contínua básica.

## Rotas

- [x] `/` — home.
- [x] `/artigo/$slug` — detalhe de artigo.
- [x] `/categoria/$slug` — listagem por categoria.
- [x] `/busca` — busca local, com termo na query string `q`.
- [x] `/sobre` — apresentação institucional.
- [x] `/newsletter` — apresentação e formulário simulado.
- [x] `/contato` — formulário simulado.
- [x] `/privacidade`, `/termos` e `/politica-editorial` — documentos iniciais sujeitos a revisão jurídica.
- [x] `/metodologia` — processo editorial público, sem prometer equipe ou revisão inexistente.

## Componentes principais

- [x] Layout: `SiteHeader`, `SiteFooter`, `Container`, `Logo`, `SkipLink` e `ThemeToggle`.
- [x] Home: `HeroStory`, `SecondaryHighlights`, `InPauta` e `SectionTitle`.
- [x] Artigo: `ArticleCard`, `ArticleBody`, `Byline`, `CategoryTag` e `ShareBar`.
- [x] Navegação: `MobileMenu` e configuração `primaryNav`.
- [x] Newsletter: `NewsletterCTA`.

## Limitações

- [ ] Os 12 artigos, 5 autores e 6 categorias são dados estáticos de demonstração.
- [ ] Busca, categorias e artigos dependem do conteúdo empacotado no build.
- [ ] Newsletter e contato não possuem persistência ou entrega.
- [ ] As imagens editoriais são carregadas de URLs externas.
- [ ] A documentação anterior descreve itens planejados que ainda não existem no código.

## Próximos passos técnicos

- [ ] Reconciliar a arquitetura documental com a fonte real de conteúdo escolhida.
- [ ] Definir e implementar o pipeline editorial somente após decisão arquitetural.
- [x] Implementar SEO técnico verificável por rota.
- [ ] Definir persistência e tratamento seguro dos formulários.
- [ ] Adicionar estratégia de testes e CI em sprint própria.
- [ ] Auditar componentes e dependências possivelmente não utilizados antes de qualquer remoção.

## Sprint 13 — descoberta e ativação piloto

- [x] Oito dossiês públicos documentados, com duas decisões `confirmed`.
- [x] MIT News Renewable Energy e NASA Technology ativas e `healthy`.
- [x] Primeira coleta manual: 30 itens, máximo de 20 por fonte, zero publicação.
- [x] Amostra de três itens revisada sem aprovação; falso positivo lexical corrigido.
- [ ] Ampliar cobertura regional e linguística em curadoria futura.

## Sprint 18 — persistência durável

- [x] Domínio desacoplado do filesystem por contratos de storage.
- [x] Adapter local compatível com dados existentes e escrita atômica.
- [x] Adapter D1 com CAS, paginação, transações, timeout e falha segura.
- [x] Migrations, snapshots, import/export, backup e restore locais.
- [x] Locks, sessões, rate limit e auditoria persistentes.
- [x] Central e CLI integradas à abstração; portal público permanece isolado.
- [x] 45 testes de contrato aprovados localmente e no emulador D1.
- [ ] Provisionar e validar D1 somente após autorização humana.
