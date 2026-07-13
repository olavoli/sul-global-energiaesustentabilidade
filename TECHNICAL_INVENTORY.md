# Inventário técnico

Levantamento estático do repositório na Sprint 1. “CONFIRMADO” identifica evidência direta no código; “POSSIVELMENTE” exige validação adicional antes de qualquer ação.

## Estrutura

- **CONFIRMADO:** `src/routes/` contém as rotas file-based e o layout raiz.
- **CONFIRMADO:** `src/components/` separa componentes de artigo, home, layout, navegação, newsletter e UI genérica.
- **CONFIRMADO:** `src/data/` contém artigos, autores e categorias em TypeScript.
- **CONFIRMADO:** `src/lib/` contém busca, formatação, classes CSS e tratamento de erros.
- **CONFIRMADO:** `src/hooks/` contém hooks de tema e detecção de viewport móvel.
- **CONFIRMADO:** `src/types/` contém os contratos do conteúdo editorial.
- **CONFIRMADO:** `docs/` contém visão, arquitetura, modelo de conteúdo, design system, regras e roadmap.
- **CONFIRMADO:** `public/` contém somente `favicon.ico`.
- **CONFIRMADO:** não existe diretório `content/`, CMS ou arquivo MDX.

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

- **CONFIRMADO:** 12 artigos com status `published` estão definidos em `src/data/articles.ts`.
- **CONFIRMADO:** 5 autores estão definidos em `src/data/authors.ts`.
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
- **CONFIRMADO:** `package.json` não define script de testes.
- **CONFIRMADO:** `bun run dev` iniciou e respondeu com HTTP 200 em `http://127.0.0.1:8080/`; os processos criados pela validação foram encerrados.

## Configuração pública e proteção editorial

- **CONFIRMADO:** `src/config/site.ts` centraliza nome, descrição, URL, locale, idioma e imagem social.
- **CONFIRMADO:** `.env.example` documenta somente `VITE_PUBLIC_SITE_URL` e `VITE_ALLOW_DEMO_CONTENT`, sem segredos.
- **CONFIRMADO:** os 12 artigos são marcados com `isDemo: true` por construção.
- **CONFIRMADO:** desenvolvimento permite demos com aviso visual; produção os oculta por padrão e exige opt-in explícito para uma implantação demonstrativa.
- **LIMITAÇÃO:** as strings demo ainda são incluídas no bundle; a separação física depende da futura arquitetura de conteúdo.
