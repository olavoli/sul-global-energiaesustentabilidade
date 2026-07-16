# Publicação, SEO e distribuição

## Configuração pública

`VITE_PUBLIC_SITE_URL` é a única origem usada por canonicals, Open Graph, JSON-LD, sitemap e RSS. `VITE_APP_ENV` distingue ambientes. Desenvolvimento pode usar `http://localhost:8080`; build sem ambiente explícito é preview. Produção só fica indexável com `VITE_APP_ENV=production`, URL pública absoluta não local e demos desativadas; nenhum domínio fictício é assumido.

`VITE_ALLOW_DEMO_CONTENT=false` é o padrão de produção. Artigos demo não entram em páginas, sitemap ou RSS. Uma implantação demonstrativa precisa de opt-in explícito e continua marcada visualmente.

## Build e preview

```bash
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun test
bun run build
bun run smoke:artifact
bun run preview
```

O preview usa Node `>=20` para executar o Wrangler local instalado, servindo o worker e os assets Nitro. Smoke usa Bun e não depende de internet. Encerre o preview após a validação.

## Endpoints e indexação

- `/robots.txt`: libera rastreamento somente em build de produção com URL pública configurada; nos demais ambientes usa `Disallow: /`.
- `/sitemap.xml`: inclui páginas e artigos somente em produção oficial; ambientes não oficiais retornam XML sem URLs.
- `/rss.xml`: publica itens somente em produção oficial; ambientes não oficiais retornam feed vazio e identificado.
- `/busca`: sempre usa `noindex, follow`.
- Artigos, categorias, autores e páginas institucionais expõem canonical e metadados sociais.

## Dados estruturados

A home publica `Organization` e `WebSite`; artigos usam `Article` ou `NewsArticle`; páginas editoriais usam `BreadcrumbList`; autores usam `Person`. Autor, publisher, datas, imagem e canonical são derivados dos mesmos dados validados do conteúdo.

## Pré-lançamento

- Definir a URL oficial em `VITE_PUBLIC_SITE_URL` e validar que não há canonicals locais.
- Validar com o fundador o placeholder social local 1200×630 e fornecer formato aceito pelos crawlers do ambiente final.
- Substituir ou licenciar as 12 capas externas; registrar dimensões, créditos e origem.
- Validar HTML SSR, códigos HTTP, sitemap, RSS e robots no ambiente de produção.
- Confirmar que demos estão desativadas e que nenhum rascunho aparece publicamente.
- Auditar Core Web Vitals e compartilhamento social no domínio real.

## Monetização futura

Não há scripts, slots, IDs de rede ou `ads.txt` ativos. Um futuro `ads.txt` deve conter somente domínio do fornecedor, publisher ID real, relação e autoridade certificadora confirmados. Nunca publicar placeholders, IDs inventados ou autorizar vendedores antes da contratação e da revisão editorial/jurídica.

`AdSlot` existe apenas como contrato estrutural desativado. Não está inserido em páginas e não reserva espaço com `advertisingConfig.enabled=false`. Qualquer ativação exige medição de Core Web Vitals, política comercial, consentimento aplicável e IDs reais aprovados.
