# Registro de decisões

## ADR — sinais temporais são observações conservadoras

**Decisão:** derivar sinais somente da Memória Temporal por política JSON versionada, com cobertura própria, confiança temporal e `insufficient-data` fail-safe.

**Consequências:** candidatos são preliminares e exigem warning e revisão; não há previsão, causalidade, narrativa, coleta ou publicação. A amostra real de 2025 não é tendência.

## ADR — Grafo científico como metadado privado supervisionado

**Decisão:** representar vínculos bibliográficos observados em documento versionado independente, com IDs estáveis e proveniência. Persistência futura será local e transacional com a referência estrutural do dossiê.

**Consequências:** citações não expressam apoio, validação ou consenso; a Central exige revisão humana; OpenAlex e Crossref são as únicas fontes da V1.

## ADR — staging remoto isolado e supervisionado

Após validação local e autorização humana em checkpoints separados, decidiu-se
provisionar somente o Worker `sul-global-staging`, o D1
`sul-global-newsroom-staging` e um secret administrativo server-only. O
manifesto materializado com ID real permanece em `.wrangler/`, fora do Git.
Não há rota ou domínio de produção, e todos os kill switches mutáveis continuam
fechados.

O runtime Nitro delega o serviço SSR passando bindings pelo contexto anexado ao
`Request`; o wrapper resolve esse contexto sem estado global. A política padrão
de automação é importada estaticamente para funcionar no Worker, mantendo
leitura de arquivo apenas para caminhos locais alternativos.

Backup e restore são considerados válidos somente quando o export é restaurado
em D1 isolado, comparado integralmente e o recurso temporário é removido.
Rollback do Worker não implica rollback de dados; contenção por kill switch e
preservação do D1 têm precedência.

## ADR — staging isolado, emulado antes de remoto

Decidiu-se versionar somente um template Cloudflare com placeholder e manter o
manifesto materializado em `.wrangler/`. Staging exige URL HTTPS, D1, secret e
environment próprios; todos os kill switches começam fechados. Migrations,
seed, sessão, rate limit, locks e recovery são provados primeiro pelo emulador.
Deploy e operações D1 remotas só existem em workflow manual protegido, com
autorização literal e secrets do environment. Produção não compartilha
configuração e não é fallback.

## ADR — Central Editorial server-side e sessão administrativa mínima

Decidiu-se proteger `/admin` no wrapper do servidor antes do SSR e fornecer dados por `/api/admin` somente após sessão HMAC. O segredo permanece server-only; cookie HttpOnly, CSRF, rate limit, expiração e schemas Zod protegem ações. Componentes cliente não importam `newsroom/`; a API reutiliza serviços de domínio. Apply completo e coleta externa mutável ficam fora da interface. Como Cloudflare não fornece filesystem persistente, a operação mutável permanece local até backend privado aprovado.

## ADR — automação diária fail-safe e supervisionada

Decidiu-se manter a agenda desacoplada e o pipeline privado, determinístico e dry-run por padrão. Apply exige kill switch global explícito; coleta, tradução, orquestração, notificação e agenda usam switches independentes. Lock, budgets, retries limitados e circuito por fonte impedem concorrência e insistência insegura. Checkpoints preservam trabalho consistente; relatório e inbox orientam revisão humana sem publicar. O filesystem do GitHub Actions é efêmero e não será persistido por commit automático.

## ADR — orquestração supervisionada

Decidiu-se separar avaliação automática, decisão humana, pauta, artigo e publicação. A política JSON somente executa regras editoriais já documentadas. Fonte única reduz confiança; tradução pendente e risco crítico bloqueiam uso factual; score não remove bloqueador. Pauta exige ação humana persistida e nunca gera MDX. Métricas não alteram decisões.

## ADR — clustering conservador e tradução humana

O sistema agrupa automaticamente apenas por identidade forte ou pela combinação de alta similaridade de título, entidade, tema específico e janela temporal. Relação fraca não provoca merge. Instituição, e não feed, define independência. Claims e fonte primária são hipóteses atribuídas. Tradução externa permanece um contrato desabilitado; fixture e passthrough provam o fluxo sem rede. Aprovação linguística nunca equivale a aprovação editorial.

