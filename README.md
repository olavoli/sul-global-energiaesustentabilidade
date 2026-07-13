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

- Bun instalado
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

Para visualizar o build localmente:

```bash
bun run preview
```

## Qualidade

```bash
bun run typecheck
bun run lint
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

## Licença

Licença a definir.
