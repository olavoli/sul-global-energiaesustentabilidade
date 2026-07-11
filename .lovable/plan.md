
# Sul Global — Plano de Arquitetura (Fase 0, sem código)

Antes de qualquer linha de código, entregamos a "constituição" do projeto e o desenho da arquitetura. Nenhum componente, página ou dependência será criado nesta etapa.

## 1. Análise do produto

**O que é:** portal de mídia independente sobre energia, sustentabilidade, ciência, tecnologia, desenvolvimento e transição energética. Conteúdo técnico com linguagem acessível.
**O que não é:** blog pessoal, agregador, rede social, fórum.
**Referências editoriais:** Reuters, Bloomberg Green, MIT Technology Review.
**Referência visual escolhida:** Bloomberg Green — editorial denso, serifada forte, verde/preto, ar técnico e sério.
**Idioma:** somente PT-BR no MVP (i18n fica no roadmap).
**Modelo de conteúdo:** Markdown/MDX versionado no repositório (sem backend na fase 1).

## 2. Riscos identificados

- **Sem CMS visual:** publicar exige PR no GitHub. Mitigação: template de artigo + checklist + guia de publicação.
- **SEO frágil se render for client-side:** stack TanStack Start já oferece SSR — obrigatório usar loader/head por rota, não hash anchors.
- **Escala do conteúdo em MDX:** funciona bem até ~500 artigos. Depois, migrar para Supabase (planejado no roadmap).
- **Imagens pesadas:** portal editorial vive de capas — precisa pipeline de imagens responsivas + lazy loading desde o dia 1.
- **Dependências inchadas:** cada lib nova precisa justificativa. Regra: nada de UI kit pesado, animação pesada ou state manager global.
- **Acoplamento a Lovable/Cursor:** documentos-constituição precisam ser lidos por humanos também, não só por IA.
- **Monetização precoce:** AdSense em MVP mata performance e credibilidade. Slots ficam reservados, mas ativação só depois de tráfego.

## 3. Arquitetura proposta

**Stack fase 1 (MVP):**
- React + TypeScript + Vite (via TanStack Start, já configurado).
- Tailwind CSS v4 (tokens em `src/styles.css`).
- Conteúdo em MDX no repositório, lido em build/loader.
- Hospedagem: Vercel (ou o hosting atual do Lovable).
- Newsletter: captura simples via Lovable Cloud (Supabase) — única superfície de backend nesta fase.
- Slots de anúncio: componentes vazios prontos, sem código de rede publicitária ainda.

**Stack fase 2 (quando justificar):**
- Supabase para artigos, autores, categorias, assinantes premium.
- Área de membros (Gratuito / Premium / Empresas / Universidades).
- Google Ad Manager, patrocínios, conteúdo patrocinado.

**Princípios técnicos:**
- SSR em toda rota pública (SEO).
- Cada rota define `head()` próprio (title, description, og:*).
- Componente = responsabilidade única.
- Zero `any`. Zero arquivo > 300 linhas. Zero componente > 200 linhas.
- Imagens sempre responsivas + lazy.

## 4. Estrutura de pastas (proposta, não criada ainda)

```text
sul-global/
├── docs/                         # a "constituição" — cérebro do projeto
│   ├── VISION.md
│   ├── ARCHITECTURE.md
│   ├── DESIGN_SYSTEM.md
│   ├── PROJECT_RULES.md
│   ├── ROADMAP.md
│   └── CONTENT_MODEL.md
├── content/
│   ├── artigos/                  # um .mdx por artigo
│   ├── autores/                  # perfis
│   └── categorias.json           # taxonomia
├── public/                       # favicon, robots, sitemap, og estático
├── src/
│   ├── routes/                   # file-based routing (TanStack)
│   │   ├── __root.tsx
│   │   ├── index.tsx             # Home
│   │   ├── categoria.$slug.tsx   # /categoria/energia
│   │   ├── artigo.$slug.tsx      # /artigo/hidrogenio-verde
│   │   ├── autor.$slug.tsx
│   │   ├── sobre.tsx
│   │   ├── newsletter.tsx
│   │   ├── contato.tsx
│   │   └── busca.tsx
│   ├── components/
│   │   ├── layout/   (Header, Footer, Container)
│   │   ├── editorial/ (ArticleCard, HeroStory, CategoryStrip, AuthorByline, ReadingTime)
│   │   ├── ads/      (AdSlot — placeholder)
│   │   ├── newsletter/ (NewsletterForm)
│   │   └── ui/       (shadcn base — só o que for usado)
│   ├── content-lib/              # leitura/parse de MDX, frontmatter, índice
│   ├── lib/                      # utils genéricos
│   ├── hooks/
│   └── styles.css
└── PROJECT_RULES.md              # também na raiz para IA ler primeiro
```

## 5. Componentes previstos (só nomes e responsabilidade)

