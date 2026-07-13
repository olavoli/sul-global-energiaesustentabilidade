# Status de implementação

## Estado geral

- [x] Aplicação React com TypeScript e renderização via TanStack Start.
- [x] Estrutura editorial navegável com dados locais simulados.
- [x] Layout responsivo com tema claro e escuro.
- [ ] Fonte de conteúdo persistente ou fluxo editorial de publicação.
- [ ] Integrações externas de audiência, envio ou monetização.

## Validação técnica

- [x] `bun install` concluído com Bun 1.3.14, sem alteração de `bun.lock`.
- [x] `bun run build` concluído para cliente, SSR e Nitro/Cloudflare.
- [x] `bun run typecheck` concluído com `tsc --noEmit`.
- [x] `bun run lint` concluído sem erros ou warnings após normalização LF e exceções locais justificadas para seis módulos shadcn.
- [x] `bun run dev` iniciou e respondeu com HTTP 200 em `http://127.0.0.1:8080/`; os processos Bun e Node criados pela validação foram encerrados de forma controlada.
- [x] CI mínimo criado para typecheck, lint e build com lockfile congelado.
- [ ] Não existe script `test` em `package.json`.

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

- [x] Conteúdo editorial armazenado em `src/data/*.ts`.
- [x] Cadastro de newsletter valida o e-mail, mas não o persiste nem o envia.
- [x] Formulário de contato valida os campos, mas não envia a mensagem.

## Funcionalidades ausentes

- [ ] CMS ou pipeline MDX.
- [ ] Banco de dados e autenticação.
- [ ] Integração de newsletter e e-mail de contato.
- [ ] Página de autor.
- [ ] Sitemap, RSS, `robots.txt`, canonical e JSON-LD.
- [ ] Analytics.
- [ ] Slots ou scripts de anúncios.
- [ ] Testes automatizados e integração contínua.

## Rotas

- [x] `/` — home.
- [x] `/artigo/$slug` — detalhe de artigo.
- [x] `/categoria/$slug` — listagem por categoria.
- [x] `/busca` — busca local, com termo na query string `q`.
- [x] `/sobre` — apresentação institucional.
- [x] `/newsletter` — apresentação e formulário simulado.
- [x] `/contato` — formulário simulado.

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
- [ ] Implementar SEO técnico verificável por rota.
- [ ] Definir persistência e tratamento seguro dos formulários.
- [ ] Adicionar estratégia de testes e CI em sprint própria.
- [ ] Auditar componentes e dependências possivelmente não utilizados antes de qualquer remoção.
