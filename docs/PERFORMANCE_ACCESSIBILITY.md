# Performance, mídia e acessibilidade

## Contrato de imagem

O contrato implementado em `editorialImageSchema` usa um objeto único:

- `src` e `alt`; `alt` é obrigatório para mídia editorial e vazio somente quando `decorative: true`;
- `width` e `height` opcionais, mas sempre informados em conjunto e somente quando conhecidos;
- `caption`, `credit`, `sourceUrl` e `license` opcionais;
- `focalPoint` em percentuais de 0 a 100;
- `loading` e `fetchPriority` como decisões progressivas;
- `sources` para variantes reais de `srcset`, cada uma com URL e largura.

Legenda não substitui `alt`. Crédito deve ser visível quando necessário. `license: unknown` é risco explícito, não autorização de uso. O componente `EditorialImage` aplica geometria estável, `sizes`, lazy loading, prioridade apenas quando solicitada, `decoding="async"`, política de referrer e fallback acessível. Sem pipeline de variantes, `srcset` permanece ausente: URLs derivadas não são inventadas.

## Inventário atual

### Ativos locais

| Ativo | Classe | Dimensões | Uso | Origem/licença | Risco |
| --- | --- | ---: | --- | --- | --- |
| `/favicon.ico` | local, UI | múltiplas resoluções não auditadas; 20.373 bytes | favicon | herdado do projeto; licença não documentada | validar proveniência |
| `/images/social/sul-global-editorial-placeholder.svg` | local, social, temporário | 1200×630 | fallback OG/Twitter | criado no projeto, somente texto e formas | validar com o fundador e com crawlers sociais |

### Capas externas demonstrativas

Todas são editoriais, externas, temporárias e demonstrativas. O host é o CDN do Unsplash, mas o repositório não contém autor, crédito, página de origem ou prova de licença; portanto a classificação jurídica é **licença desconhecida**. O parâmetro `w=1600` limita a largura solicitada, mas não comprova largura entregue, altura ou proporção intrínseca. Todas têm `alt`; nenhuma tem dimensões conhecidas. O componente agora reserva 16:10 no hero e 16:9 em cards/artigo, reduzindo CLS sem alegar dimensão do arquivo.

| Artigo / URL | Dobra e proporção de apresentação | Risco de quebra | Risco jurídico |
| --- | --- | --- | --- |
| Amazônia — `https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1600&q=75&auto=format&fit=crop` | artigo próximo da dobra; cards 16:9 | alto: terceiro | alto: licença/crédito não comprovados |
| Baterias de sódio — `https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&q=75&auto=format&fit=crop` | artigo próximo da dobra; cards 16:9 | alto | alto |
| Captura de carbono — `https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=1600&q=75&auto=format&fit=crop` | artigo próximo da dobra; cards 16:9 | alto | alto |
| Eólica offshore — `https://images.unsplash.com/photo-1508615039623-a25605d2b022?w=1600&q=75&auto=format&fit=crop` | artigo próximo da dobra; cards 16:9 | alto | alto |
| Financiamento verde — `https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1600&q=75&auto=format&fit=crop` | artigo próximo da dobra; cards 16:9 | alto | alto |
| Fusão nuclear — `https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&q=75&auto=format&fit=crop` | artigo próximo da dobra; cards 16:9 | alto | alto |
| Hidrogênio verde — `https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1600&q=75&auto=format&fit=crop` | home acima da dobra 16:10; artigo 16:9 | alto e relevante para LCP | alto |
| Leilão A-6 — `https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1600&q=75&auto=format&fit=crop` | destaque/card e artigo | alto | alto |
| Materiais críticos — `https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?w=1600&q=75&auto=format&fit=crop` | artigo próximo da dobra; cards 16:9 | alto | alto |
| Redes inteligentes — `https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1600&q=75&auto=format&fit=crop` | artigo próximo da dobra; cards 16:9 | alto | alto |
| Supercondutores — `https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=1600&q=75&auto=format&fit=crop` | artigo próximo da dobra; cards 16:9 | alto | alto |
| Transição justa — `https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?w=1600&q=75&auto=format&fit=crop` | artigo próximo da dobra; cards 16:9 | alto | alto |

Antes do lançamento, cada capa deve ser substituída por ativo próprio/licenciado em `public/images/articles/<slug>/`, com dimensões, crédito, origem e licença verificáveis. Não copiar arquivos atuais sem autorização.

## Fontes

