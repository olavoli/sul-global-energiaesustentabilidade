# Inbox de revisÃ£o humana

## Central Editorial

Abrir, adiar, resolver e dispensar passam pela mesma função de domínio usada pela CLI, com sessão, CSRF, ator, nota e confirmação.

A inbox consolida decisÃ£o, cluster, risco, prontidÃ£o, fontes, URLs, temas, data, traduÃ§Ã£o, bloqueadores, prÃ³xima aÃ§Ã£o e prioridade. Estados: `unread`, `opened`, `deferred`, `action-required`, `resolved` e `dismissed`.

Listagem e leitura nÃ£o alteram estado. `open`, `defer`, `resolve` e `dismiss` sÃ£o dry-run; escrita exige `--apply` e ator. Adiamento, resoluÃ§Ã£o e descarte exigem nota. O histÃ³rico permanece atribuÃ­do.

Filtros aceitam data, risco, tema e fonte. A inbox nÃ£o cria pauta, artigo ou publicaÃ§Ã£o e fica em `newsroom/inbox/`, fora do aplicativo.
