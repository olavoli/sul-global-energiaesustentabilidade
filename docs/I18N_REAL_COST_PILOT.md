# Piloto real de custo PT → EN/ES

Data: 2026-10-25. PR #13 / `feat/i18n-pt-en-es`. **Preparado, não executado nos provedores por ausência de credenciais autorizadas no ambiente. Publicação automática permanece desativada.**

## Situação e resultados por artigo

Selecionados no acervo publicado e aprovado (`status: published`, `approvedAt`, não demo), com estruturas distintas: conceitos/unidades; fotovoltaica tandem e resultados laboratoriais; ciclo de vida/reciclagem e quantitativos. O ART-033 está excluído; seus testes de risco anteriores permanecem intactos. A seleção não constitui certificação científica adicional dos originais.

| Artigo (slug)                                            | Corpo UTF-8, bytes | Chamadas planejadas por idioma | Reserva tradução USD/idioma | Reserva revisão USD/idioma | Situação                       |
| -------------------------------------------------------- | ------------------ | ------------------------------ | --------------------------- | -------------------------- | ------------------------------ |
| o-que-e-potencia                                         | 5686               | 6                              | 0.020157                    | 0.055880                   | Não executado; REVIEW_REQUIRED |
| perovskita-silicio-por-que-empilhar-duas-celulas-solares | 10303              | 8                              | 0.027091                    | 0.074526                   | Não executado; REVIEW_REQUIRED |
| o-que-acontece-com-um-painel-solar-no-fim-da-vida        | 29961              | 20                             | 0.068747                    | 0.188449                   | Não executado; REVIEW_REQUIRED |

Ambos os idiomas EN e ES estão no plano. Para todos os seis pares: tokens de entrada/saída reais, neurons, duração, tentativas reais, divergências semânticas e custos observados = **não medidos**. Erros determinísticos da tradução = não avaliados, pois não há tradução real. A decisão atual é REVIEW_REQUIRED por piloto não executado; não é reprovação linguística. Zero chamadas de inferência enviadas nesta execução não significa que um piloto futuro seja gratuito.

O plano inclui corpo, título, subtítulo, resumo, SEO e disclosures existentes, alt/caption da capa. Referências, URLs, créditos, imagens, autoria e fontes estruturadas ficam preservados. Textos dentro de imagens rasterizadas não são traduzidos e precisam de revisão humana. Os arquivos gerados futuramente serão **artefatos isolados draft/isDemo**, nunca entradas do gerador público. Tags permanecem as do original; localização editorial/taxonomia e publicação não fazem parte do piloto.

## Provedores e contabilização

