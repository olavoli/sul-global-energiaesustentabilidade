# Registro de decisões

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
