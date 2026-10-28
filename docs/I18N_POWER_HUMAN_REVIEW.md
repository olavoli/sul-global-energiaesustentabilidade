# O que é potência — roteiro de revisão humana EN / ES

**Estado: PENDENTE.** Documento preparado por IA; não é relatório de revisão humana realizada. Autorização de publicação e aceitação das limitações já registradas em 46e3e0d — não precisam ser repetidas. Não preencher identidade ou data em nome de outra pessoa.

## Conferir efetivamente nas duas versões

| Ponto                         | EN — trecho existente                                                                                                                                                      | ES — trecho existente                                                                                                                                                  | O que o responsável deve conferir                                                                                                                                                                            |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Potência × energia            | “Energy is related to the quantity transferred or transformed. Power indicates how quickly this transfer or transformation occurs.”                                        | “La energía está relacionada con la cantidad transferida o transformada. La potencia indica cuán rápidamente ocurre esa transferencia o transformación.”               | Quantidade versus taxa, sem tornar as grandezas sinônimas. Preservar condição de mesma carga/altura no exemplo dos elevadores, desconsiderando diferenças de eficiência.                                     |
| Potência média e fórmulas     | “Average power is the ratio between the amount of energy transferred or transformed and the time interval:” e P = ΔE / Δt; 1 W = 1 J/s; E = P × t                          | “La potencia media es la razón entre la cantidad de energía transferida o transformada y el intervalo de tiempo:” e as mesmas fórmulas                                 | ΔE e Δt corretos. E = P × t usa potência constante ou média do mesmo intervalo; não interpretar P instantânea variável como constante.                                                                       |
| Exemplos numéricos e unidades | “In the first case, E = 1 kW × 1 h = 1 kWh. In the second case, E = 2 kW × 0.5 h = 1 kWh.” e 1 kWh = 3.6 MJ                                                                | “En el primer caso, E = 1 kW × 1 h = 1 kWh. En el segundo caso, E = 2 kW × 0,5 h = 1 kWh.” e 1 kWh = 3,6 MJ                                                            | 30 min = 0,5 h; ambos os exemplos dão 1 kWh. 1 h = 3.600 segundos / 3,600 seconds. Ponto/vírgula não alteram valores; kW é potência, kWh é energia. Exemplos são didáticos, não medições.                    |
| Potência × eficiência         | “A more powerful device is not necessarily more efficient.” / “Efficiency compares how much of the energy supplied to the system results in the considered useful effect.” | “Un equipo más potente no es necesariamente más eficiente.” / “Eficiencia compara cuánta de la energía suministrada al sistema resulta en el efecto considerado útil.” | Não trocar potência por rendimento; preservar possibilidade de mesma potência útil com diferentes entradas/eficiências. Não generalizar que o aparelho mais potente sempre consome mais ou é mais eficiente. |
| Conclusões                    | “Energy: how much.” / “Power: how fast.” / “Greater power does not mean, by itself, greater efficiency.”                                                                   | “Energía: cuánto.” / “Potencia: cuán rápido.” / “Mayor potencia no significa, por sí sola, mayor eficiencia.”                                                          | A síntese e os cinco pontos-chave não introduzem conclusões além do PT. Manter negações e ressalvas, inclusive a dependência do tempo de funcionamento.                                                      |

A tabela é uma seleção para facilitar a conferência, não substitui a leitura do contexto nas duas edições. Os trechos foram extraídos dos MDX; negrito foi omitido na transcrição da tabela, sem reescrever seu conteúdo.

## Fontes e rastreabilidade (consulta assistida em 28/10/2026)

