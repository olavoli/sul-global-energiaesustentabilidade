# Documentação do Sul Global

## Inteligência bibliográfica

- [Grafo Científico](SCIENTIFIC_KNOWLEDGE_GRAPH.md)
- [Resolução determinística de entidades](ENTITY_RESOLUTION.md)
- [Schema](SCIENTIFIC_GRAPH_SCHEMA.md)
- [Revisão](SCIENTIFIC_GRAPH_REVIEW.md)
- [Proveniência](SCIENTIFIC_GRAPH_PROVENANCE.md)
- [Limites](SCIENTIFIC_GRAPH_LIMITS.md)
- [Dossiê Científico](SCIENTIFIC_DOSSIER.md)

- [Staging](STAGING.md)
- [Checklist de staging](STAGING_CHECKLIST.md)
- [Smoke de staging](STAGING_SMOKE_TESTS.md)
- [Rollback de staging](STAGING_ROLLBACK.md)
- [Relatório de provisionamento](STAGING_PROVISIONING_REPORT.md)
- [Validação remota de staging](STAGING_REMOTE_VALIDATION.md)
- [Acesso administrativo de staging](STAGING_ADMIN_ACCESS.md)
- [Radar Científico](SCIENTIFIC_RADAR.md)
- [Checklist de promoção](PRODUCTION_PROMOTION_CHECKLIST.md)
- [Central Editorial](EDITORIAL_CONSOLE.md)
- [Segurança da Central](EDITORIAL_CONSOLE_SECURITY.md)
- [Operação da Central](EDITORIAL_CONSOLE_OPERATIONS.md)

Automação supervisionada: [NEWSROOM_AUTOMATION](NEWSROOM_AUTOMATION.md), [DAILY_REPORT](NEWSROOM_DAILY_REPORT.md), [INBOX](NEWSROOM_INBOX.md), [RECOVERY](NEWSROOM_RECOVERY.md) e [RUNBOOK](NEWSROOM_RUNBOOK.md).

## Orquestrador — Sprint 15

- [`NEWSROOM_ORCHESTRATOR.md`](NEWSROOM_ORCHESTRATOR.md)
- [`NEWSROOM_EDITORIAL_POLICY.md`](NEWSROOM_EDITORIAL_POLICY.md)
- [`NEWSROOM_RISK_MODEL.md`](NEWSROOM_RISK_MODEL.md)
- [`NEWSROOM_PITCH_WORKFLOW.md`](NEWSROOM_PITCH_WORKFLOW.md)

## Redação algorítmica — Sprint 14

- [`NEWSROOM_CLUSTERING.md`](NEWSROOM_CLUSTERING.md) — regras e revisão de clusters;
- [`NEWSROOM_EVIDENCE_PACKAGES.md`](NEWSROOM_EVIDENCE_PACKAGES.md) — claims e pacotes;
- [`NEWSROOM_TRANSLATION.md`](NEWSROOM_TRANSLATION.md) — providers e fila;
- [`NEWSROOM_TRANSLATION_QA.md`](NEWSROOM_TRANSLATION_QA.md) — guardrails e revisão.

Piloto de fontes reais: [NEWSROOM_REAL_SOURCES](NEWSROOM_REAL_SOURCES.md), [NEWSROOM_HEALTH](NEWSROOM_HEALTH.md) e [NEWSROOM_COVERAGE](NEWSROOM_COVERAGE.md).

Esta pasta reúne os documentos técnicos e estratégicos que orientam a evolução do projeto. A aplicação já possui um frontend funcional em React e TanStack Start, com rotas públicas e conteúdo editorial simulado em arquivos TypeScript.

Os documentos devem ser lidos considerando duas perspectivas:

- **Implementação atual:** comportamento comprovado pelo código e registrado em `IMPLEMENTATION_STATUS.md` e `TECHNICAL_INVENTORY.md`, na raiz do repositório.
- **Arquitetura planejada:** decisões, modelos e integrações descritos nesta pasta que podem representar estado futuro e ainda não estar implementados.

## Índice