- **Layout:** `SiteHeader`, `SiteFooter`, `Container`, `SectionTitle`.
- **Editorial:** `HeroStory` (matéria principal), `ArticleCard` (card padrão), `ArticleList`, `CategoryStrip` (faixa por categoria), `AuthorByline`, `ReadingTime`, `Tag`, `SponsoredBadge`.
- **Página de artigo:** `ArticleHeader`, `ArticleBody` (renderiza MDX), `ArticleFooter`, `RelatedArticles`, `ShareBar`.
- **Ads:** `AdSlot` (placeholder reservando espaço; sem script de rede ainda).
- **Newsletter:** `NewsletterForm`, `NewsletterCTA` (inline entre parágrafos).
- **Busca:** `SearchInput`, `SearchResults`.
- Cada componente ≤ 200 linhas, responsabilidade única, sem `any`.

## 6. Páginas previstas (rotas)

| Rota | Função |
|---|---|
| `/` | Home editorial (hero + faixas por categoria + newsletter) |
| `/categoria/$slug` | Listagem por categoria (energia, sustentabilidade, ciência, tecnologia, desenvolvimento, transição energética) |
| `/artigo/$slug` | Página do artigo (MDX renderizado) |
| `/autor/$slug` | Perfil do autor e seus artigos |
| `/newsletter` | Landing da Sul Global newsletter |
| `/busca` | Resultados de busca |
| `/sobre` | Missão, editorial, equipe |
| `/contato` | Contato e imprensa |

Cada rota terá `head()` próprio. Nada de âncoras `#` como navegação principal.

## 7. Fluxo de publicação (fase MDX)

```text
1. Autor cria branch → adiciona artigo em content/artigos/slug.mdx
2. Frontmatter obrigatório: title, description, cover, author, category,
   tags, publishedAt, updatedAt, readingTime, seo{ogImage, canonical}
3. PR → revisão editorial (checklist: título, resumo, capa 1200x630,
   alt em todas imagens, fontes citadas)
4. Merge → build automático → deploy Vercel
5. Sitemap.xml e feed RSS regenerados no build
```

Passo futuro (fase 2): mesmo fluxo, mas painel no Supabase substitui o PR.

## 8. Fluxo de crescimento

**Fase 1 — Fundação (0–3 meses):** MVP público, 3 artigos/semana, newsletter capturando, SEO técnico impecável, sem anúncios.
**Fase 2 — Audiência (3–9 meses):** parcerias com universidades/pesquisadores, AdSense em slots já reservados, primeiros patrocínios de categoria.
**Fase 3 — Plataforma (9–18 meses):** migrar conteúdo para Supabase, área de membros (Gratuito/Premium/Empresas/Universidades), Ad Manager, eventos e webinars.
**Fase 4 — Ecossistema (18+ meses):** marketplace (cursos, livros, consultorias), conteúdo patrocinado estruturado, API de dados de energia.

## 9. Documentos-constituição a serem criados (próximo passo, ainda sem código)

Todos vivem em `docs/` e são lidos por Lovable/Cursor antes de qualquer alteração:

1. **VISION.md** — missão, público, posicionamento, tom editorial.
2. **ARCHITECTURE.md** — stack, decisões técnicas, estrutura, integrações, SSR/SEO.
3. **DESIGN_SYSTEM.md** — paleta Bloomberg Green (verde/preto/off-white), tipografia serifada para títulos + sans para corpo, escala tipográfica, espaçamento, tokens em `styles.css`, componentes.
4. **PROJECT_RULES.md** — guardrails (sem `any`, arquivos ≤ 300 linhas, componentes ≤ 200, sem duplicação, acessibilidade AA, lazy loading, imagens responsivas, sem dependência sem justificativa, commits descritivos, nunca alterar cores/fontes sem autorização).
5. **ROADMAP.md** — fases 1 a 4 acima.
6. **CONTENT_MODEL.md** — schema do frontmatter MDX, taxonomia de categorias, regras de SEO por artigo, capas, autores.

## 10. Ordem de construção (quando você autorizar código)

Cada etapa é um prompt separado, isolado e revisável:

```text
1. Documentos-constituição (docs/*.md + PROJECT_RULES.md)
2. Design System (tokens no styles.css, sem componentes ainda)
3. Layout: Header
4. Layout: Footer
5. Home (com dados mock)
6. Página de Artigo (renderizando 1 MDX de exemplo)
7. Página de Categoria
8. Busca
9. Newsletter (Lovable Cloud)
10. Slots de anúncio (placeholders)
11. Sitemap + RSS + robots + SEO técnico
```

Nada será construído até você aprovar este plano e dizer "agora construa X".

## Detalhes técnicos (referência)

- Roteamento: TanStack Router file-based, SSR nativo do TanStack Start, sem hash anchors como nav principal.
- MDX: parse em loader de rota via `ensureQueryData` + `useSuspenseQuery`; sem `useEffect + fetch`.
- Newsletter: tabela `subscribers` no Lovable Cloud com RLS (INSERT público, SELECT só service_role).
- Imagens: `<img loading="lazy">` + `srcset`, capas 1200x630 para og:image nos leaf routes.
- Sem Firebase, sem WordPress, sem backend próprio, sem libs pesadas.

---

**Confirmação necessária:** aprovo os documentos-constituição e a estrutura acima? Se sim, o próximo prompt será "Agora crie os documentos em `docs/`" — ainda sem código de aplicação.
