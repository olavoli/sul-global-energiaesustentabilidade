# Checklist de staging

- [ ] URL HTTPS exclusiva e `VITE_APP_ENV=staging`.
- [ ] URL diferente da produção; noindex, robots bloqueado, sitemap/RSS não oficiais.
- [ ] D1 exclusivo, ID fora do Git e binding `NEWSROOM_DB`.
- [ ] Segredo administrativo exclusivo no environment protegido.
- [ ] `NEWSROOM_STORAGE_DRIVER=d1` e `NEWSROOM_ENVIRONMENT=staging`.
- [ ] Coleta, tradução, orquestração, notificações e agenda desligadas.
- [ ] `staging:validate`, typecheck, lint, testes, build e smoke local aprovados.
- [ ] Migrations revisadas, status registrado e aplicação autorizada.
- [ ] Seed sanitizado revisado; fontes permanecem inativas.
- [ ] Health privado retorna D1 e migration esperada.
- [ ] Login, sessão entre requests, logout, expiração e replay validados.
- [ ] Rate limit, lock, renovação, expiração e fencing validados.
- [ ] Dashboard e seções da Central funcionam sem dados no bundle público.
- [ ] Apply completo e publicação continuam inexistentes.
- [ ] Backup com checksum e restore em banco isolado validados.
- [ ] Logs sanitizados contêm request ID, ambiente, driver, versão e duração.
- [ ] Smoke remoto aprovado sem segredo/cookie em logs ou artifacts.
- [ ] Plano de rollback e responsável revisados; kill switch testado primeiro.

Não marcar itens remotos com base apenas no emulador.
