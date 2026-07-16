# Classificação e scoring da redação

## Relação com o orquestrador

Score é apenas uma entrada. Política, riscos, bloqueadores, fonte única, tradução e evidência podem reduzir prontidão ou impedir pauta independentemente do total. Métricas não retroalimentam pesos automaticamente.

## Score de cluster

O score do cluster é a média determinística dos scores dos itens e serve apenas para ordenar triagem. Confirmação independente não é inferida do score. Recomendações `archive`, `monitor`, `review` e `priority` não autorizam publicação e devem ser lidas junto das incertezas e do pacote de evidência.

Recência usa faixas explicáveis e janelas ampliadas para fontes acadêmicas/irregulares. É uma dimensão; saúde, cobertura e confiança institucional permanecem separadas.

## Classificação temática

O classificador é determinístico. Cada palavra-chave encontrada soma:

- título: 3 pontos;
- categoria do feed: 2 pontos;
- snippet: 1 ponto;
- tópicos cadastrados da fonte: 1 ponto.

Os temas iniciais são energia solar, energia eólica, hidrogênio, armazenamento, eletricidade, combustíveis, eficiência energética, nuclear, biomassa, clima, mercado de carbono, política energética, regulação, pesquisa e inovação, sustentabilidade, minerais críticos e Sul Global.

O resultado guarda tema, score e campos/regras que contribuíram. Mais de um tema pode ser atribuído. Sem correspondência, usa `unclassified`; o sistema não infere assunto além da evidência textual.

## Dimensões do score editorial

| Dimensão                | Faixa/regra do MVP                                        |
| ----------------------- | --------------------------------------------------------- |
| recency                 | 0, 5, 10 ou 15 conforme idade                             |
| sourceTrust             | blocked -50; contextual 5; medium 10; high 15; primary 20 |
| topicRelevance          | 0 a 15                                                    |
| geographicRelevance     | 10 com evidência de Sul Global                            |
| novelty                 | 10 quando não duplicado                                   |
| primarySourceBonus      | 10 para `primary`                                         |
| crossSourceConfirmation | 0 a 10                                                    |
| educationalPotential    | 5 com evidência lexical                                   |
| strategicRelevance      | 10 para temas estratégicos                                |
| duplicationPenalty      | -20                                                       |
| promotionalPenalty      | -15                                                       |
| uncertaintyPenalty      | -10                                                       |
| irrelevantPenalty       | -20 para `unclassified`                                   |

O total é a soma das dimensões. O registro inclui os valores parciais, razões e penalidades.

## Recomendações

- abaixo de 0: `reject`;
- 0 a 19: `archive`;
- 20 a 39: `monitor`;
- 40 a 59: `review`;
- 60 ou mais: `priority`.

Essas faixas priorizam trabalho humano. Não indicam verdade, neutralidade nem autorização de publicação. Fonte corporativa continua sujeita a penalidade promocional e verificação independente. Nenhuma relação comercial concede bônus.

## Limites

Similaridade lexical não prova equivalência, e múltiplas republicações não provam confirmação. O editor deve examinar origem, independência, data, atualização e incerteza. Mudanças de pesos ou dicionário exigem teste, decisão e atualização da versão de configuração.

O piloto tornou explícita a penalidade promocional para `sourceType: company`. Fonte `primary` conserva bônus, mas `crossSourceConfirmation` fica zero sem fonte independente. `Asia`, `Africa` e `Brasil` exigem limites de palavra para evitar falsos positivos em nomes próprios.
