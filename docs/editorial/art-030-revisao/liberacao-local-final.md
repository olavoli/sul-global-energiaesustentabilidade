# ART-030 — liberação local final

Preparação concluída em 10/10/2026, branch `main`. Sem staging, commit, push, deploy ou escrita em produção.

## Confirmação editorial específica

O responsável editorial confirmou diretamente que o ART-030 foi produzido de maneira independente, sem patrocínio, pagamento, parceria comercial ou conflito de interesse identificado. A declaração foi registrada como comentário no briefing, com `conflictsOfInterestEvaluated: true`. O MDX conserva `sponsored: false`, sem `sponsorName`, conforme os campos existentes. Não foram criados campos ou proibição geral de relações futuras: cada artigo com relação comercial deve ser avaliado e divulgado individualmente.

## Procedimento oficial executado localmente

1. Briefing consolidado atualizado para `ready-for-writing` e MDX para `draftStage: review-ready`.
2. `bun run research:validate -- <slug>`: aprovado, cinco fontes confirmadas, zero perguntas abertas e zero bloqueadores.
3. `bun run content:status -- <slug> review --apply`: `draft → review`.
4. `bun run content:status -- <slug> approved --apply`: `review → approved`.
5. `content:publish-check`, com ambiente oficial e URL definidos apenas no processo local: zero erros e zero warnings.
6. `bun run content:status -- <slug> published --apply`: `approved → published`.
7. Índices regenerados somente pelo gerador oficial.

A CLI registrou `approvedAt: 2026-10-10` e `publishedAt: 2026-10-10`. `isDemo: false` foi preservado. O estado `published` existe somente nos arquivos locais; a produção não recebeu essa alteração.

## Diff de publicação

```diff
-status: draft
-draftStage: writing
+status: published
+publishedAt: 2026-10-10
+approvedAt: 2026-10-10
+draftStage: review-ready
```

```diff
-conflictsOfInterestEvaluated: false
-researchStatus: fact-checking
+conflictsOfInterestEvaluated: true
+researchStatus: ready-for-writing
```

O teste do ART-030 agora verifica publicação/inclusão pública, avaliação de pesquisa, canonical e social metadata; conserva uma regressão que oculta o mesmo registro quando seu estado é draft. O V3 e seus componentes continuam íntegros: cinco pontos-chave, uma EditorialTable, um Callout “O Paradoxo da Eficiência”, cinco referências e o cálculo hipotético de 150 kW. Imagens, alt e legendas não foram alterados nesta rodada; hashes preservados.

Os índices rastreados têm somente adições do ART-030: 91 linhas em `articles.ts` e duas em `loaders.ts`. Nenhum registro publicado anterior foi editado. O MDX e os demais arquivos novos ainda são untracked; o `git diff --stat` comum não os contabiliza.

## Distribuição e metadados

- Presente em listagem pública, categoria Energia, autor Olavo Oliveira, consulta por slug e busca por Rankine, com e sem demos permitidos.
- Presente no sitemap e RSS produzidos pelos geradores existentes. Evidências locais: `sitemap-local.xml` e `rss-local.xml` neste diretório. São snapshots de auditoria, não substituições das rotas globais.
- Canonical: `https://sulglobalenergia.com.br/artigo/a-maquina-que-transforma-calor-desperdicado-em-eletricidade`.
- SEO title e descrição editorial preservados; OG article, hero 2848 × 1600 com alt e Twitter `summary_large_image` validados.
- Uma Nota de Transparência, sem frase de rascunho e sem avisos individuais nas imagens.
- A confirmação de independência é específica do artigo; não altera política comercial do portal.

## Arquivos previstos para commit

35 arquivos: o pacote original do ART-030 e dois testes existentes ajustados para contemplar sua inclusão legítima na coleção publicada.

| Grupo | Quantidade | Caminhos |
| --- | ---: | --- |
| Artigo | 1 | `content/articles/a-maquina-que-transforma-calor-desperdicado-em-eletricidade.mdx` |
| Briefing | 1 | `content/research/a-maquina-que-transforma-calor-desperdicado-em-eletricidade.yml` |
| Imagens | 3 | `public/images/articles/a-maquina-que-transforma-calor-desperdicado-em-eletricidade/` — hero, funcionamento e comparativo PNG |
| Teste | 1 | `src/content/art-030.test.tsx` |
| Regressões de publicação | 2 | `src/content/art-028.test.tsx`, `scripts/staging/staging-readiness.test.ts` |
| Índices | 2 | `src/content/generated/articles.ts`, `src/content/generated/loaders.ts` |
| Dossiê editorial | 25 | `docs/editorial/art-030-revisao/` — 12 Markdown, 11 JPEGs e dois XMLs de evidência |

Os documentos anteriores são registros históricos e não conteúdo servido ao leitor. Este documento é o registro vigente e supera os bloqueios já resolvidos. Nenhum arquivo de `artifacts/`, `.wrangler/`, `.output/`, configuração, secret ou alteração não relacionada entra no commit proposto. O staging será feito somente com os caminhos explícitos documentados na preparação; nunca com `git add -A`.

## Validações finais

| Verificação | Resultado |
| --- | --- |
| Briefing e gate de pesquisa | Aprovados |
| Gate de publicação | Zero erros/warnings antes da transição |
| Testes pertinentes | 46 aprovados, zero falhas, 336 expectativas em quatro arquivos |
| Dois arquivos de regressão corrigidos | 23 testes aprovados, zero falhas, 112 expectativas |
| Suíte completa após correção das expectativas | 808 testes aprovados, zero falhas, 3049 expectativas em 87 arquivos |
| Typecheck | Aprovado após ajustar a tipagem de uma expectativa no novo teste de SEO |
| Lint pertinente | Aprovado |
| Build local com origem oficial | Aprovado |
| Validação de conteúdo | Aprovada; 43 artigos, 26 avisos preexistentes, zero erros |
| `git diff --check` | Aprovado |

A suíte completa revelou duas expectativas anteriores à inclusão do ART-030: o artigo mais recente no teste do ART-028 e a lista fixa de publicações no teste de staging. Foram corrigidas somente nos dois arquivos autorizados; a ordem cronológica de toda a coleção passou a ser verificada explicitamente. Nenhum teste foi removido, ignorado ou isolado. Typecheck, lint pertinente, build local com origem oficial e validação de conteúdo foram repetidos após a correção. Esta atualização não autoriza staging, commit, push ou deploy; aguarda nova conferência do responsável editorial.

## Pendências e limites

Não há bloqueador editorial/técnico encontrado para o pacote local. Permanecem recomendações não bloqueantes da auditoria visual: PNGs totalizando 12,11 MB, legibilidade dos textos rasterizados no celular e rolagem interna da tabela. Nenhuma melhoria fora do escopo foi feita.

A publicação efetiva ainda depende de autorização do diff final, commit/push, CI aprovado e autorização de deploy controlado com `--keep-vars`, conforme `docs/DEPLOYMENT.md`. Não foram feitas chamadas reais ao Kit, novas inscrições, migrations, alterações de banco, configurações, CSP, newsletter ou comentários. `artifacts/` permaneceu intocado.
