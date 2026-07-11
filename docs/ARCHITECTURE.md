# ARCHITECTURE.md — Sul Global

## Stack (fase 1 — MVP)

- **React 19 + TypeScript** — UI.
- **TanStack Start + TanStack Router** — file-based routing com SSR nativo.
- **Vite 7** — build.
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

### Navegação
- Sempre `<Link>` do `@tanstack/react-router`. Nunca `<a href>` para rotas
  internas.
- Sem hash anchors como navegação principal entre seções.

### Imagens
- `<img loading="lazy">` + `srcset` + `sizes`.
- Capas de artigo: 1200×630 (também servem como `og:image`).
- Sempre `alt` descritivo.

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

| Integração          | Fase | Uso                                    |
|---------------------|------|----------------------------------------|
| Lovable Cloud       | 1    | Newsletter (`subscribers`)             |
| Google Analytics 4  | 2    | Métricas de audiência                  |
| AdSense             | 2    | Anúncios simples                       |
| Ad Manager          | 3    | Campanhas e patrocínios                |
| Supabase (full)     | 3    | CMS, membros, premium                  |
| Stripe              | 3    | Assinatura premium                     |

## O que não usar

- WordPress, Blogger, Firebase.
- React Router DOM (usar TanStack Router).
- `useEffect + fetch` para render inicial.
- CSS-in-JS runtime (usar Tailwind).
- Lodash inteiro, moment.js, jQuery.
- Qualquer lib > 30kb sem justificativa.