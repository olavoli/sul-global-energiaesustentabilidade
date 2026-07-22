# Dossiê Científico

O EvidenceDossier V1 é separado do scaffold editorial. Ele referencia o trabalho e o `graphId`, sem preencher pergunta central, ângulo, relevância ou campos interpretativos.

O dossiê é um scaffold privado. Antes do grafo, exige trabalho existente, DOI confirmado, ausência de blocker e campos interpretativos vazios.

Após autorização, pode receber apenas `graphId`, `relatedWorkIds`, `authorIds`, `institutionIds`, `topicIds`, `graphWarnings` e `graphUpdatedAt`, na mesma transação local do grafo.

Pergunta central, ângulo, relevância, claims, limitações, contrapontos e notas não são preenchidos pelo grafo.

Sinais temporais podem anexar somente IDs, warnings, data, série observada, elegibilidade e versão da política. Campos interpretativos permanecem vazios.
