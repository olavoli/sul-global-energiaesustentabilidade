# Scientific Concept Graph

O módulo `scripts/scientific-concepts/` resolve somente correspondências exatas entre tópicos já observados e a taxonomia versionada em `newsroom/policies/scientific-concepts.json`.

- Não usa IA, embeddings, LLM, fuzzy matching ou inferência.
- Um conceito só é materializado quando seu nome ou um alias explícito coincide após normalização de caixa, diacríticos e pontuação.
- Tópicos desconhecidos permanecem em `unresolvedTopics` e não criam conceitos.
- Todas as relações começam como `pending` e exigem revisão humana.
- Aceitar, rejeitar ou ignorar registra auditoria; não funde entidades e não cria conteúdo editorial.
- O storage operacional usa `newsroom/storage/scientific-concepts/`, permanece privado e está coberto pelo ignore de `newsroom/storage/`.
- A CLI recusa execução em `staging` e `production`; persistência local exige `--apply --actor <nome>`.

Comandos: `science:concept:plan`, `build`, `rebuild`, `list`, `show`, `stats` e `review`.
