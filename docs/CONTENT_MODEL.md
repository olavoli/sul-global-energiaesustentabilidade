# CONTENT_MODEL.md — Sul Global

## Contrato implementado para lançamento

Categorias mantêm os seis slugs existentes para preservar URLs. Política energética e Sul Global são eixos tratados por tags ou pelas categorias existentes, até que volume e migração justifiquem mudança. Tags reais são normalizadas por `src/content/taxonomy.ts`; demos legados não são reescritos nesta Sprint.

Estados: `draft`, `review`, `approved`, `scheduled`, `published`, `archived` e `correction-needed`. Somente `published`, com `publishedAt` não futuro, é público. Conteúdo real publicado exige `approvedAt`; `scheduled` exige data/hora com fuso.

Fontes estruturadas usam `title`, `url`, `organizationOrAuthor`, `publishedAt` opcional, `verifiedAt`, `type`, `note` opcional e `isDemo`. Os tipos são official, academic, regulatory, company, news, data, interview e other. `sourceUrls` permanece apenas por compatibilidade com demos.

Atualizações usam `updatedAt` e `updateNote` ou `corrections`. Cada correção registra `type`, `date`, `reason` e `description`. `opinionDisclosure`, dados de entrevista e `aiDisclosure` são exigidos conforme o tipo e o uso. O contrato executável em `src/content/schema.ts` é a autoridade em caso de divergência com exemplos históricos abaixo.

Autores públicos usam `displayName`, `shortBio`, campos profissionais opcionais, expertise, links, `isDemo`, `status` (`pending`, `verified`, `inactive` ou `demo`), credenciais opcionais, disclosure e metadados de verificação. Os cinco perfis herdados são demos; `autoria-pendente` é marcador técnico. Somente autor `verified`, com `verifiedAt`, permite conteúdo real sair de draft. Confirmações internas vivem fora do perfil público.

Drafts distinguem `scaffold`, `writing` e `review-ready`. O briefing separado precisa estar `ready-for-writing` antes da redação factual; candidateSources e rejectedSources não contam como fontes confirmadas.

Como um artigo, um autor e uma categoria são estruturados na fase 1 (MDX no
repositório). Este é o contrato entre a redação e o código.

---

## 1. Categorias (taxonomia fixa)

A fase 1 tem **exatamente 6 categorias**. Novas categorias requerem decisão
editorial e mudança em `content/categorias.json`.

| Slug                   | Nome exibido         |
| ---------------------- | -------------------- |
| `energia`              | Energia              |
| `sustentabilidade`     | Sustentabilidade     |
| `ciencia`              | Ciência              |
| `tecnologia`           | Tecnologia           |
| `desenvolvimento`      | Desenvolvimento      |
| `transicao-energetica` | Transição Energética |

Cada categoria pode ter, opcionalmente, um **patrocinador** (fase 2+).

---

## 2. Artigo (MDX)

### Contrato de capa implementado

```yaml
cover:
  src: "/images/articles/<slug>/cover-1200.jpg"
  alt: "Descrição objetiva da informação visual"
  width: 1200
  height: 630
  caption: "Legenda opcional"
  credit: "Crédito verificável"
  sourceUrl: "<URL_REAL_DA_ORIGEM>"
  license: "Licença verificada"
  focalPoint: { x: 50, y: 40 }
  sources:
    - { src: "/images/articles/<slug>/cover-640.jpg", width: 640 }
    - { src: "/images/articles/<slug>/cover-1200.jpg", width: 1200 }
```

`width` e `height` são pareados e só entram quando conhecidos. Imagem editorial rejeita alt vazio; imagem puramente decorativa exige `decorative: true`. As capas demo atuais registram `license: unknown` e permanecem pendentes de substituição.

### 2.1 Caminho e nome

```
content/articles/<slug>.mdx
```

O `slug` é o mesmo que aparece na URL: `/artigo/<slug>`. Kebab-case, sem
acento, sem stopwords desnecessárias.

Exemplos:

- `content/articles/hidrogenio-verde-no-brasil.mdx`
- `content/articles/leilao-a-6-2025-analise.mdx`

### 2.2 Frontmatter obrigatório

O contrato implementado vive em `src/content/schema.ts`. Além dos campos básicos, ele exige `slug`, `contentType`, `status`, `isDemo`, `sponsored`, `sourceUrls` e seus guardrails. `publishedAt` é obrigatório quando `status: published`; `sponsorName` é obrigatório quando `sponsored: true`.

```yaml
---
title: "Hidrogênio verde no Brasil: promessa e realidade"
description: "Análise técnica dos projetos anunciados até 2026 e o gap entre capacidade instalada e demanda global."
cover: "/covers/hidrogenio-verde-brasil.jpg"
coverAlt: "Planta industrial de eletrólise ao entardecer, vista aérea"
author: "ana-souza"
category: "transicao-energetica"
tags: ["hidrogênio", "eletrólise", "exportação", "porto do pecém"]
publishedAt: "2026-07-11"
updatedAt: "2026-07-11"
readingTime: 9
featured: false
sponsored: null
seo:
  canonical: "/artigo/hidrogenio-verde-no-brasil"
  ogImage: "/covers/hidrogenio-verde-brasil.jpg"
  noindex: false
---
```

