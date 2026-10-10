# ART-030 — registro de revisão científica

## Estado e escopo

Versão local para revisão, NÃO autorizada para publicação ou integração. Manuscrito canônico: `ART-030_ORC_texto_completo_revisao_v2.docx`, em `C:/Users/IMAGINE SOL SUS/Documents/SulGlobal - energia sustentabilidade/`. O original permanece inalterado. Texto consolidado: `art-030-consolidado.md`. Nenhum MDX foi criado em `content/articles/` e nenhum índice foi regenerado.

Preservados: título, introdução acessível, parentesco com o ciclo a vapor, funcionamento, escolha do fluido, limites termodinâmicos, exemplo numérico, aplicações, limitações, tabela, integração e conclusão. Removidos do texto para leitores: avisos internos, espaços vazios, repetições e casos sem comprovação. A tabela foi reformulada como comparação entre ciclo a vapor e ORC; seus critérios de operação, viabilidade e ambiente foram preservados e corrigidos. Os casos e a bibliografia original estão arquivados em `alegacoes-originais-pendentes.md`.

## Correções realizadas

| Afirmação ou problema original | Correção no consolidado |
| --- | --- |
| ORC especializado universalmente em 80–300 °C; ineficiente abaixo de 80 °C e superaquecimento obrigatório acima de 300 °C | Removidas faixas e regras universais; fonte, resfriamento e configuração devem acompanhar qualquer dado. |
| Água exige alta temperatura para vaporizar; comparação com limites de 300/350 °C | Substituída por comparação das condições de projeto e escala, sem um limiar universal. |
| Todos os fluidos orgânicos têm ebulição menor que a água e operação de baixa pressão | Removido o absoluto; escolha depende das propriedades do fluido e das condições de operação. |
| Fluido orgânico sempre evita umidade e danos | Retirada a garantia; expansão e estado do fluido precisam ser avaliados. |
| Erosão por umidade chamada de golpe de aríete | Corrigida a distinção entre erosão por gotículas e golpe de aríete. |
| Expansor de parafuso identificado como scroll | Separadas as tecnologias de parafuso e espiral. |
| Geração apresentada como passagem do fluido | Explicado o acoplamento mecânico; gerador fora do percurso do fluido. |
| Circuito descrito com etapas agrupadas de modo ambíguo | Sequência explícita: evaporador, expansor, condensador, bomba; geração em seção separada. |
| Ausência de partes móveis complexas, pouca manutenção assegurada | Reconhecidas partes móveis e manutenção; sem promessa operacional genérica. |
| Eficiência entre 10% e 20% como expectativa geral | Retirado intervalo universal; distinguida eficiência elétrica líquida de limite ideal. |
| Equação de Carnot incompleta e temperaturas sem símbolos | Restaurada equação e domínio: dois reservatórios a temperaturas constantes, em kelvin. Não equivale ao rendimento do equipamento. |
| Exemplo apresentado como instalação realista a 250 °C | Removida a temperatura não necessária; exemplo explicitamente hipotético, com 1 MW efetivamente transferido e 15% líquidos. |
| 150 kW equivalentes a centenas de residências | Removida equivalência sem consumo; distinguida potência de energia. |
| Calor gratuito e eletricidade gratuita | Distinguida ausência de combustível adicional direto dos custos de investimento, recuperação e operação. |
| Biomassa confundida com calor residual e vapor de baixa qualidade | Separada fonte por combustão de combustível de recuperação de calor residual; removida garantia de desempenho. |
| ORC como padrão-ouro geotérmico e expansão no Brasil sem comprovação | Mantida explicação de usinas binárias, sem atribuição a locais específicos. |
| Motores ganham até 10%; offshore ganha 10–15% | Percentuais retirados e preservados no registro de pendências. |
| ROI necessariamente negativo em operação intermitente; payback de 5–10 anos ou décadas; vida útil >20 anos | Retiradas previsões universais e mantidos os fatores necessários à análise econômica. |
| Incentivos fiscais verdes garantidos | Removidos; exigiriam programa e elegibilidade específicos. |
| Benefício ambiental sempre positivo ou zero emissões | Resultado condicionado à fonte, integração e sistema; sem alegação de neutralidade automática. |
| ORC se tornará padrão industrial | Removida previsão sem base documental. |
| Gráfico de saturação R245fa até 400 °C | Rejeitado para uso; referência NIST confirma temperatura crítica de aproximadamente 153,86 °C. Não confundir temperatura da fonte com a do fluido. |

