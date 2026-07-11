# CONTENT_MODEL.md — Sul Global

Como um artigo, um autor e uma categoria são estruturados na fase 1 (MDX no
repositório). Este é o contrato entre a redação e o código.

---

## 1. Categorias (taxonomia fixa)

A fase 1 tem **exatamente 6 categorias**. Novas categorias requerem decisão
editorial e mudança em `content/categorias.json`.

| Slug                  | Nome exibido           |
|-----------------------|------------------------|
| `energia`             | Energia                |
| `sustentabilidade`    | Sustentabilidade       |
| `ciencia`             | Ciência                |
| `tecnologia`          | Tecnologia             |
| `desenvolvimento`     | Desenvolvimento        |
| `transicao-energetica`| Transição Energética   |

Cada categoria pode ter, opcionalmente, um **patrocinador** (fase 2+).

---

## 2. Artigo (MDX)

### 2.1 Caminho e nome

```
content/artigos/<slug>.mdx
```

O `slug` é o mesmo que aparece na URL: `/artigo/<slug>`. Kebab-case, sem
acento, sem stopwords desnecessárias.

Exemplos:
- `content/artigos/hidrogenio-verde-no-brasil.mdx`
- `content/artigos/leilao-a-6-2025-analise.mdx`

### 2.2 Frontmatter obrigatório

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

- Escrito em MDX. Pode importar componentes seguros: `<Callout>`, `<Figure>`,
  `<Quote>`, `<DataTable>`, `<Aside>`. Nada além do whitelist.
- **Primeiro parágrafo** é o lead — 1 ou 2 frases resumindo o essencial.
- Subtítulos usam `##` e `###`. Nunca `#` no corpo (o `h1` é o título).
- **Toda afirmação factual** cita fonte via link ou nota de rodapé.
- **Toda imagem** dentro do corpo usa `<Figure src alt caption credit />`.
- Nunca embutir HTML bruto arbitrário.

### 2.5 Regras editoriais

- Título: claro, informativo, sem clickbait. Preferir substantivo sobre verbo.
- Descrição: promete o que o artigo entrega. É usada em `og:description`.
- Capa: 1200×630 (também vira `og:image`). JPG para foto, PNG para infográfico.
- Tempo de leitura: calculado por ~200 palavras/min, arredondado para cima.
- Nunca publicar sem revisão editorial (checklist no PR).

---

## 3. Autor

### 3.1 Caminho

```
content/autores/<slug>.mdx
```

### 3.2 Frontmatter

```yaml
---
name: "Ana Souza"
role: "Editora de Transição Energética"
bio: "Doutora em Engenharia de Energia pela UFRJ. Cobre políticas públicas de transição desde 2018."
avatar: "/autores/ana-souza.jpg"
links:
  website: "https://anasouza.example"
  linkedin: "https://linkedin.com/in/anasouza"
  orcid: "0000-0000-0000-0000"
---
```

O corpo MDX é a versão longa da biografia (opcional).

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
- [ ] Capa 1200×630 otimizada (< 200kb).
- [ ] Categoria correta e tags relevantes.
- [ ] Se patrocinado, `disclosure` visível.
- [ ] Preview do artigo em dev antes do merge.