### 2.3 Schema (validação Zod)

```ts
// referência — implementação em src/content-lib/schema.ts na fase de código
ArticleFrontmatter = {
  title: string (10..120 chars)
  description: string (60..180 chars)
  cover: string (path começando com "/")
  coverAlt: string (não vazio)
  author: string (slug em content/autores/)
  category: enum das 6 categorias
  tags: string[] (1..8 itens, kebab-case ou palavras)
  publishedAt: ISO date (YYYY-MM-DD)
  updatedAt: ISO date >= publishedAt
  readingTime: int (1..60, calculado ou manual)
  featured: boolean (default false)
  sponsored: null | { by: string, disclosure: string }
  seo: {
    canonical: string (default derivado do slug)
    ogImage: string (default = cover)
    noindex: boolean (default false)
  }
}
```

### 2.4 Corpo do artigo

- Escrito em MDX restrito. Pode usar `<Callout>`, `<Figure>`, `<Quote>` e
  `<KeyPoints>`. Imports, exports, expressões JavaScript e HTML arbitrário são rejeitados.
- **Primeiro parágrafo** é o lead — 1 ou 2 frases resumindo o essencial.
- Subtítulos usam `##` e `###`. Nunca `#` no corpo (o `h1` é o título).
- **Toda afirmação factual** cita fonte via link ou nota de rodapé.
- **Toda imagem** dentro do corpo usa `<Figure src alt caption credit />`.
- Nunca embutir HTML bruto arbitrário.

### 2.5 Regras editoriais

- Título: claro, informativo, sem clickbait. Preferir substantivo sobre verbo.
- Descrição: promete o que o artigo entrega. É usada em `og:description`.
- Capa alvo: 1200×630 (também pode virar `og:image`). JPG/WebP para foto, PNG para infográfico; SVG apenas para arte textual controlada e após validar compatibilidade social.
- Tempo de leitura: calculado por ~200 palavras/min, arredondado para cima.
- Nunca publicar sem revisão editorial (checklist no PR).

---

## 3. Autor

### 3.1 Caminhos

```
content/authors.json
content/author-onboarding/<slug>.yml
```

O primeiro contém somente o perfil público. O segundo contém confirmações internas e nunca é importado pela aplicação.

### 3.2 Perfil público

```yaml
slug: "<slug-fornecido>"
displayName: "<nome-público-autorizado>"
shortBio: "<bio-curta-fornecida>"
expertise: ["<área-fornecida>"]
credentials: []
socialLinks: {}
status: pending
isDemo: false
```

`fullBio`, `role`, `organization`, `credentials`, `profileImage`, `socialLinks` e `disclosure` são opcionais. `verified` exige `verifiedAt`; nenhuma credencial é obrigatória.

---

## 4. Conteúdo patrocinado

Se `sponsored` está preenchido:

```yaml
sponsored:
  by: "WEG"
  disclosure: "Este conteúdo é patrocinado pela WEG. A pauta e o texto são de responsabilidade editorial da Sul Global."
```

- `SponsoredBadge` **sempre visível** no topo e no rodapé do artigo.
- URL não muda (nada de `/patrocinado/...` disfarçado).
- `robots` permanece indexável, mas o `disclosure` deve constar no corpo.

---

## 5. SEO por artigo

Cada artigo gera automaticamente:

- `<title>` = `${title} — Sul Global`.
- `<meta name="description">` = `description`.
- `og:title`, `og:description`, `og:image`, `og:type=article`,
  `og:published_time`, `og:updated_time`.
- `twitter:card=summary_large_image`.
- `<link rel="canonical">` = `seo.canonical`.
- JSON-LD `Article` com `headline`, `author`, `datePublished`, `image`,
  `publisher`.

---

## 6. Índice e busca

- No build, `src/content-lib` gera um índice JSON com todos os artigos
  (metadata apenas, sem corpo).
- Home, categoria e busca leem do índice via loader.
- Corpo MDX carregado só na página do artigo.

---

## 7. Checklist de publicação (usado no PR)

- [ ] Frontmatter completo e validado.
- [ ] `coverAlt` descritivo.
- [ ] Todas as imagens no corpo têm `alt` e crédito.
- [ ] Fontes citadas em toda afirmação factual.
- [ ] `readingTime` conferido.
- [ ] `description` entre 60 e 180 caracteres.
- [ ] Capa 1200×630 otimizada (< 200 kB) e dimensões reais registradas.
- [ ] Crédito, origem e licença verificados; `unknown` impede publicação real.
- [ ] Categoria correta e tags relevantes.
- [ ] Se patrocinado, `disclosure` visível.
- [ ] Preview do artigo em dev antes do merge.