## Referências verificadas e alcance

Consulta em 2026-10-09. Datas de consulta não são datas de publicação. Não foram inferidas datas para páginas institucionais sem metadados claros.

- **R1 — DOE, Waste Heat Recovery Basics:** https://www.energy.gov/cmei/ito/waste-heat-recovery-basics . Sustenta a existência de calor industrial recuperável e barreiras como materiais e manutenção. Não sustenta percentuais de economia de uma instalação específica. O consolidado não utiliza a estimativa percentual geral da página.
- **R2 — Quoilin, van den Broeck, Declaye, Dewallef e Lemort (2013), Techno-economic survey of Organic Rankine Cycle (ORC) systems:** https://orbi.uliege.be/handle/2268/138756 ; DOI confirmado no registro e no texto integral: https://doi.org/10.1016/j.rser.2013.01.028 . Volume 22, páginas 168–186. Seções 2, 4, 5, 6, 7 e 8: aplicações, comparação com vapor, seleção de fluido, expansores, trocadores e bomba. Sustenta orientação qualitativa; não é comprovação de qualquer caso do manuscrito nem cotação atual de custos. Metadados substituem a referência inexata atribuída ao mesmo autor no original, sem fingir tratar-se do mesmo trabalho.
- **R3 — Akasaka, Zhou e Lemmon (2015), A Fundamental Equation of State for 1,1,1,3,3-Pentafluoropropane (R-245fa):** https://tsapps.nist.gov/publication/get_pdf.cfm?pub_id=917507 ; DOI confirmado: https://doi.org/10.1063/1.4913493 . Journal of Physical and Chemical Reference Data, 44, 013104. Tabela 1 e seção 2: 427,01 K de temperatura crítica. A conversão editorial é 427,01 − 273,15 = 153,86 °C. Sustenta rejeitar a curva de saturação acima do ponto crítico, não extrapolar outras propriedades.
- **R4 — DOE, Geothermal Electricity Generation:** https://www.energy.gov/hgeo/geothermal/geothermal-electricity-generation . Sustenta separação entre fluido geotérmico e circuito secundário em usinas binárias. Não comprova ORC em Nesjavellir nem expansão comercial brasileira.

- **R5 — OpenStax, University Physics Volume 2, seção 4.5, The Carnot Cycle:** https://openstax.org/books/university-physics-volume-2/pages/4-5-the-carnot-cycle . Equação 4.5 e princípio de Carnot: eficiência ideal entre reservatórios a temperaturas constantes; sustenta a expressão e suas condições de aplicação. Não sustenta a eficiência hipotética de 15% de um ORC.

O cálculo 0,15 × 1.000 = 150 kW é uma hipótese editorial fornecida pelo proprietário, não um resultado experimental atribuído a R1–R5. A distinção potência/energia é fundamental; o texto não apresenta simulação nem dimensionamento de engenharia.

## Pendências que impedem publicação

1. Revisão e aprovação humana do texto consolidado, incluindo a reformulação da tabela e o arquivamento dos casos específicos.
2. Produção e conferência técnica dos dois infográficos conforme `especificacoes-infograficos.md`. Artes antigas e imagem de referência não estão aprovadas.
3. Confirmação da origem, ferramenta de IA, direitos de uso e crédito da hero. Não atribuir ferramenta por aparência nem aceitar preenchimento automático de proveniência como evidência.
4. Confirmar autoria, categoria, datas editoriais e nota de transparência para o futuro frontmatter; não inventar data de publicação.
5. Integração MDX autorizada, referências estruturadas, variantes de mídia aprovadas e testes locais de conteúdo/SSR/acessibilidade/móvel.

Os casos arquivados NÃO precisam retornar ao artigo para que ele seja aprovado: sua reinserção exigiria comprovação e nova revisão. A ausência de recuperação de um link anterior não prova que a obra não exista. Links genéricos de periódicos não comprovam título, autoria ou conteúdo do trabalho citado.

## Critérios de validação futura

Exatamente cinco itens em KeyPoints, uma EditorialTable e um Callout intitulado “O Paradoxo da Eficiência”; três imagens no total (hero e duas figuras); sem duplicar tabela, pontos ou destaque nos infográficos. Circuito e acoplamento corretos; cálculo hipotético preservado; fontes sem duplicação. Original da hero preservado por hash; variantes com geometria correta e sem corte. Testes de conteúdo/mídia/SEO, lint pertinente, typecheck, build, smoke SSR e git diff --check somente na etapa de integração autorizada.
