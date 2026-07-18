# Checklist de staging

- [x] URL HTTPS exclusiva e `VITE_APP_ENV=staging`.
- [x] URL diferente da produção; noindex, robots bloqueado, sitemap/RSS não oficiais.
- [x] D1 exclusivo, ID fora do Git e binding `NEWSROOM_DB`.
- [x] Segredo administrativo exclusivo e server-only.
- [x] `NEWSROOM_STORAGE_DRIVER=d1` e `NEWSROOM_ENVIRONMENT=staging`.
- [x] Coleta, tradução, orquestração, notificações e agenda desligadas.
- [x] `staging:validate`, typecheck, lint, testes, build e smoke local aprovados.
- [x] Migrations revisadas, status registrado e aplicação autorizada.
- [x] Seed sanitizado revisado; fontes permanecem inativas.
- [x] Health privado retorna D1 e migration esperada.
- [x] Login, sessão entre versões, logout, revogação e replay validados.
- [x] Rate limit, lock, expiração e fencing validados.
- [x] Dashboard e Central funcionam sem dados no bundle público.
- [x] Apply completo e publicação continuam inexistentes.
- [x] Backup com checksum e restore em banco isolado validados.
- [x] Logs sanitizados contêm request ID, ambiente, driver, versão e duração.
- [x] Smoke remoto aprovado sem segredo/cookie em logs ou artifacts.
- [x] Rollback do Worker executado; versão atual restaurada.

Não marcar itens remotos com base apenas no emulador.
