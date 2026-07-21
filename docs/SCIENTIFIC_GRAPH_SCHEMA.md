# Schema do Grafo Científico

`scripts/scientific-graph/contracts.ts` define a versão 1. Nós: `scientific-work`, `author`, `institution`, `topic`, `journal`, `publisher` e `funder`.

Relações: `cites`, `cited-by`, `related-to`, `authored-by`, `affiliated-with`, `published-in`, `published-by`, `funded-by`, `has-topic`, `version-of`, `corrects` e `retracts`. Estados humanos: `unread`, `reviewed`, `accepted`, `rejected` e `needs-context`.

O schema deliberadamente não admite `supports`, `confirms`, `contradicts` ou `disproves`.
