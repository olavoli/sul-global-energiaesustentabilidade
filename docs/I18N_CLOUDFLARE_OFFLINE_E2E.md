# Cloudflare-only: validação offline integral

## Resultado e escopo

O executor existente `runExperiment` montou dois artigos MDX completos a partir de seis respostas simuladas, três EN e três ES. O transporte é injetado; nenhuma credencial real ou inferência é usada. Não há segundo pipeline. As fixtures são construídas para testes, não são saídas de modelo nem traduções linguisticamente validadas. O teste rejeita cobertura incompleta ou valores de destino iguais à fonte para os segmentos classificados como traduzíveis.

## Cobertura por idioma e tipo

| Idioma | Lotes simulados | Prosa/títulos | Atributos MDX | Metadados | Equações/símbolos copiados | Pontuações copiadas | IDs enviados únicos | Segmentos montados | MDX |
| ------ | --------------: | ------------: | ------------: | --------: | -------------------------: | ------------------: | ------------------: | -----------------: | --- |
| EN     |               3 |            61 |             3 |         7 |                          9 |                   5 |                  71 |                 85 | OK  |
| ES     |               3 |            61 |             3 |         7 |                          9 |                   5 |                  71 |                 85 | OK  |

O corpo tem 78 segmentos: 64 traduzíveis e 14 protegidos. Com sete metadados, são 85 segmentos montados por idioma. Os 71 IDs enviados são conferidos contra o conjunto exato da fonte, por lote e idioma, sem omissões ou duplicações. Respostas são deliberadamente invertidas por ID e alternam objeto/string JSON; a montagem continua correta por ID.

Os sete metadados conferidos individualmente são `title`, `subtitle`, `excerpt`, `seoTitle`, `seoDescription`, `cover.alt` e `cover.caption`. Números e unidades passam pelos comparadores determinísticos; igualdades e símbolos técnicos são copiados literalmente. URLs, referências, créditos, atributos não traduzíveis e componentes ficam no esqueleto MDX preservado. Só o cabeçalho da bibliografia é localizado. Os quatro registros bibliográficos do artigo permanecem literais.

Foi corrigido um detalhe real no escopo experimental: a antiga regra `[A-Z]` classificava o artigo português `O ` como símbolo técnico. Agora apenas `P`, `E`, variáveis delta, igualdades e pontuações isoladas recebem essa proteção. `O ` é enviado ao tradutor. O prompt foi versionado como `cf-protected-leaves-v4`; nenhum registro financeiro histórico foi reprecificado.

## Parser, compilação e estado final

Cada MDX é relido por `parseEditorialFile`, tem o corpo reextraído por `prepare` e é compilado com `@mdx-js/mdx`, `remark-frontmatter` e `remarkEditorialSlots`, os mesmos módulos/plugins MDX da configuração do portal. Também é compilada a cópia final explicitamente marcada como fixture. Esta é uma verificação de parsing/compilação, não inspeção visual nem certificação linguística.

As duas saídas têm `status: draft`, `translationReview.status: pending`, `experimentDecision: REVIEW_REQUIRED`, `experimentOnly: true`, `publishable: false` e `isDemo: true`. Não têm `publishedAt`, `approvedAt`, `reviewedAt`, `scheduledAt` ou `updatedAt`. O relatório permanece `REVIEW_REQUIRED` e `independentReviewPerformed: false`.

Artefatos persistidos apenas em diretório de testes ignorado pelo Git:

- `test-results/i18n-cloudflare-offline-e2e/SYNTHETIC-NONPUBLISHABLE-en.mdx`
- `test-results/i18n-cloudflare-offline-e2e/SYNTHETIC-NONPUBLISHABLE-es.mdx`
- `test-results/i18n-cloudflare-offline-e2e/coverage.json`

Todos dizem explicitamente que são fixtures sintéticas, não inferência nem aprovação editorial. O relatório tem `realUsage: null` e `realBilling: null`. Ledgers sintéticos são criados somente em diretórios temporários de teste e não integram o histórico real.

## Cenários e limites da detecção

| Cenário simulado                                   | Resultado observado                                                                                                    |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Seis respostas válidas, IDs reordenados            | EN e ES completos, compilados, somente REVIEW_REQUIRED                                                                 |
| Envelope sem resposta                              | Bloqueio; nenhum MDX                                                                                                   |
| IDs duplicados                                     | Bloqueio; nenhum MDX                                                                                                   |
| ID ausente                                         | Bloqueio; nenhum MDX                                                                                                   |
| Equação protegida indevidamente devolvida/alterada | ID extra bloqueado; alteração direta também é rejeitada pela validação                                                 |
| JSON inválido                                      | Bloqueio; nenhum MDX                                                                                                   |
| Interrupção na segunda chamada                     | Primeiro lote não vira artigo parcial; nenhum MDX                                                                      |
| Prosa devolvida sem tradução                       | Avisos unchanged-source-prose, artefatos apenas draft/REVIEW_REQUIRED                                                  |
| ES devolvido na etapa EN                           | A fixture de referência detecta a divergência; o executor mantém REVIEW_REQUIRED com avisos heurísticos, sem aprovação |

A troca de idioma não é garantidamente reconhecida pelo validador estrutural. Os avisos de modalidade/negação são heurísticos: variações legítimas também podem gerá-los. Texto inalterado curto, idioma errado, tradução parcial e divergência semântica ainda exigem revisão linguística independente. A comparação com fixtures conhecidas demonstra correção da montagem, não capacidade geral de identificar idiomas. Nenhum teste enfraquece os gates para transformar esses casos em PASS.

## Verificações e preservação

- 91 testes focados aprovados, 0 falhas, incluindo dez cenários/integrações novos; 1142 assertions.
- Typecheck: aprovado após corrigir duas assertions que acessavam campos experimentais fora do tipo do parser editorial. Campos extras são verificados com schema Zod explícito no teste; o schema de produção não mudou.
- Lint e diff-check: aprovados. Lint exclui somente outputs locais preexistentes `.wrangler/**`.
- O teste compara SHA-256 de todos os registros históricos, de `content/` e de `src/content/` antes/depois da integração. O executor só escreve no diretório temporário fornecido e nas cópias sintéticas de teste; não registra traduções ou rotas públicas.
- O comando oficial `typecheck` também chama `content:generate`; sua execução não produziu diferenças no conteúdo ou nos índices públicos, conferidas no diff final.

Comandos reproduzíveis no clone Linux:

```sh
bun test scripts/i18n-cloudflare-experiment/ scripts/i18n-real-pilot/ scripts/i18n-simulation/
bun run typecheck
bun run lint --ignore-pattern '.wrangler/**'
git diff --check
```

## Prontidão

A montagem estrutural e a compilação EN/ES estão demonstradas offline para o artigo completo. Isso não demonstra qualidade do modelo em chamadas futuras. O orçamento continua US$ 0,05, com reserva histórica US$ 0,047361354 e consumo calculado US$ 0,005620669 (cobrança efetiva não confirmada). A terceira campanha integral continua bloqueada; não houve reconciliação nem autorização nova, chamadas reais, publicação, commit, push ou deploy.

Conferência final externa aos testes: os nove registros históricos preexistentes mantiveram exatamente os mesmos nomes e hashes SHA-256. Nenhum registro foi criado no histórico real, reconciliado ou alterado. Os dois MDX sintéticos e coverage.json estão ignorados pelo Git.