## 018 — Fontes reais exigem evidência e seleção explícita

Configuração, saúde técnica e confiança editorial são separadas. Fonte real exige HTTPS, evidência e revisor; coleta ampla exige confirmação e mutações são dry-run por padrão. Cache condicional e hash evitam repetição; falhas graves vão para quarentena. Sem URLs fornecidas, o catálogo fica vazio. Não há busca web, scraping, agenda ou publicação.

## 017 — Redação algorítmica local, determinística e supervisionada

### Contexto

A triagem precisa evoluir sem publicar, copiar matérias ou depender de IA e serviços externos.

### Decisão

Manter catálogo e estado operacional em `newsroom/`, com código em `scripts/newsroom/`, fora do bundle público. Usar RSS/Atom e fixtures locais; aplicar normalização, deduplicação lexical, regras temáticas e score explicável. Catálogo externo começa vazio. Ações mutáveis são dry-run e exigem `--apply`; aprovação gera somente briefing.

### Consequências

Nenhuma dependência foi adicionada. O MVP funciona offline e é auditável, mas classificação, similaridade e score não substituem apuração humana. Ativar feeds, tradução, IA ou publicação exige decisão posterior.

## 016 — Onboarding privado e verificação explícita precedem a redação factual

### Contexto

O primeiro conteúdo real precisa de autoria autorizada e pesquisa verificável sem expor confirmações internas no portal ou promover dados automaticamente.

### Decisão

Manter perfis públicos em `content/authors.json` e onboarding em diretório não importado. Usar estados `pending`, `verified`, `inactive` e `demo`; `verified` exige data e ação `--apply`. Manter briefing de pesquisa separado do MDX, distinguindo fontes candidatas, confirmadas e rejeitadas. Exigir `ready-for-writing` antes da redação e `review-ready` antes da revisão.

### Consequências

Autor pending pode assinar somente draft. Credenciais continuam opcionais, mas as informadas precisam de confirmação. Onboarding e briefing não entram no bundle, sitemap ou RSS. Nenhuma verificação, redação ou publicação ocorre no build.

## 015 — Operação editorial por CLI com autoria verificada

### Contexto

O fluxo precisava ser operável sem editar código interno nem introduzir CMS, preservando demos e impedindo publicação acidental.

### Decisão

Usar CLI local para inventário, revisão, transição e publish-check. Mudança de status é dry-run até `--apply`; publicação exige ambiente oficial, autor verificado, aprovação, fontes e mídia licenciada. Autores herdados são demos; um marcador pending mantém o piloto bloqueado.

### Consequências

O fundador pode operar MDX pelo Git com relatórios acionáveis. Nenhuma identidade demo pode sustentar conteúdo real e nenhuma transição altera `isDemo`.

## 014 — Publicação editorial exige estado e evidência explícitos

### Contexto

O modelo anterior distinguia demos e drafts, mas não registrava aprovação, fontes estruturadas, correções ou requisitos próprios de cada formato.

### Decisão

Manter conteúdo no Git e adicionar estados `approved` e `correction-needed`, fontes estruturadas, aprovação explícita, requisitos por tipo e histórico público de correções. Templates ficam fora de `content/articles`; a CLI sempre cria `draft`. Os seis slugs de categoria existentes permanecem estáveis, e subtemas usam tags normalizadas.

### Consequências

Somente `published` com data não futura entra no repositório público. Conteúdo real sem evidência mínima falha na validação; demos continuam válidos apenas em ambiente autorizado. Nenhum CMS, usuário ou publicação automática é introduzido.

## 013 — Produção explícita e preview seguro por padrão

### Contexto

Um build Vite não pode ser confundido com publicação oficial apenas por usar modo de produção. Wrangler exige Node no ambiente atual, e ambientes não oficiais precisam de proteção uniforme.

### Decisão

Centralizar o ambiente em `VITE_APP_ENV`. Builds sem valor explícito são preview; produção exige URL pública não local e rejeita demos. Aplicar headers no wrapper do worker. Usar Bun para instalação/build/testes e Node `>=20` somente para Wrangler. Manter observabilidade local atrás de interface sem fornecedor.

