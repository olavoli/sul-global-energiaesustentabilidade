# Saúde e frescor das fontes

O health check verifica HTTP, Content-Type, RSS/Atom, itens aproximados, data mais recente, idioma aparente, redirects, latência, ETag e Last-Modified. Nunca abre matérias e não altera `trustTier`.

Estados: `healthy`, `degraded`, `stale`, `invalid`, `blocked` e `unknown`. Saúde técnica e confiança editorial são independentes.

O frescor usa `recent`, `current`, `background`, `stale` e `unknown`, com janelas maiores para fontes acadêmicas e irregulares. Recência compõe o score, mas não decide sozinha. `304` e hash evitam duplicação.

Falhas graves ou repetidas geram quarentena sem corpo integral. Consulte por `newsroom:quarantine:list/show`; retry e descarte são dry-run por padrão.