- [NIST — Watt (W)](https://www.nist.gov/glossary-term/34606): seção de definição; sustenta unidade e taxa de trabalho, não ensaio de aparelhos.
- [NIST — Joule](https://www.nist.gov/glossary-term/26261): definição de energia/trabalho e relação watt/joule. Não foi lida integralmente a NFPA referenciada pelo léxico.
- [NIST — SI Appendix B.8](https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8): entradas hour (h) e kilowatt hour (kW · h), fatores 3600 s, 3600000 J e 3,6 MJ.
- [DOE — Style Guide Full Text](https://www.energy.gov/cmei/communicationstandards/style-guide-full-text): seções watt, kilowatt/kilowatt-hour, equations e solar conversion efficiency. Sustenta terminologia e ilustra taxa versus fração; não é estudo dos motores/elevadores do artigo.

O briefing é retrospectivo; o original e suas datas 2026-08-12 foram preservados. A confirmação documental assistida e os cálculos não são revisão humana.

## Registro que falta — preencher somente depois de revisar

| Edição | Revisor humano real | Data efetiva da revisão | Resultado e escopo efetivamente realizado                                            |
| ------ | ------------------- | ----------------------- | ------------------------------------------------------------------------------------ |
| EN     | Pendente            | Pendente                | Pendente: confirmar os cinco pontos acima e informar ajustes encontrados, se houver. |
| ES     | Pendente            | Pendente                | Pendente: confirmar os cinco pontos acima e informar ajustes encontrados, se houver. |

Pode ser o mesmo revisor para ambas, se ele efetivamente realizar as duas revisões. Não é necessário declarar revisão linguística integral: descrever honestamente o escopo realizado. A aceitação dos três falsos positivos, quatro links PT, raster em PT e interface auxiliar já foi dada; não é solicitada outra vez.

### Como concluir

1. Abrir e conferir EN e ES no contexto, comparando os pontos acima ao original PT. Prévias: http://localhost:8094/en/article/o-que-e-potencia e http://localhost:8094/es/articulo/o-que-e-potencia; original: http://localhost:8094/artigo/o-que-e-potencia.
2. Informar, para cada idioma, nome real, data efetiva, resultado e escopo da revisão. Se houver erro, indicar o trecho e a correção necessária.
3. Somente depois registrar reviewer/reviewedAt reais e aprovação correspondente. Eles continuam ausentes dos MDX nesta entrega; translationReview permanece pending e status draft.
4. Cumprida essa revisão, executar as transições oficiais draft → review → approved → published e os gates de publicação/CI antes de merge/deploy, conforme a autorização já existente. Nenhuma dessas operações foi realizada agora.

O dry-run draft → review é uma simulação técnica e não preenche esses dados nem representa aprovação humana.

## Preparação técnica concluída nesta rodada

O briefing retrospectivo content/research/o-que-e-potencia.yml passou no validador oficial: quatro fontes confirmadas nesta consulta assistida e nenhum bloqueio de pesquisa no escopo delimitado. As datas antigas do artigo permaneceram intactas. DraftStage foi preparado de writing para review-ready, sem alterar status draft nem translationReview pending. Os dois dry-runs oficiais draft → review passaram sem --apply. Isso não é uma transição real ou uma revisão humana.

**O que falta ao responsável agora:** efetuar a conferência indicada e fornecer nome, data efetiva, escopo e resultado reais para EN e ES. A autorização de publicação e a aceitação das limitações já estão registradas; não precisam ser repetidas. A execução das transições e da publicação só pode prosseguir depois desse registro efetivo.

### Correção técnica encontrada durante a preparação

O teste da etapa seguinte expôs um defeito de serialização da CLI: adicionar um campo ausente a frontmatter JSON com vírgula final gerava duas vírgulas. Corrigido somente o separador de inserção, com regressão em memória para JSON com/sem vírgula final. A verificação posterior do candidato permanece ativa; o teste dos rascunhos reais continua exigindo falha de approved enquanto translationReview estiver pending. Nenhuma data de fixture foi gravada nos artigos.

### Resultado final da preparação

Validador oficial do briefing: exit 0. Dry-runs oficiais EN/ES draft → review: exit 0, sem --apply. Regressões relevantes (incluindo CLI JSON com/sem vírgula final e manutenção do bloqueio humano): 83 testes aprovados, zero falhas; typecheck, lint pertinente e git diff --check aprovados. A suíte oficial do CI é acompanhada no PR #15, sem reutilizar esses resultados como revisão humana.

## Política posterior autorizada — modalidade automática separada

A instrução posterior do responsável autoriza o caminho `automatic-ai-assisted`, documentado em `docs/I18N_AUTOMATIC_EDITORIAL_POLICY.md`. O roteiro humano acima continua válido para o caminho manual, mas não é uma exigência universal da nova modalidade. Não houve revisão humana nem preenchimento de reviewer/reviewedAt. A demonstração por política usa evidências assistidas por IA e arquivos isolados; os drafts atuais e o estado de produção não foram alterados.
