# ROADMAP.md — Sul Global

Quatro fases. Cada fase só começa quando a anterior está estável e o gatilho
de entrada foi atingido.

---

## Fase 1 — Fundação (0 a 3 meses)

**Objetivo:** portal público no ar, SEO técnico impecável, três artigos por
semana, newsletter capturando.

**Gatilho de entrada:** documentos-constituição aprovados.

**Escopo:**
- Documentos em `docs/` + `PROJECT_RULES.md` na raiz.
- Design System em `src/styles.css` (tokens Bloomberg Green).
- Header e Footer.
- Home editorial (hero + faixas por categoria + CTA newsletter).
- Página de artigo (renderiza MDX).
- Página de categoria.
- Busca simples client-side sobre o índice MDX.
- Newsletter (Lovable Cloud: tabela `subscribers`, RLS).
- Slots de anúncio como placeholders (sem script).
- Sitemap, RSS, robots, JSON-LD.
- Páginas institucionais: `/sobre`, `/contato`.

**Fora do escopo:**
- Anúncios ativos.
- Comentários, login, mobile app.
- Multi-idioma.
- CMS visual.

**Gatilho de saída:** 30 artigos publicados, 500 assinantes de newsletter,
Core Web Vitals verdes.

---

## Fase 2 — Audiência (3 a 9 meses)

**Objetivo:** crescer alcance orgânico, começar a monetizar com integridade.

**Escopo:**
- Google Analytics 4.
- AdSense em slots já reservados (com respeito à performance).
- Primeiros patrocínios de categoria (ex.: "Hidrogênio Verde patrocinado
  por WEG").
- Página de imprensa e mídia kit.
- Newsletter segmentada por categoria.
- Parcerias com universidades e pesquisadores (colunistas convidados).
- Otimização de performance (LCP < 2.0s, INP < 200ms).

**Gatilho de saída:** 10k sessões/mês, 3k assinantes, receita mínima
recorrente estável.

---

## Fase 3 — Plataforma (9 a 18 meses)

**Objetivo:** virar plataforma editorial completa, com CMS, membros e
produtos.

**Escopo:**
- Migrar conteúdo de MDX para Supabase (artigos, autores, categorias, tags).
- Painel editorial interno (roles: admin, editor, autor).
- Área de membros: **Gratuito / Premium / Empresas / Universidades**.
- Stripe (assinatura Sul Global Premium, ex.: R$19/mês).
- Google Ad Manager (campanhas, parceiros, patrocinadores).
- Conteúdo patrocinado estruturado (schema `SponsoredContent`).
- Eventos e webinars integrados (inscrição via portal).
- i18n: PT-BR + EN.

**Gatilho de saída:** 100k sessões/mês, 500 assinantes pagos, 3
patrocinadores institucionais.

---

## Fase 4 — Ecossistema (18+ meses)

**Objetivo:** Sul Global vira referência e infraestrutura de dados do setor.

**Escopo:**
- **Marketplace:** cursos, livros, consultorias, eventos presenciais.
- **API pública de dados de energia** (freemium por consulta).
- Doações (PIX, Apoia.se, GitHub Sponsors).
- App mobile (se justificado por métricas).
- Programa de bolsas para pesquisadores publicarem.

---

## Regras do roadmap

- **Nunca pular fase.** Se algo da fase 3 é urgente, primeiro cumprir os
  gatilhos da fase atual.
- **Nunca ativar monetização** que degrade Core Web Vitals abaixo do verde.
- **Nunca aceitar patrocínio** que interfira em pauta editorial.
- Toda mudança de fase requer decisão consciente e revisão dos documentos.