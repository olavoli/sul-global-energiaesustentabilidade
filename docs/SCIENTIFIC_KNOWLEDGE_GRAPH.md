# Grafo Científico supervisionado

A Sprint 23 estrutura metadados bibliográficos de um único dossiê. O grafo descreve somente vínculos observados em OpenAlex e Crossref; não interpreta concordância, qualidade, consenso, apoio ou contradição.

O piloto é `radar-70ab9f6136b8d720`, DOI `10.1002/advs.202510481`, OpenAlex `W4413051216`. A coleta é dry-run por padrão. Persistência local exige `--apply` e autorização humana posterior; produção e staging são bloqueados.

Comandos: `science:graph:plan`, `science:graph:build`, `science:graph:show`, `science:graph:list`, `science:graph:review` e `science:graph:stats`. Nenhum deles cria artigo, MDX, resumo, tradução, agenda ou publicação.
