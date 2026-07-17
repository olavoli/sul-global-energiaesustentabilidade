# Operação da Central Editorial

Defina `NEWSROOM_ADMIN_SECRET` fora do repositório, execute `bun run dev` e acesse `/admin/login`.

1. Revise visão geral, kill switches e último run.
2. Priorize a inbox por risco e bloqueadores.
3. Abra decisão, cluster, evidências e tradução antes de agir.
4. Registre nota objetiva e confirme a ação.
5. Crie pauta somente após `approve-for-pitch`; ela continua privada e sem MDX.
6. Use somente os modos manuais de leitura/dry-run.
7. Termine com logout.

Health manual, desativação de fonte e reset de circuito reutilizam os serviços existentes. Reativação de fonte e alterações estruturais de clusters continuam condicionadas aos fluxos de evidência e CLI. Trust tier nunca é editado silenciosamente. Quarentena exige reprocessamento válido antes da fila.

Em incidente, não registre segredo ou conteúdo integral. Apply completo, coleta externa e recuperação avançada permanecem na CLI autorizada.

Antes de habilitar mutações em ambiente serverless, valide `storage:health`,
migrations, export e restore em ambiente isolado. Um 409 requer recarregar o
registro; nunca repetir cegamente uma decisão humana. Um 503 de storage mantém
a Central fechada para mutações até a recuperação do binding.

## Staging

Após login, `/api/admin/storage/health` confirma apenas ambiente, driver,
migration e disponibilidade. Valide sessão entre requests, logout, rate limit e
locks antes de qualquer mutação. Apply completo, coleta externa e publicação
continuam bloqueados. Não use o secret de produção.
