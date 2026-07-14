# Sul Global

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

O preview usa Node apenas para executar Wrangler sobre `.output/server/wrangler.json`; Bun continua responsável por instalação, testes e build. Execute `bun run build` antes. Builds genéricos são tratados como preview e bloqueiam indexação. Produção exige `VITE_APP_ENV=production`, URL pública explícita e demos desativadas.

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
bun run content:new -- --type explainer --title "Título provisório" --slug titulo-provisorio --author ana-souza --category energia --date 2026-07-13 --tag "energia solar"
```

O CI executa instalação com lockfile congelado, typecheck, lint e build em pushes e pull requests direcionados à `main`.

Os artigos atuais são conteúdo fictício de demonstração. Em produção, eles ficam ocultos por padrão. Uma implantação deliberadamente demonstrativa pode definir `VITE_ALLOW_DEMO_CONTENT=true`; nesse caso, o aviso visual de demonstração permanece obrigatório.

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