### Consequências

Development, test, preview e staging permanecem não indexáveis; sitemap/RSS não publicam conteúdo nesses ambientes. A implantação real continua manual e bloqueada por domínio, conteúdo, ativos e revisão jurídica ainda pendentes.

## 012 — Mídia explícita e publicidade inativa por padrão

### Contexto

Capas externas sem dimensões, licença ou fallback aumentavam risco jurídico, CLS e indisponibilidade. A monetização futura precisa reservar geometria sem ativar terceiros prematuramente.

### Decisão

Representar imagem editorial como objeto validado; exigir alt salvo decoração explícita; informar dimensões somente quando conhecidas; renderizar por `EditorialImage`; classificar capas demo atuais como `license: unknown`. Manter `AdSlot` separado do conteúdo e controlado por configuração imutável `enabled: false`.

### Consequências

Capas e figuras compartilham carregamento, `sizes`, prioridade e fallback. O pipeline aceita `srcset` apenas com variantes reais. As 12 capas externas devem ser substituídas antes do lançamento. Nenhum espaço, script, ID ou chamada publicitária existe enquanto a configuração estiver desativada.

## 008 — SEO e distribuição derivados da mesma fonte editorial

**Status:** aceita em 2026-07-13.

Canonicals, schemas, sitemap e RSS usam uma única origem definida por `VITE_PUBLIC_SITE_URL` e os artigos já filtrados pelo repositório editorial. Caminhos relativos de canonical são resolvidos contra essa origem. Se a URL pública não estiver configurada, o fallback local permite build e preview, mas `robots.txt` e metadados impedem indexação.

Os endpoints de distribuição são atendidos pelo servidor SSR e gerados em tempo de requisição a partir do conteúdo empacotado. O preview executa o artefato Cloudflare real com Wrangler. Publicidade permanece fora do runtime: eventual `ads.txt` só poderá ser criado depois de fornecedor, conta e identificadores reais aprovados.

Somente decisões comprovadas pela configuração e pelo histórico documental do repositório são registradas aqui.

## 001 — Uso de Bun

### Contexto

O repositório contém `bun.lock`, `bunfig.toml` e política de instalação específica do Bun.

### Decisão

Usar Bun para instalação de dependências e execução dos scripts do projeto.

### Consequências

O lockfile do Bun é a referência de resolução. Instalação, desenvolvimento e build devem ser verificados com Bun.

## 002 — Uso de React

### Contexto

A interface é composta por componentes React e o projeto declara React 19 e React DOM.

### Decisão

Usar React como biblioteca da interface do portal.

### Consequências

Componentes, hooks e composição React formam a camada de apresentação.

## 003 — Uso de TypeScript

### Contexto

O código-fonte utiliza `.ts` e `.tsx`, e `tsconfig.json` habilita o modo estrito.

### Decisão

Usar TypeScript em todo o código da aplicação.

### Consequências

Novas implementações devem preservar tipagem estrita e os contratos existentes.

## 004 — Uso de TanStack Start

### Contexto

As rotas usam TanStack Router, a aplicação é configurada com TanStack Start e possui entrada SSR customizada.

### Decisão

Usar TanStack Start como framework da aplicação, com roteamento baseado em arquivos.

### Consequências

As rotas ficam em `src/routes/`, a árvore é gerada em `src/routeTree.gen.ts` e o ciclo de build permanece integrado ao Vite.

## 005 — Uso de Tailwind CSS

### Contexto

O projeto declara Tailwind CSS 4, usa o plugin Vite correspondente e mantém tokens em `src/styles.css`.

### Decisão

Usar Tailwind CSS para estilos e tokens semânticos para cores e superfícies.

### Consequências

Componentes compartilham a configuração de estilos existente; mudanças visuais exigem atualização coordenada do design system.

## 006 — Lovable como origem do projeto

### Contexto

`AGENTS.md`, a configuração Vite e o histórico do repositório registram que o projeto foi criado e permanece conectado ao Lovable.

### Decisão

Preservar a compatibilidade do fluxo Git com o Lovable como origem do projeto.

