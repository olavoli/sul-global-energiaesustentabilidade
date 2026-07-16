# Fluxo editorial com MDX

## Operação diária

Use `content:list` para inventário, `content:review -- <slug>` para relatório, `content:status -- <slug> <status>` para dry-run e `content:publish-check -- <slug>` para o gate somente leitura. Somente acrescente `--apply` à transição após revisar o resumo. O manual completo está em `EDITORIAL_OPERATIONS.md`.

Nenhum autor atual está verificado para conteúdo real. O marcador `autoria-pendente` mantém o piloto em draft; substitua-o somente após o fluxo de `AUTHOR_ONBOARDING.md`.

Antes da redação factual, complete `content/research/<slug>.yml`. O fluxo é `scaffold → pesquisa ready-for-writing → writing → review-ready → review`. `candidateSources` e fontes rejeitadas nunca contam como confirmação.

## Criar com segurança

Não copie demos. Use um template versionado por meio da CLI:

```bash
bun run content:new -- --type analysis --title "Título provisório" --slug titulo-provisorio --author <autor-verificado> --category energia --date YYYY-MM-DD --tag "energia solar"
```

Tipos aceitos: news, explainer, analysis, guide, interview e opinion. O arquivo é criado em `content/articles/`, sempre `draft`, sem fontes fabricadas e sem sobrescrever slug existente. Templates em `content/templates/` não entram no índice.

## Criar e validar

1. Copie um artigo de `content/articles/` e renomeie o arquivo com o novo slug.
2. Preencha o frontmatter conforme `src/content/schema.ts`; arquivo e `slug` devem coincidir.
3. Use um autor público verificado de `content/authors.json` e uma categoria de `src/data/categories.ts`.
4. Escreva em Markdown. Os únicos componentes JSX autorizados são `Callout`, `Quote`, `Figure` e `KeyPoints`.
5. Execute `bun run content:validate`.

## Estado e publicação

- Use `draft` durante autoria, `review` na revisão e `approved` somente após decisão humana explícita.
- Defina `published`, `publishedAt` e `approvedAt` somente após aprovação. `scheduled` exige `scheduledAt`, mas permanece oculto até mudança deliberada para `published`.
- `draft`, `review`, `approved`, `scheduled`, `archived` e `correction-needed` não aparecem nas consultas públicas.
- Erro relevante muda para `correction-needed`; após corrigir, percorre revisão e aprovação novamente.

## Imagens, fontes e transparência

- Toda capa usa o objeto `cover` e exige `alt`; legenda não substitui texto alternativo.
- Informe `width` e `height` juntos somente após verificar o arquivo.
- Registre crédito, `sourceUrl` e licença quando aplicáveis; `license: unknown` é bloqueio para conteúdo real.
- Use `sources` apenas para arquivos realmente gerados. Não derive URLs de terceiros nem copie mídia sem autorização.
- Imagem decorativa usa `decorative: true` e `alt: ""`.
- Conteúdo real usa `sources` estruturadas com título, URL, autoria/organização, tipo e `verifiedAt`. `sourceUrls` é legado dos demos.
- Links de fontes são abertos com `noopener noreferrer`.
- Para patrocínio, use `sponsored: true` e informe `sponsorName`; a interface exibe disclosure.
- Conteúdo fictício mantém `isDemo: true`. Produção o bloqueia por padrão; a habilitação deliberada mantém o aviso global.
- `updatedAt` exige nota ao leitor ou histórico de correção. Opinião, entrevista, guia e uso substancial de IA possuem campos próprios definidos nos padrões editoriais.

## Checklist antes de publicar

```bash
bun install --frozen-lockfile
bun run content:validate
bun run typecheck
bun run lint
bun run test
bun run build
bun run smoke:artifact
```

Revise título, resumo, categoria, autoria, datas, alt, dimensões, licença, fontes, patrocínio, fallback e renderização local antes de solicitar integração. Para lançamento, use também `EDITORIAL_LAUNCH_CHECKLIST.md`; `license: unknown`, `isDemo: true`, autoria não validada ou fonte sem verificação impedem publicação oficial.