- `Newsreader`: Google Fonts externo, pesos 400/600/700, `display=swap`; licença SIL Open Font License 1.1 conforme o [repositório do projeto](https://github.com/productiontype/Newsreader).
- `Inter Tight`: Google Fonts externo, pesos 400/500/600/700, `display=swap`; família Inter distribuída sob SIL Open Font License 1.1 conforme a [licença upstream](https://github.com/rsms/inter/blob/master/LICENSE.txt).
- Fallbacks locais: Georgia/Times para serif e Inter/system-ui/sans-serif para interface.

Não há arquivos de fonte no repositório. Permanecem duas origens externas e possível bloqueio/FOUT; a identidade tipográfica foi preservada. Newsreader 500 foi removida da solicitação por não haver uso comprovado. Autohospedagem futura deve versionar arquivos e licenças, conferir subconjunto PT-BR e medir custo antes da troca.

## Orçamento inicial

Este é um limite de engenharia, não métrica de campo:

| Recurso | Orçamento recomendado |
| --- | ---: |
| JavaScript inicial gzip | até 130 kB |
| CSS gzip | até 15 kB |
| imagem LCP | até 200 kB, 1200–1600 px no maior breakpoint |
| imagem editorial comum | até 250 kB por variante |
| famílias externas | até 2 |
| arquivos de fonte iniciais | até 4 |
| CLS esperado em laboratório | abaixo de 0,1 |

Medir bundle a cada build. Lighthouse, RUM e métricas de campo ainda não existem; não há pontuação estimada de LCP, CLS ou INP.

Na validação da Sprint 7, o chunk JavaScript inicial ficou em 117,04 kB gzip e o CSS em 13,99 kB gzip, dentro dos limites acima. Esses números são medidas do artefato local, não métricas de experiência em campo.

## Acessibilidade

- foco visível global e movimento reduzido já são respeitados;
- menu móvel agora recebe foco inicial, contém Tab, fecha com Escape e devolve foco ao gatilho;
- gatilho expõe `aria-expanded` e `aria-controls`;
- breadcrumbs visíveis usam `nav`, `ol` e `aria-current`;
- imagens quebradas têm fallback perceptível; decorativas não são anunciadas;
- disclosure patrocinado possui rótulo explícito;
- aviso demo usa status anunciado;
- formulários preservam labels reais e mensagens anunciáveis;
- links externos usam `noopener noreferrer`.

Contraste, zoom, reflow, leitor de tela e navegação completa por teclado ainda exigem validação manual em navegador/dispositivo.

## Publicidade futura

`AdSlot` e `advertisingConfig` apenas definem nome semântico, posição e altura mínima futura. A configuração permanece `enabled: false`; nesse estado o componente retorna `null`, não reserva espaço e não mostra placeholder. Não há script, fornecedor, ID, tracking, CMP ou slot inserido nas páginas.

## Segurança e privacidade de mídia

As URLs atuais não contêm tokens observados nem pixels de rastreamento conhecidos, mas dependem de terceiro. Imagens usam `strict-origin-when-cross-origin`. Não há proxy, SVG remoto nem HTML editorial arbitrário. A CSP inicial declara `img-src`, `font-src`, `style-src` e `connect-src`, preservando temporariamente Unsplash e Google Fonts. CDN própria futura deve preservar cache, tipos MIME e remoção de metadata sensível.

## Privacidade do navegador

- `localStorage`: somente preferência `sul-global-theme`, sem PII e sem expiração automática.
- query `q`: termo de busca na URL/histórico, não persistido pela aplicação.
- clipboard e links sociais: usados somente após ação explícita do leitor.
- formulários: estado transitório em memória; nenhuma transmissão, persistência ou log.
- cookies/sessão: nenhum uso pela aplicação alcançável; o sidebar shadcn não montado contém suporte legado a cookie de preferência, a revisar antes de eventual uso.

Não há cookie banner porque não há cookie não essencial ativo. Analytics/publicidade futuros exigirão nova avaliação.

## Checklist pré-publicação

- [ ] Substituir ou comprovar licença/crédito das 12 capas externas.
- [ ] Registrar dimensões reais e variantes responsivas.
- [ ] Otimizar a imagem LCP dentro do orçamento.
- [ ] Validar o SVG social com fundador e crawlers; fornecer PNG 1200×630 se necessário.
- [ ] Executar teclado, zoom 200%, reflow 400%, contraste e leitor de tela.
- [ ] Medir Lighthouse em mobile e desktop sem inventar métricas de campo.
- [ ] Confirmar ausência de demos, tracking e publicidade ativa.
- [x] Executar install congelado, typecheck, lint, testes, build, dev e preview.

Na validação local da Sprint 7, install congelado, typecheck, lint, 42 testes, build e smoke de 14 endpoints passaram. O preview oficial foi executado com Node/Wrapper Wrangler em `http://127.0.0.1:8787/`, e o dev respondeu em `http://127.0.0.1:8081/`; ambos foram encerrados de forma controlada. Permanecem pendentes as verificações manuais e de campo listadas acima.
