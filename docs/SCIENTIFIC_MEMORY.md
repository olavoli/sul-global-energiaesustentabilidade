# Memória Temporal Científica

A Sprint 25 mantém uma projeção histórica privada e determinística dos metadados do Radar Científico. Não usa IA, embeddings, vetores, abstracts, PDFs ou geração textual.

## Storage local

`newsroom/storage/scientific-memory/` contém `authors.json`, `institutions.json`, `journals.json`, `publishers.json`, `countries.json`, `categories.json`, `timeline.json` e `metadata.json`. O diretório operacional é ignorado pelo Git e não entra no bundle público.

## Operação

- `bun run scientific-memory:update -- --actor <nome>` atualiza somente identidades afetadas por artigos novos ou alterados.
- `bun run scientific-memory:rebuild -- --actor <nome>` reconstrói todas as projeções.
- `bun run scientific-memory:stats` mostra contagens e checksum.

Incremental e rebuild usam a mesma projeção e serialização canônica. Para a mesma coleção de artigos, o checksum deve ser idêntico. Atualizações sem mudanças não escrevem nem auditam novamente.

Eventos permitidos: `memory.created`, `memory.updated` e `memory.rebuilt`. O bloco `historicalContext` dos dossiês contém apenas anos, contagens, timeline e IDs relacionados.
