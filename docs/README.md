# Documentação do Sul Global

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

## Referências na raiz

- [`PROJECT_RULES.md`](../PROJECT_RULES.md) — resumo executivo das regras do projeto.
- [`README.md`](../README.md) — apresentação, instalação e comandos de uso.
- [`IMPLEMENTATION_STATUS.md`](../IMPLEMENTATION_STATUS.md) — estado funcional atual, rotas e limitações.
- [`TECHNICAL_INVENTORY.md`](../TECHNICAL_INVENTORY.md) — inventário comprovado de estrutura, componentes e dependências.
- [`DECISIONS.md`](../DECISIONS.md) — decisões técnicas confirmadas.
- [`CHANGELOG.md`](../CHANGELOG.md) — registro de mudanças relevantes.

Antes de implementar itens descritos como planejados, confirme o estado atual nos documentos da raiz e obtenha a aprovação arquitetural correspondente.