1. [VISION.md](./VISION.md) — missão, público e posicionamento editorial.
2. [ARCHITECTURE.md](./ARCHITECTURE.md) — arquitetura pretendida, stack e integrações planejadas.
3. [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) — princípios visuais, tokens, tipografia e acessibilidade.
4. [PROJECT_RULES.md](./PROJECT_RULES.md) — regras técnicas detalhadas para evolução do projeto.
5. [ROADMAP.md](./ROADMAP.md) — evolução organizada por Eras e situação dos itens planejados.
6. [CONTENT_MODEL.md](./CONTENT_MODEL.md) — modelo editorial planejado para artigos, autores e categorias.
7. [TECHNICAL_AUDIT.md](./TECHNICAL_AUDIT.md) — auditoria verificável de arquitetura, qualidade, performance, acessibilidade, SEO, segurança e prioridades.
8. [EDITORIAL_CONTENT_WORKFLOW.md](./EDITORIAL_CONTENT_WORKFLOW.md) — criação, validação, revisão e publicação em MDX.
9. [PUBLISHING_SEO.md](./PUBLISHING_SEO.md) — URL pública, preview Nitro, SEO, sitemap, RSS e checklist de deploy.
10. [PERFORMANCE_ACCESSIBILITY.md](./PERFORMANCE_ACCESSIBILITY.md) — contrato de mídia, inventário externo, fontes, orçamento e acessibilidade.
11. [DEPLOYMENT.md](./DEPLOYMENT.md) — ambientes, toolchain, segurança, build, preview, rollback e operação.
12. [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) — gates obrigatórios, recomendados e futuros para uma release.
13. [EDITORIAL_LAUNCH_CHECKLIST.md](./EDITORIAL_LAUNCH_CHECKLIST.md) — validação editorial antes do primeiro lançamento.
14. [EDITORIAL_STANDARDS.md](./EDITORIAL_STANDARDS.md) — taxonomia, tipos, fontes, workflow, templates e correções.
15. [AI_EDITORIAL_POLICY.md](./AI_EDITORIAL_POLICY.md) — usos permitidos, proibições e disclosure de IA.
16. [LAUNCH_CONTENT_PLAN.md](./LAUNCH_CONTENT_PLAN.md) — inventário de pautas a apurar, sem conteúdo produzido.
17. [EDITORIAL_OPERATIONS.md](./EDITORIAL_OPERATIONS.md) — rotina CLI, transições, autoria, demos e rollback.
18. [ARTICLE_REVIEW_CHECKLIST.md](./ARTICLE_REVIEW_CHECKLIST.md) — bloqueadores, warnings e recomendações por artigo.
19. [AUTHOR_ONBOARDING.md](./AUTHOR_ONBOARDING.md) — cadastro mínimo, campos públicos e verificação explícita.
20. [RESEARCH_WORKFLOW.md](./RESEARCH_WORKFLOW.md) — briefing, fontes, fact-check e gate para redação.
21. [FIRST_ARTICLE_PLAN.md](./FIRST_ARTICLE_PLAN.md) — estado e sequência segura do piloto real.

## Referências na raiz

- [`PROJECT_RULES.md`](../PROJECT_RULES.md) — resumo executivo das regras do projeto.
- [`README.md`](../README.md) — apresentação, instalação e comandos de uso.
- [`IMPLEMENTATION_STATUS.md`](../IMPLEMENTATION_STATUS.md) — estado funcional atual, rotas e limitações.
- [`TECHNICAL_INVENTORY.md`](../TECHNICAL_INVENTORY.md) — inventário comprovado de estrutura, componentes e dependências.
- [`DECISIONS.md`](../DECISIONS.md) — decisões técnicas confirmadas.
- [`CHANGELOG.md`](../CHANGELOG.md) — registro de mudanças relevantes.

Antes de implementar itens descritos como planejados, confirme o estado atual nos documentos da raiz e obtenha a aprovação arquitetural correspondente.

## Redação algorítmica

- [ALGORITHMIC_NEWSROOM.md](./ALGORITHMIC_NEWSROOM.md) — arquitetura e limites do MVP local.
- [NEWSROOM_SOURCE_POLICY.md](./NEWSROOM_SOURCE_POLICY.md) — seleção, confiança, direitos e atribuição.
- [NEWSROOM_OPERATIONS.md](./NEWSROOM_OPERATIONS.md) — CLI, fila, auditoria e incidentes.
- [NEWSROOM_SCORING.md](./NEWSROOM_SCORING.md) — dicionário, pesos, dimensões e recomendações.
- [NEWSROOM_SOURCE_CURATION.md](./NEWSROOM_SOURCE_CURATION.md) — evidências, decisões e coleta piloto.
- [NEWSROOM_SOURCE_HEALTH.md](./NEWSROOM_SOURCE_HEALTH.md) — saúde operacional dos feeds ativos.
- [NEWSROOM_SOURCE_COVERAGE.md](./NEWSROOM_SOURCE_COVERAGE.md) — lacunas geográficas e temáticas.
- [NEWSROOM_STORAGE.md](./NEWSROOM_STORAGE.md) — arquitetura e drivers de persistência.
- [NEWSROOM_STORAGE_MIGRATION.md](./NEWSROOM_STORAGE_MIGRATION.md) — migrations e importação.
- [NEWSROOM_BACKUP_RECOVERY.md](./NEWSROOM_BACKUP_RECOVERY.md) — backup e restauração.
- [NEWSROOM_STORAGE_SECURITY.md](./NEWSROOM_STORAGE_SECURITY.md) — ameaças e controles.
