# Registro de decisões

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
