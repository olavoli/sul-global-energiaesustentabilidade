# Checklist de release

- [ ] Central bloqueada sem `NEWSROOM_ADMIN_SECRET`.
- [ ] `/admin` usa noindex, no-store, sessão, CSRF e logout.
- [ ] Nenhum arquivo `newsroom/`, segredo ou token aparece em `.output/public`.
- [ ] Persistência privada aprovada antes de ambiente multi-instância.

Este checklist não significa que o portal foi lançado.

## Gate anterior: staging

- [x] `STAGING_CHECKLIST.md` concluído com evidência remota real.
- [x] Banco, URL e segredo de staging comprovadamente distintos da produção.
- [x] Smoke remoto, recovery isolado e rollback executados; revisão humana final pendente.
- [x] Nenhuma fixture, sessão ou dado operacional promovido para produção.

## Obrigatório para o primeiro lançamento

- [ ] Árvore Git revisada e limpa; branch de release confirmada.
- [ ] `bun install --frozen-lockfile`, typecheck, lint, testes, build e smoke aprovados.
- [ ] Node `>=20` disponível e preview do worker aprovado.
- [ ] `VITE_APP_ENV=production`, URL pública real e HTTPS configurados.
- [ ] Nenhuma URL local/fictícia em canonical, Open Graph ou JSON-LD.
- [ ] Robots libera somente produção; sitemap e RSS contêm apenas material real.
- [ ] Demos, drafts e conteúdo sem revisão bloqueados.
- [ ] Templates, `approved`, `scheduled`, `correction-needed` e conteúdo futuro ausentes das rotas, sitemap e RSS.
- [ ] `bun run content:validate` aprovado; fontes, licenças, aprovações, correções e disclosures conferidos.
- [ ] `/metodologia` responde por SSR com canonical e consta no sitemap oficial.
- [ ] Plano de conteúdo não foi confundido com artigos produzidos ou aprovados.
- [ ] Favicon e imagem social finais validados.
- [ ] Imagens licenciadas, dimensionadas, creditadas e dentro do orçamento.
- [ ] Privacidade, termos e política editorial revisados juridicamente.
- [ ] Formulários continuam claramente simulados ou possuem integração aprovada e segura.
- [ ] CSP e demais headers verificados no domínio real; nenhum segredo/token no cliente.
- [ ] Ausência de analytics, anúncios, CMP e IDs não aprovados confirmada.
- [ ] Teclado, foco, contraste, zoom, reflow e leitor de tela verificados manualmente.
- [ ] Bundle, CSS, imagens e Core Web Vitals medidos.
- [ ] Plano de rollback e responsável pela implantação definidos.
- [ ] Pós-deploy: home, artigo real, autor, categoria, busca, 404 e páginas legais sem 500.
- [ ] Pós-deploy: canonical, Open Graph, robots, sitemap, RSS e headers conferidos.

## Recomendado

- [ ] Teste em navegadores e dispositivos representativos.
- [ ] Validação de compartilhamento social com crawler real.
- [ ] Revisão de dependências e configuração Cloudflare por segunda pessoa.
- [ ] Registro do artefato, horário, responsável, resultado do smoke e rollback.
- [ ] Monitoramento manual inicial de disponibilidade e logs sem dados pessoais.

## Futuro, não bloqueante enquanto a função não existe

- [ ] E2E real de navegador e métricas de campo.
- [ ] Provedor de observabilidade com política de retenção.
- [ ] Newsletter/contato persistentes com antispam, consentimento e segurança.
- [ ] Analytics, publicidade e CMP somente após decisão jurídica/editorial.

## Persistência da newsroom

- [x] D1 de staging criado e binding `NEWSROOM_DB` autorizado fora do repositório.
- [x] Migrations de staging revisadas, aplicadas e validadas.
- [x] Export e backup de staging com checksum preservado fora do Git.
- [ ] Import dry-run sem conflitos; decisões e auditoria conferidas.
- [x] Restore de staging testado em ambiente isolado e temporário já excluído.
- [ ] Produção recusa `local` e falha segura sem binding.
- [x] Sessão, logout, rate limit, locks e fencing validados em staging.
