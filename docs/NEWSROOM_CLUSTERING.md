# Clusters editoriais

## Consumo pelo orquestrador

O orquestrador lê o cluster sem modificá-lo. Mudança de título, itens, fontes ou relações altera o fingerprint e exige reavaliação; histórico anterior permanece auditável.

## Escopo

O clustering reúne itens já coletados que podem descrever o mesmo acontecimento. Ele não confirma fatos, não produz texto editorial e não publica. A implementação é local, determinística e conservadora.

## Camadas

1. GUID idêntico;
2. URL canônica idêntica;
3. hash idêntico;
4. título fortemente semelhante;
5. entidade compartilhada;
6. tema específico compartilhado;
7. proximidade temporal de até sete dias.

As três últimas evidências precisam coexistir para provocar um agrupamento semântico. Termos genéricos como `energia` não contam. Relações contextuais de menor confiança são marcadas como `related-distinct` ou `commentary-analysis` e não juntam clusters.

## Independência e fonte primária

Contagem independente usa a instituição derivada do domínio do catálogo, não o número de feeds. Dois feeds da mesma instituição contam uma vez. `primarySourceCandidate` é uma hipótese explicada, nunca certeza; exige inspeção do documento original.

## Operação humana

`cluster:merge` e `cluster:split` são dry-run por padrão e exigem `--apply`, `--actor` e `--reason`. IDs derivam dos itens ordenados; histórico, relações e fontes não são apagados. Nenhuma dessas operações altera a fila ou publica conteúdo.
