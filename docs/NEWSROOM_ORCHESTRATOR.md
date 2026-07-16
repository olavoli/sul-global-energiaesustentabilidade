# Orquestrador editorial supervisionado

A Central exibe decisão, readiness, riscos, evidências e histórico. Ações humanas usam `applyHumanDecision`; nenhuma regra editorial é recalculada no componente.

No pipeline diário, o orquestrador é um estágio opcional controlado por `NEWSROOM_ORCHESTRATION_ENABLED`. Ele pode persistir recomendações e atualizar a inbox, mas não aplica decisão humana, cria pauta ou publica.

O orquestrador combina cluster, pacote de evidência, claims, traduções, catálogo e política versionada para produzir `EditorialDecision` e `EditorialReadiness`. A mesma entrada e política produzem o mesmo ID, fingerprint, riscos, razões e recomendação.

Ele não escreve, traduz, aprova, cria pauta ou publica durante a avaliação. `newsroom:orchestrate` é dry-run; `--apply` persiste somente decisões privadas. Score alto nunca remove bloqueador, confiança não significa veracidade e fonte única permanece explícita.

As recomendações são `reject`, `archive`, `monitor`, `request-more-sources`, `request-translation-review`, `human-review`, `prepare-pitch` e `urgent-human-review`. Todas antecedem decisão humana.

Dados vivem em `newsroom/decisions/`, com schema, lock, backup, escrita atômica, política, evidência, fingerprint e histórico. Reavaliação idêntica é idempotente; mudança de entrada preserva histórico; mudança de versão pode superseder a decisão anterior.
