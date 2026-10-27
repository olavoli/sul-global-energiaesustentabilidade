# Experimento Cloudflare-only: o que é potência

Preparado em 2026-10-25, na branch `feat/i18n-pt-en-es`. **Somente planejamento e testes com transporte simulado foram executados. Não há autorização de inferência paga nesta rodada.** Não altera o comando `i18n:pilot` nem seus controles. Nenhuma chamada OpenAI é feita e nenhuma chave OpenAI é exigida.

> As seções iniciais registram o desenho original de campanha única. O procedimento vigente é **Recuperação com campanhas e teto acumulado**, ao final. Os comandos antigos abaixo são históricos e não devem ser usados para a recuperação. A primeira tentativa real está documentada separadamente; nesta rodada só houve simulações e planejamento offline.

## Escopo e plano a autorizar

Fonte exclusiva: `content/articles/o-que-e-potencia.mdx`, publicada e aprovada no acervo. A leitura rejeita outro slug, demo, fonte não publicada ou comentários potencialmente internos. Idiomas fixos: EN e ES. Hash da fonte no plano: `5625ad973c09fd43954ade1c1b8775892c864a801393f76864db8553885247fa`.

| Idioma | Chamadas sequenciais | Entrada estimada, teto de planejamento | Saída máxima permitida | Reserva projetada USD |
| ------ | -------------------- | -------------------------------------- | ---------------------- | --------------------- |
| EN     | 3                    | 11.126 tokens                          | 7.500 tokens           | 0,020157418           |
| ES     | 3                    | 11.126 tokens                          | 7.500 tokens           | 0,020157418           |
| Total  | 6                    | 22.252 tokens                          | 15.000 tokens          | **0,040314836**       |