Tradutor: Workers AI `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, tarifário consultado US$ 0,293/M entrada e 2,253/M saída; contexto publicado 24.000 tokens. Revisor independente: OpenAI GPT-5.4 mini, snapshot `gpt-5.4-mini-2026-03-17`, US$ 0,75/M entrada e 4,50/M saída. Preços consultados em 2026-10-25; não representam disponibilidade na conta nem benchmark de qualidade. O revisor não usa Workers AI como proxy, nem repete o modelo tradutor.

Tokens reportados são lidos de `result.usage.prompt_tokens/completion_tokens` na Cloudflare e `usage.input_tokens/output_tokens` na OpenAI. Neurons são registrados apenas se vierem no campo de uso; ausência permanece null. Nenhum dos contratos usados fornece uma fatura monetária por chamada: `providerReportedCostUSD` permanece null. `usageCalculatedUSD` aplica a tabela aos tokens reportados, sem assumir desconto de cache/franquia, e **não é custo faturado confirmado**. Diferença observável = custo calculado pelo uso menos reserva prévia; ausência de uso permanece null.

Médias efetivamente observadas de tradução e revisão: indisponíveis. Reservas médias planejadas por artigo, incluindo dois idiomas: tradução US$ 0.077330; revisão US$ 0.212570; soma US$ 0.289900. Total da campanha: US$ 0.869701. São hipóteses conservadoras de planejamento, não resultados de faturamento.

## Projeção mensal

| Artigos/mês, dois idiomas | Reserva projetada USD | Projeção baseada em consumo real |
| ------------------------- | --------------------- | -------------------------------- |
| 10                        | 2.899004              | Não disponível                   |
| 30                        | 8.697012              | Não disponível                   |
| 50                        | 14.495019             | Não disponível                   |
| 100                       | 28.990038             | Não disponível                   |

Extrapolação apenas desta amostra, sem CI, armazenamento, trabalho editorial, impostos, alterações de preços ou falhas. Não usar como promessa de custo mensal. O executor só calcula médias/projeções por uso após concluir a campanha; uma execução parcial mantém a projeção observada ausente.

## Controles financeiros implementados

- Campanha persistente `real-pilot-v1`, teto projetado US$ 1 e US$ 0,65 por artigo (EN+ES). Sem concorrência; um lock exclusivo impede duas execuções locais.
- Uma tentativa por etapa/lote, sem retry/backoff ou troca automática de credenciais. Máximo 40 chamadas por artigo, 400.000 tokens de entrada estimados e 85.000 de saída permitidos por artigo, somando os dois idiomas. São tetos, não previsão de tokens efetivos.
- Por chamada: entrada estimada ≤20.000; saída tradução ≤2.500, revisão ≤1.600, inclusive reasoning conforme contrato da OpenAI; esforço `none`. Timeout 90 s, redirects proibidos, resposta limitada a 2 MiB.
- Lotes limitados a 3.500 bytes JSON, sem truncar segmentos. Entrada estimada por bytes serializados +512 de framing, não tokenizer real. Planejamento da revisão acrescenta folga de 4 bytes/token de saída; o payload efetivo é reestimado antes da chamada. Essa heurística pode divergir do uso real.
- Reserva persistida **antes** do envio, registrada com hash/modelo/prompt no relatório do plano. Falha de disco impede envio. Reserva não é liberada em erro/timeout; uso desconhecido interrompe o experimento até reconciliação. Uso maior que a estimativa é preservado e interrompe novas chamadas.
- Nenhum reset de orçamento ou retry via argumento. Campanha com ledger existente exige reconciliação e nova decisão antes de outro experimento. Não apagar o ledger para repetir a execução.

**O limite local não garante cobrança absoluta de US$ 1.** Podem existir uso em trânsito, atraso de contabilização, tokenização divergente, mudança de tarifas ou outros consumidores da conta. Antes de executar, verificar limites de faturamento efetivamente disponíveis e configurar limites/alertas nos provedores conforme suas condições, preferencialmente em projeto/conta dedicada. A documentação OpenAI distingue hard spend limits; limites mínimos, escopo e atrasos devem ser conferidos na conta. Não configurar serviços remotos por este script. Na Cloudflare, confirmar controles e alertas disponíveis; não presumir um bloqueio duro de US$ 1 nem gratuidade por franquia.

## Credenciais e execução

Foram verificadas apenas presenças de variáveis, sem revelar valores ou ler arquivos protegidos. Nenhuma variável dedicada estava disponível. Variáveis genéricas de API também estavam ausentes; não foram usadas como fallback. Autenticação Wrangler/OAuth existente não autoriza inferência e não é reutilizada.

Variáveis dedicadas esperadas no processo Linux: `I18N_PILOT_CF_API_TOKEN`, `I18N_PILOT_CF_ACCOUNT_ID`, `I18N_PILOT_OPENAI_API_KEY`. Fornecer por mecanismo local seguro fora do Git, sem colar segredos em terminal registrado, documentos ou chat. Token Cloudflare restrito a inferência e conta autorizada; chave OpenAI restrita ao projeto autorizado. Não copiar configuração de produção. Nenhum arquivo dotenv é carregado automaticamente.

```sh
# Sem rede de inferência; permitido no CI, mesmo sem credenciais:
bun run i18n:pilot
bun test scripts/i18n-real-pilot/pilot.test.ts
# Somente depois de credenciais e autorização financeira disponíveis no processo:
I18N_PILOT_ALLOW_PAID=1 bun run i18n:pilot --execute
```

`--execute` sem credenciais para antes do primeiro pedido de inferência. Endpoints fixos: Cloudflare REST AI Run e OpenAI `/v1/responses`, sem ferramentas, sem streaming, `store: false` na OpenAI. Não há descoberta de credenciais, fallback de autenticação, deploy ou alteração editorial. O CI executa apenas o plano e testes com transportes injetados; nenhum secret é configurado no workflow.

Saídas locais ignoradas: `test-results/i18n-real-cost-pilot/plan-report.json`, `execution-<runId>.json`, `ledger.json` e MDX de avaliação. Somente o plano é publicado como artefato CI (14 dias); não enviar ledger/outputs reais a um serviço externo sem revisar o conteúdo. Segredos/headers/URLs com conta/erros crus de fornecedor não entram no relatório.

## Qualidade, falhas e decisões

Reutiliza AST/estrutura e validadores do protótipo. Compara números, citações, unidades, fórmulas, links, bibliografia e componentes; verifica também metadados traduzidos. Divergência crítica interrompe antes de prosseguir. Revisor recebe pares de segmentos e deve retornar sete dimensões, evidências literais no mesmo par e classificação equivalente/incerto/contradição. Cobertura incompleta, IDs errados, JSON inválido, modelo inesperado, resposta truncada ou indisponibilidade param o piloto; uso informado é preservado quando possível. A saída científica é registrada como BLOCK ou REVIEW_REQUIRED, sem fingir aprovação humana. O gate existente continua impedindo PASS para artigo real neste estágio e nenhuma decisão publica algo.

Uma revisão por lote pode perder relações entre seções e não confirma fontes originais. Comparadores numéricos têm cobertura limitada; traduções legítimas podem produzir falsos positivos. Título/alt/disclosures e textos rasterizados requerem inspeção humana. Sem credenciais, **não há resultado real de qualidade a anunciar** nem prova de que ambos os modelos funcionarão com estas contas. Testes com respostas fictícias validam o código, não o comportamento dos modelos.

## Reconciliação posterior

1. Guardar run ID, horário UTC, hashes de fonte/alvo, modelos/prompts e ledger; não incluir credenciais.
2. Consultar dashboards das contas/projetos autorizados para o intervalo e modelos, separando tráfego alheio. Registrar tokens, neurons quando disponíveis, descontos/franquias, moeda e cobrança efetiva.
3. Comparar reserva, cálculo por uso reportado e custo contabilizado; registrar divergências e atrasos. Não preencher custo efetivo com a estimativa.
4. Não repetir chamadas faltantes nem iniciar nova campanha antes dessa reconciliação, especialmente após timeout ou erro de resposta.

## Fontes oficiais

- [Workers AI modelo/limites](https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/).
- [Workers AI preços](https://developers.cloudflare.com/workers-ai/platform/pricing/).
- [Cloudflare AI Run, uso retornado](https://developers.cloudflare.com/api/resources/ai/methods/run/).
- [GPT-5.4 mini, preços e snapshot](https://developers.openai.com/api/docs/models/gpt-5.4-mini).
- [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
- [Limites de gasto](https://developers.openai.com/api/docs/guides/spend-limits).
- [Limites de saída e reasoning](https://developers.openai.com/api/docs/guides/reasoning).

## Recomendação

Próxima etapa: disponibilizar credenciais dedicadas e controles financeiros, executar a única campanha sequencial e reconciliar os resultados com os dashboards. Depois, revisar humanamente erros e fidelidade, sem promover traduções. **Não ativar publicação automática com base no planejamento ou nos testes mockados.** ART-033 segue fora de candidatos automáticos, PT e traduções reais permanecem intactos, PR #13 em draft, sem merge ou deploy.

## Validação desta entrega

- 19 testes focados dos adaptadores, orçamento, métricas e amostra aprovados, com respostas injetadas e sem inferência externa.
- Suíte local: 926 testes aprovados, zero falhas, 101 arquivos (39,99 s).
- Typecheck aprovado; validação editorial associada: zero erros, 27 avisos existentes.
- Lint aprovado com exclusão apenas dos outputs locais ignorados `.wrangler/**`; CI usa lint normal em checkout limpo.
- Plano offline aprovado: `NOT_RUN_MISSING_CREDENTIALS`, `limitsPass: true`, reserva total US$ 0,869701154.
- Nenhuma tradução real gerada, nenhum token/neurons real informado, nenhuma cobrança reconciliada, nenhuma aprovação ou mudança editorial.
- O CI verifica a suíte, build, smokes e testes visuais existentes; esta entrega não altera a interface.