### Consequências

Não reescrever histórico publicado. Commits enviados à branch conectada devem manter o projeto em estado funcional.

## 007 — LF como final de linha do repositório

### Contexto

O desenvolvimento ocorre em Windows, Lovable e futuros runners Linux. A ausência de política explícita causava milhares de erros de Prettier por divergência CRLF/LF.

### Decisão

Versionar arquivos de texto com LF, usando `.gitattributes` como autoridade Git, `.editorconfig` para editores e `endOfLine: "lf"` no Prettier.

### Consequências

Checkouts e CI tornam-se determinísticos. A normalização inicial produz um diff mecânico amplo que deve ser revisado separadamente das mudanças lógicas.

## 008 — URL pública centralizada

### Contexto

Metadata e compartilhamento continham URLs dispersas e um domínio de exemplo.

### Decisão

Centralizar informações públicas em `src/config/site.ts`, usando `VITE_PUBLIC_SITE_URL` e fallback explícito `http://localhost:8080` para desenvolvimento.

### Consequências

Implantações devem configurar uma URL absoluta pública. A variável é pública e não pode conter segredos.

## 009 — Conteúdo demonstrativo bloqueado por padrão em produção

### Contexto

Os 12 artigos fictícios possuem aparência de notícias reais e não podem ser publicados silenciosamente.

### Decisão

Identificar artigos demo no modelo, permiti-los automaticamente em desenvolvimento e ocultá-los em produção. Uma implantação demonstrativa exige `VITE_ALLOW_DEMO_CONTENT=true` e mantém aviso visual obrigatório.

### Consequências

O build padrão de produção exibe estado sem artigos em vez de publicar demos. As strings ainda permanecem no bundle até a definição da arquitetura de conteúdo.

## 010 — MDX versionado com índice gerado

### Contexto

Artigos TypeScript acoplavam armazenamento, busca, rotas e corpo completo no bundle principal.

### Decisão

Manter um arquivo MDX por artigo, validar o frontmatter com Zod e gerar metadata e loaders determinísticos antes de dev, typecheck e build.

### Consequências

Rotas consomem um repositório estável; listagens não carregam corpos e cada artigo gera chunk próprio. O índice deve permanecer sincronizado por `bun run content:validate`.

## 011 — MDX restrito a conteúdo editorial seguro

### Contexto

MDX completo permite imports, exports e expressões JavaScript, capacidade desnecessária para autoria editorial.

### Decisão

Rejeitar código executável e permitir somente `Callout`, `Quote`, `Figure` e `KeyPoints`, além do Markdown comum. Usar `@mdx-js/rollup`, `remark-frontmatter` e `yaml`; usar o runner nativo do Bun nos testes.

### Consequências

Novos componentes exigem alteração explícita do whitelist e revisão técnica. Não foi adicionado CMS nem framework de testes.

## ADR — Dossiê obrigatório e piloto conservador

Ativar somente MIT News Renewable Energy e NASA Technology. Fonte externa ativa exige dossiê `confirmed`, feed oficial HTTPS, termos e copyright revisados e URL idêntica à evidência. IRENA ficou em revisão por vedação de automação; gov.br, DOE, FAPESP, ADB e EPE foram rejeitadas pelos motivos registrados. A cobertura inicial estreita é aceita em troca de auditabilidade. Fonte primária não conta sozinha como confirmação independente.

## 012 — D1 como persistência operacional serverless

### Contexto

Fila, decisões, sessões, locks e auditoria exigem estado entre invocações,
concorrência controlada e transações. O filesystem do worker é efêmero.

### Decisão

Usar contratos neutros, adapter local para desenvolvimento e Cloudflare D1 via
binding server-side para produção. Relatórios e exports ficam inicialmente como
objetos privados versionados no mesmo contrato. R2 permanece opção futura para
volumes maiores.

### Consequências

Produção falha fechada sem D1 e nunca usa local silenciosamente. MDX não migra.
Há algum acoplamento operacional à plataforma Cloudflare, reduzido pelos
contratos e testes comuns. Nenhum recurso remoto foi criado nesta Sprint.