**Teto local proposto: US$ 0,05 para toda a campanha**, uma tentativa por lote, sem concorrência e sem repetição automática. Tradução pelo modelo `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. Tarifas documentais consultadas: US$ 0,293/M entrada e US$ 2,253/M saída. A estimativa usa bytes serializados mais folga; não é contagem real de tokenizer. A saída de cada chamada é limitada a 2.500 tokens; a entrada não pode exceder o limite compartilhado de 20.000 tokens estimados. Os lotes reaproveitam o limite de 3.500 bytes dos segmentos.

O teto local **não garante cobrança absoluta**: tokenização, tarifas, contabilização e outros consumidores da conta podem divergir. Confirmar condições e controles de faturamento no provedor antes de autorizar; este executor não altera configurações remotas. Não presumir franquia gratuita, disponibilidade ou autenticação.

## Preservação e artefatos

Reutiliza `prepare`, `assemble`, `deterministic`, `batches`, `translationPayload`, `Budget` e as métricas existentes. O adaptador completo do piloto exige duas credenciais e contém métodos de revisão; por isso o experimento tem um limite de transporte Cloudflare-only pequeno e próprio, sem modificar o adaptador compartilhado. Não usa uma chave OpenAI fictícia nem modifica a API do piloto para contornar sua autenticação.

Traduz 78 folhas do corpo e os sete campos presentes: título, subtítulo, excerpt, SEO title/description, cover.alt e cover.caption. Alt/caption/title de componentes MDX também passam pela extração existente. Bibliografia é preservada literalmente, com rótulo References/Referencias localizado; autores, créditos, URLs, imagens, fontes estruturadas e atributos não traduzíveis ficam bloqueados. Os valores 10 e 30 na descrição da capa também são verificados.

Além do comparador existente, exige preservação literal das equações simbólicas, incluindo `P = ΔE / Δt`, e dos blocos `MathExpression`. Valida AST, componentes, metadados e schema do MDX final antes da única gravação da tradução. Divergência crítica interrompe a campanha antes de gravar a versão afetada. Não substitui silenciosamente números ou equações pela fonte para ocultar um erro do modelo.

Saída única: `test-results/i18n-cloudflare-experiment/`, já coberta pelo `.gitignore` existente:

- `plan-report.json`: planejamento offline, sem medir uso nem ler credenciais.
- `execution-<runId>.json`: resultado de uma tentativa, sem sobrescrever relatórios anteriores.
- `ledger.json`: reservas e consumo por chamada, persistidos antes de cada envio; não apagar para repetir.
- `campaign.lock`: exclusão mútua durante a execução.
- `NONPUBLISHABLE-en.mdx` e `NONPUBLISHABLE-es.mdx`: somente após validação, com `status: draft`, `isDemo: true`, `translationReview.pending`, `experimentOnly: true`, `publishable: false` e aviso explícito nos metadados. Datas de aprovação/publicação são removidas desses artefatos, nunca da fonte.

Nenhum arquivo é escrito em `content/articles`, `content/translations` ou índices gerados. Nenhuma rota pública é criada. `canonicalUrl` é apenas um campo exigido pelo schema do artefato, não uma rota registrada. O warning experimental fica no frontmatter, mantendo o corpo compatível com MDX.

## Segurança e contabilização

- Planejamento é o padrão e não consulta APIs ou arquivos de credenciais.
- Execução real exige `--execute`, `I18N_CF_EXPERIMENT_ALLOW_PAID=1`, `I18N_PILOT_CF_API_TOKEN` e `I18N_PILOT_CF_ACCOUNT_ID`. Não há fallback para OAuth/Wrangler, arquivos protegidos ou variáveis OpenAI.
- Endpoint fixo Cloudflare AI Run, HTTPS, redirects proibidos, timeout 90 s, resposta limitada a 2 MiB. Não segue URLs retornadas pelo modelo.
- Reserva adicional de US$ 0,05 e máximo de seis chamadas, além dos controles compartilhados. Falha na persistência impede o envio. Um ledger já existente impede outra campanha, mesmo depois de sucesso; exige reconciliação e decisão posterior, sem flag de reset.
- JSON inválido, IDs duplicados/ausentes, texto vazio, uso ausente, resposta sinalizada como incompleta ou chegada ao limite de saída interrompem a execução. Falhas HTTP, inclusive 401/403/429, não geram retry ou troca de credenciais.
- Tokens e neurons são registrados apenas se reportados pela Cloudflare. Falhas/truncamento preservam o uso informado quando possível e a reserva integral; consumo não informado permanece null. Não é convertido em zero.
- Custo calculado por tokens e tarifa é separado de `providerReportedCostUSD`, que permanece null no contrato atual; `billingReconciled` permanece false. Conferir posteriormente os dashboards antes de declarar custo efetivo.
- Logs/relatórios não contêm tokens, headers, IDs de conta nem respostas de erro cruas. Testes usam transporte injetado e relatórios explicitamente marcados `injected-test-transport`, sem fingir uso ou cobrança reais.

## Decisão científica

Resultados permitidos: **REVIEW_REQUIRED** ou **BLOCK**, nunca PASS editorial. Após uma tradução estruturalmente válida, o estado é `TRANSLATED_AWAITING_REVIEW`, `independentReviewPerformed: false`, sem aprovação científica ou humana. O pipeline de produção continua exigindo revisão independente e os demais gates. Não há merge, deploy, publicação ou operações de banco.

Comparadores determinísticos não comprovam fidelidade semântica integral, não eliminam riscos de omissão e não certificam fatos do original. Detecção de truncamento sem sinal do provedor é conservadora (JSON, IDs, conteúdo vazio, limite de saída), não prova completude semântica. Textos rasterizados e equivalência linguística exigem revisão humana; as imagens são preservadas, não editadas. As traduções reais ainda não foram geradas nem avaliadas nesta entrega.

## Comandos

No clone Linux `/home/imagine_sol_sus/projetos/sul-global-art033-release`:

```sh
# Sem inferência e sem credenciais:
bun run i18n:cloudflare:experiment
bun test scripts/i18n-cloudflare-experiment/experiment.test.ts
bun run typecheck
bun run lint --ignore-pattern '.wrangler/**'
```

A exclusão local de `.wrangler/**` evita outputs anteriores ignorados pelo Git; não altera regras de lint. Não há alteração no CI nesta rodada.

**Somente após autorização expressa do responsável, revisão do plano e credenciais Cloudflare dedicadas disponíveis no processo:**

```sh
I18N_CF_EXPERIMENT_ALLOW_PAID=1 bun run i18n:cloudflare:experiment --execute
```

Não colocar chaves nesse comando, no Git, em documentos ou no chat. Não apagar ledger/lock para contornar uma falha. Uma execução bloqueada pode ter consumo e deve ser reconciliada antes de qualquer repetição.

## Validação local

Testes cobrem modo offline, autorização ausente, ausência de exigência OpenAI, montagem dos metadados, preservação do corpo/referências/créditos, Callout/Figure/KeyPoints/MathExpression, equação real, detecção numérica, JSON inválido, IDs incompletos, truncamento, uso ausente, falhas HTTP/transporte, orçamento, concorrência e proibição de retry. Nenhum teste consulta APIs.

A fixture inicial de metadados foi corretamente bloqueada porque removia os valores 10 e 30 do alt. Ela foi corrigida para preservá-los; nenhum validador foi enfraquecido. O experimento e as validações não alteram o texto português.

Fontes oficiais: [modelo, limites e tarifas](https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/), [API AI Run](https://developers.cloudflare.com/api/resources/ai/methods/run/). Custos/contas reais não foram consultados.

### Resultado desta rodada

- 66 testes focados aprovados, zero falhas, incluindo 19 testes novos do experimento e 47 da infraestrutura reutilizada.
- `bun run typecheck` aprovado; avisos editoriais preexistentes preservados.
- `bun run lint --ignore-pattern '.wrangler/**'` aprovado; `git diff --check` aprovado.
- `git check-ignore` confirmou a exclusão do plano, ledger e MDX experimentais.
- Diff confirmou que artigos, componentes, workflow CI, `i18n:pilot` e protótipo anterior estão inalterados.
- Saída efetivamente gerada: apenas `plan-report.json`. Inferências reais, consumo e qualidade das traduções permanecem não medidos.
- Implementação local, sem staging, commit, push, merge ou deploy nesta rodada. A execução paga depende de autorização posterior explícita.

## Recuperação com campanhas e teto acumulado

O comando agora usa `campaigns.ts`; o executor básico e `i18n:pilot` não mudam. O modo offline imprime o plano em stdout e não sobrescreve o `plan-report.json` histórico. Não houve inferência real nesta implementação.

### Histórico obrigatório

Os três registros originais têm hashes SHA-256 fixados no controlador. Arquivo ausente, hash divergente ou contabilização incoerente bloqueiam a execução. As cópias desses bytes em `history.fixture.json` servem exclusivamente aos testes, sem credenciais e sem criar consumo novo. Nenhum registro real é excluído, renomeado ou reinicializado.

Um inventário separado em `campaign-reservations/` fixa o hash do manifesto antes de qualquer envio. A ausência de uma pasta de campanha ou de sua reserva correspondente bloqueia a contabilização; excluir uma pasta não restaura o orçamento.

Cada campanha fica em `test-results/i18n-cloudflare-experiment/campaigns/<id>/`, com manifesto exclusivo, ledger próprio, relatório e selo dos arquivos finais. O manifesto vincula revisão da fonte, parser e digest da cadeia anterior. IDs devem ser únicos e crescentes lexicograficamente. Não existe resume, retry ou reset. Uma falha após uma chamada exige reconciliação e campanha nova; uma queda antes do selo deixa o histórico bloqueado para investigação manual, sem recuperação automática.

`reconciliations/<id>.json` é criado exclusivamente e vinculado ao digest exato do histórico. Ele registra razão e data de registro, mantém `billingConfirmed: false` e retém a reserva. Reconciliação operacional NÃO confirma a fatura nem declara sucesso científico. Não reduz orçamento, mesmo quando o consumo calculado for menor.

### Valores e reserva conservadora

- Legado: reserva US$ 0,007046518; consumo calculado US$ 0,002811461; cobrança efetiva não confirmada.
- Campanha integral EN/ES: seis chamadas, reserva US$ 0,040314836.
- Total projetado: US$ 0,047361354; margem: US$ 0,002638646; teto acumulado US$ 0,05.
- Por prudência, cada campanha nova retém seu planejamento integral, mesmo quando falhar cedo. Caso o ledger informe valor maior, prevalece esse valor. Uma terceira campanha integral não caberia no teto.
- O limite local é controle de autorização por estimativa, não garantia absoluta da cobrança externa. Uso excedente interrompe o executor; cobrança deve ser reconciliada com o provedor separadamente.

### Comandos (no clone Linux)

Planejamento offline, sem ler credenciais ou escrever nos relatórios antigos:

```sh
bun run i18n:cloudflare:experiment --campaign campaign-002
```

O plano inicialmente mostra `allowed: false` porque o legado ainda exige reconciliação. Para registrar explicitamente a análise operacional, use o digest exibido por esse plano e uma razão verdadeira (não uma declaração de cobrança confirmada):

```sh
bun run i18n:cloudflare:experiment --reconcile legacy --history <DIGEST_DO_PLANO> --reason "Resposta original indisponível; tentativa interrompida analisada; cobrança não confirmada e reserva integral mantida."
bun run i18n:cloudflare:experiment --campaign campaign-002
```

Somente após autorização explícita para chamadas pagas, com credenciais já disponibilizadas por ambiente e usando o NOVO digest exibido após a reconciliação:

```sh
I18N_CF_EXPERIMENT_ALLOW_PAID=1 bun run i18n:cloudflare:experiment --campaign campaign-002 --history <DIGEST_APOS_RECONCILIACAO> --execute
```

O comando real não foi executado. Um lock global cobre reconciliação e execução; locks de processos interrompidos nunca são roubados automaticamente. Arquivos finais continuam draft, `REVIEW_REQUIRED`, `publishable: false`, fora do conteúdo público. Os controles de MDX, equações, números, referências e parser estrito permanecem ativos.

### Validação da recuperação

78 testes simulados aprovados (experimento, campanhas e módulos reutilizados), typecheck e lint aprovados (excluídos somente outputs preexistentes em `.wrangler/**`). O planejamento real offline confirmou reserva projetada US$ 0,047361354 e `allowed: false` até registrar a reconciliação explícita do legado. Nenhuma reconciliação real ou chamada paga foi executada nesta rodada. Os três hashes históricos permanecem iguais.

## Preservação determinística de fronteiras — prompt v6

Correção experimental implementada após os cinco achados da campaign-004: s13, s15, s17, s37 e s39. Nenhum registro dessa campanha foi alterado, reconciliado ou reexecutado.

Cada segmento natural é dividido localmente, mantendo o ID, em `{prefix, core, suffix}`. A regra reconhece exclusivamente espaço ASCII, tab, CR e LF nas extremidades. Apenas core é enviado ao modelo. O parser continua exigindo exatamente os IDs esperados, sem duplicação. A resposta tem somente suas fronteiras ASCII isoladas e diagnosticadas; a montagem usa `prefix original + core retornado + suffix original`. O núcleo retornado não é substituído por texto da fonte nem corrigido linguisticamente.

Núcleos vazios ou compostos apenas por whitespace são rejeitados. Não se usa trim para reconstrução: o trim existente serve somente para rejeitar ausência de conteúdo. Não há normalização de espaços internos, Unicode especial, palavras, pontuação ou equações. Unicode nas extremidades permanece parte do núcleo e não é tratado como espaço estrutural. Segmentos técnicos e pontuação protegidos continuam copiados literalmente da fonte e fora do payload.

O bloqueio segment-boundary-whitespace permanece na validação do segmento RECONSTRUÍDO, protegendo contra erros da própria montagem. IDs, estrutura MDX, números/unidades, bibliografia, fórmulas e MathExpression continuam validados. Conteúdo linguístico perdido não é recuperado automaticamente: os gates de revisão independente continuam obrigatórios, sem PASS editorial.

O prompt foi versionado para cf-protected-leaves-v6; a política é source-ascii-boundaries-v1. Relatórios futuros incluem sourceBoundaries, boundaryPolicyVersion e, por idioma, boundaryDiagnostics com ID, prefix/suffix originais, returnedPrefix/returnedSuffix e indicação de núcleo preservado. Não são registrados tokens de autenticação, cabeçalhos ou dados de conta. Esses diagnósticos não alteram tokens medidos, consumo calculado, reservas ou cobranças confirmadas e não regravam ledgers históricos.

### Cobertura e arquivos desta alteração

- experiment.ts: helpers splitBoundary/restoreBoundary, payload com núcleo, restauração antes das validações e diagnósticos.
- boundaries.test.ts: cinco casos reais, todos os 15 segmentos com fronteiras e todos os 85 segmentos por idioma, ASCII tabs/CR/LF, Unicode preservado, espaços internos, vazio rejeitado, número alterado bloqueado e seis respostas simuladas completas com 71 diagnósticos por idioma.
- campaign003-regression.test.ts: expectativa de payload agora verifica núcleo; permanece a reprodução manual de MDX incorreto e o teste de alteração estrutural real, que segue bloqueante. A perda isolada de espaço do modelo deixa de ser responsabilidade dele e é coberta pela restauração determinística.
- campaign004-planning.test.ts: expectativas do payload v6 atualizadas somente nas fixtures de cálculo. Isso não recalcula nem libera qualquer reserva histórica, não gera planejamento real e não muda limites financeiros.
- Este documento: atualização da política e limitações.

109 testes focados aprovados, zero falhas. Typecheck aprovado. Lint aprovado com exclusão somente dos outputs locais preexistentes `.wrangler/**`; diff-check aprovado. Todos os 25 registros históricos preservaram seus nomes e hashes SHA-256, sem novos registros financeiros. As fixtures EN/ES continuam explicitamente sintéticas, draft, REVIEW_REQUIRED e não publicáveis.

### Limitações

Os cinco pares históricos foram reproduzidos com os targets registrados; os demais trechos da integração usam fixtures, não reconstrução da resposta bruta completa da campanha. Isso demonstra preservação estrutural, não fidelidade semântica do modelo. Espaços Unicode e whitespace interno não recebem reparo automático. Mudanças do código/prompt tornam aprovações anteriores incompatíveis com nova execução por desenho; nenhuma nova execução, proposta financeira ou aprovação foi preparada automaticamente.

Sem chamadas Cloudflare/OpenAI, reconciliação, campanha nova, aprovação, alteração de teto, staging, commit, push, deploy ou publicação.
