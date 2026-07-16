# Central Editorial privada

A Central Editorial é o cockpit operacional privado da newsroom. As rotas vivem em `/admin/newsroom`, fora da navegação pública, sitemap e RSS. O servidor bloqueia o namespace antes do SSR; páginas protegidas não recebem dados operacionais no HTML sem sessão válida.

Rotas cobrem visão geral, inbox, decisões, clusters, traduções, fontes, quarentena, execuções, relatórios, pautas e configuração somente leitura. O dashboard usa indicadores textuais e tabelas, sem inventar gráficos.

Inbox, decisões e traduções aceitam ações humanas já suportadas pelos serviços de domínio. Ações exigem sessão, CSRF, ator, nota quando aplicável e confirmação. Aprovar para pauta não cria artigo. Criar pauta exige decisão humana `approved-for-pitch` persistida e nunca produz MDX.

O pipeline manual disponível na interface é limitado a `dry-run`, `validate-only`, `process-existing` e `report-only`. Apply completo e coleta externa mutável estão bloqueados.

Não há CMS, publicação, múltiplos usuários, OAuth, recuperação de senha, analytics, IA externa, tradução remota ou dashboard público.

## Persistência

Leituras e ações usam o adapter configurado no servidor. Sessões, rate limit,
locks e auditoria não dependem de memória da instância em produção. Conflitos
de concorrência retornam 409 sanitizado; storage ausente retorna 503. Rotas e
componentes não conhecem D1 nem paths locais.
