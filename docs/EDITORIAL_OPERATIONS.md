# Operação editorial diária

## Revisão de cluster e tradução

O operador inspeciona `cluster:list/show`, `evidence` e `claims`. Merge/split exigem motivo, ator e `--apply`. Tradução passa por queue, run local, review e decisão humana; approve linguístico não cria briefing, artigo ou publicação. Consulte `NEWSROOM_CLUSTERING.md` e `NEWSROOM_TRANSLATION.md`.

Fontes, coleta, quarentena e aprovação são dry-run por padrão. Coleta ampla exige `--all --confirm-all`; aprovação exige `--confirm-review --actor <id> --apply` e cria somente briefing.

O fluxo é local e versionado em Git. Não há CMS, usuários, backend nem publicação automática.

## Rotina

1. Faça o onboarding e confirme um autor com `status: verified` em `content/authors.json`.
2. Crie um draft com `bun run content:new -- ...`.
3. Edite somente o MDX, registrando fontes, mídia e disclosures reais.
4. Execute `bun run content:review -- <slug>` e o checklist por artigo.
5. Use `bun run content:status -- <slug> review --apply` após resolver bloqueadores de autoria.
6. Após revisão humana, promova para `approved`; a CLI registra `approvedAt`.
7. Execute `bun run content:publish-check -- <slug>`. O comando é somente leitura.
8. A publicação exige ambiente oficial, URL pública, fontes e licença. Mudanças de status usam dry-run por padrão e só gravam com `--apply`.

## Comandos

- `bun run content:list`: inventário de slug, título, tipo, status, autor, categoria, demo, fontes, data e warnings.
- `bun run content:review -- <slug>`: relatório de schema, autoria, fontes, imagem, SEO, correções e disclosures.
- `bun run content:status -- <slug> <status> [--apply]`: valida transição, exibe resumo e preserva `isDemo`.
- `bun run content:publish-check -- <slug>`: falha diante de bloqueador e nunca escreve arquivos.

Transições permitidas: draft → review → approved → published; approved → scheduled; scheduled → published após a data; published → correction-needed → review; published → archived.

## Autoria

Os cinco nomes herdados são demos. `autoria-pendente` é marcador técnico pending, sem credenciais. Use `author:new`, preencha somente dados fornecidos, execute `author:validate` e promova com `author:status ... verified` após dry-run. Credenciais são opcionais; as informadas precisam de confirmação. Onboarding não entra no perfil público. Não copiar biografias demo.

## Pesquisa

O briefing privado usa `research:status` durante a apuração e `research:validate` como gate. `ready-for-writing` autoriza apenas iniciar a redação factual. A passagem para review ainda exige `draftStage: review-ready`, autor verified, fontes confirmadas, fact-checks concluídos, conflitos avaliados e imagem licenciada.

## Demos e piloto

Demos continuam visíveis somente em desenvolvimento autorizado. Conteúdo real pode coexistir, mas produção nunca completa espaços com demos. O piloto `rascunho-como-funciona-matriz-eletrica-brasileira` contém apenas estrutura: autoria, fontes e imagem são bloqueadores deliberados.

## Rollback editorial

Antes de integrar, revise o diff. Para erro publicado, use `correction-needed`, registre correção e percorra revisão novamente. Arquivamento é explícito. Rollback de release usa commit/artefato previamente aprovado; não reescreva histórico publicado.

## Triagem algorítmica

A fila da redação algorítmica antecede o fluxo de artigos. `newsroom:collect` usa fixtures offline quando o catálogo externo está vazio; `newsroom:list`, `show`, `score` e `stats` inspecionam o estado. `reject`, `archive` e `approve` são dry-run até receberem `--apply`.

`newsroom:approve` cria apenas briefing em `newsroom/briefings/`. Para virar artigo, a pauta ainda precisa entrar deliberadamente no fluxo `content:new`, passar por pesquisa, autoria, review e aprovação editorial. Consulte `NEWSROOM_OPERATIONS.md`.

No piloto real, `source:add` foi executado em dry-run e apply; o health check confirmou dois feeds; `collect --all --confirm-all --apply` coletou no máximo 20 itens por fonte. `review` foi usado em três itens sem mudança de estado.
