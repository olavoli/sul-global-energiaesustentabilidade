# Checklist de release

Este checklist não significa que o portal foi lançado.

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
