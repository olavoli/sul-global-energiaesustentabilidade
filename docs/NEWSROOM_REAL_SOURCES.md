# Fontes reais da redação

O mecanismo aceita RSS 2.0 e Atom cadastrados manualmente. Nenhuma URL real foi fornecida ou verificada nesta Sprint; por isso o catálogo permanece vazio e nenhuma coleta externa foi executada.

Antes do cadastro, um revisor confirma homepage, feed, formato, instituição, idioma, cobertura, termos e copyright. O registro exige `evidenceCheckedAt` e `evidenceCheckedBy`. Use `newsroom/sources/source-template.json` somente como modelo; `.invalid` identifica marcadores não operacionais.

Fluxo: valide com `bun run newsroom:source:add -- arquivo.json`; após revisão, repita com `--apply`; então execute `newsroom:source:health`. IDs e feeds são únicos, apenas HTTPS é aceito e fonte bloqueada ou em quarentena não entra na fila.

Uma coleta real exige `--source <id>`. Todas exigem `--all --confirm-all`. Persistência exige `--apply`. Não existe coleta diária automática nesta Sprint.

## Catálogo piloto

Em 15 de julho de 2026, somente `mit-news-renewable-energy` e `nasa-technology` cumpriram os gates. Ambas estavam `healthy`; a primeira coleta aplicada recebeu 30 itens. Evidências e rejeições estão em `NEWSROOM_SOURCE_CURATION.md`.
