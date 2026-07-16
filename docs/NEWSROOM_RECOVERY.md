# Checkpoints e recuperaÃ§Ã£o

`NewsroomRun` registra os 17 estÃ¡gios, entradas/saÃ­das resumidas, status, duraÃ§Ã£o, warnings, erros, retry e polÃ­tica de interrupÃ§Ã£o. Depois de estÃ¡gio mutÃ¡vel consistente, um checkpoint Ã© persistido atomicamente.

`newsroom:run:list/show` inspeciona o histÃ³rico. `run:resume` exige `--apply`, ator e lock; cria run de recovery ligado por `recoveryOfRunId`. IDs editoriais continuam estÃ¡veis e merges idempotentes evitam duplicatas. `run:cancel` preserva estÃ¡gios/checkpoints e registra motivo.

Lock expirado Ã© reportado como Ã³rfÃ£o. Override exige `--override-lock` e fica no warning/histÃ³rico da execuÃ§Ã£o. Nunca remova lock ativo manualmente.

## Persistência e restore

Runs e checkpoints usam a abstração durável. Recovery direto de arquivo é
bloqueado em favor de restore validado. Use snapshot com checksum, pause
mutações, restaure em ambiente isolado e só libere após testes de contrato e
smoke. Decisão humana divergente sempre vira conflito explícito.
