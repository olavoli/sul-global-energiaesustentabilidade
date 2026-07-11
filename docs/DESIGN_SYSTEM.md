# DESIGN_SYSTEM.md — Sul Global

Inspiração: **Bloomberg Green**. Editorial denso, verde escuro sobre off-white,
serifada forte para títulos, sans humanista para corpo, ar técnico e sério.
Nunca infantil, nunca festivo, nunca "startup roxo-com-gradiente".

> **Regra dura:** cores, fontes e espaçamentos definidos aqui viram tokens em
> `src/styles.css`. Componentes **nunca** hardcodam `text-white`, `bg-black` ou
> `bg-[#...]`. Só tokens semânticos (`bg-background`, `text-foreground`,
> `bg-primary`, etc.).

## Paleta (tokens semânticos)

Formato oficial dos tokens: `oklch`. Valores abaixo são a referência de
direção — números finais serão fixados na etapa 2 (Design System em código).

### Modo claro (default)

| Token                     | Uso                                     | Direção                       |
|---------------------------|-----------------------------------------|-------------------------------|
| `--background`            | Fundo do site                           | Off-white quente (~oklch 0.98 0.01 90) |
| `--foreground`            | Texto principal                         | Quase-preto tinta (~oklch 0.18 0.02 150) |
| `--primary`               | Verde Sul Global (marca)                | Verde escuro editorial (~oklch 0.42 0.10 160) |
| `--primary-foreground`    | Texto sobre primary                     | Off-white                     |
| `--accent`                | Destaque editorial (categorias, tags)   | Verde vivo (~oklch 0.65 0.15 155) |
| `--muted`                 | Superfícies secundárias                 | Bege palha claro              |
| `--muted-foreground`      | Metadados, datas, autor                 | Cinza grafite                 |
| `--border`                | Divisórias finas entre matérias         | Cinza pedra                   |
| `--destructive`           | Erros de formulário                     | Vermelho tijolo               |

### Modo escuro

Inverte fundo/foreground; primary vira verde mais claro para contraste; accent
preserva croma. Detalhes finais na etapa 2.

## Tipografia

- **Títulos e manchetes:** serifada editorial forte.
  Candidata: **Instrument Serif**, **DM Serif Display**, ou **Newsreader**.
  Escolha final na etapa 2.
- **Corpo, UI e metadados:** sans humanista de leitura longa.
  Candidata: **Inter Tight**, **Work Sans** ou **Söhne-like**.
- **Mono (código, dados):** JetBrains Mono ou similar.

Carregamento via `<link>` no `head()` do `__root.tsx`, **não** via `@import` no
CSS (regra Tailwind v4 + Lightning CSS deste template).

### Escala tipográfica (rem)

| Nível         | Tamanho | Peso     | Uso                        |
|---------------|---------|----------|----------------------------|
| `display`     | 4.0     | 700 serif| Hero principal da home     |
| `h1`          | 2.75    | 700 serif| Título de artigo           |
| `h2`          | 2.0     | 600 serif| Seções da home, categorias |
| `h3`          | 1.5     | 600 serif| Subtítulos de artigo       |
| `lead`        | 1.25    | 400 sans | Resumo de artigo           |
| `body`        | 1.125   | 400 sans | Texto corrido              |
| `small`       | 0.875   | 500 sans | Metadados                  |
| `overline`    | 0.75    | 600 sans, uppercase, tracking wide | Rótulo de categoria |

Linha: `1.65` no corpo, `1.15` nos títulos. Medida máxima do corpo: `72ch`.

## Espaçamento

Escala base **4px**. Uso preferencial: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128`.
Grid editorial de 12 colunas com gutter de 24px em desktop, 16px em mobile.

## Radius

Baixo. Sul Global é editorial, não SaaS.
- `--radius`: `4px`.
- Botões e inputs herdam. Nada de `rounded-2xl` em cards de matéria.

## Sombras

Mínimas. Editorial vive de linha, não de elevação.
- `--shadow-hairline`: `0 1px 0 var(--border)`.
- `--shadow-soft`: usado só em dropdowns e menus, não em cards.

## Componentes (regras visuais)

- **ArticleCard:** capa 16:9 + overline (categoria) + h3 serif + lead sans +
  byline. Sem sombra, divisória por `--border`.
- **HeroStory:** capa grande + h1 serif display + lead longo. Vive na home.
- **CategoryStrip:** faixa horizontal com nome da categoria + 3–4 cards.
- **Tag:** pílula `accent` clara, sem borda arredondada exagerada.
- **SponsoredBadge:** overline com fundo `muted` e prefixo "Patrocinado por".
  Sempre visível e nunca disfarçado de conteúdo editorial.
- **AdSlot:** retângulo com `border` tracejada em dev, invisível em prod até
  ativação real.

## Acessibilidade

- Contraste AA mínimo, AAA em textos ≤ 18px sempre que possível.
- Foco visível em todos elementos interativos (`--ring`).
- `prefers-reduced-motion` respeitado.
- Todo `<img>` de conteúdo tem `alt`. Decorativos usam `alt=""`.
- Ordem semântica: um `<h1>` por página, hierarquia contínua.

## O que **nunca** fazer

- Gradientes roxos, cyan neon, vidro fosco (glassmorphism).
- Emoji como ícone de UI.
- Fontes decorativas (Poppins, Comic, script).
- Card com sombra grande + radius grande (visual SaaS).
- Cor hardcoded fora dos tokens.