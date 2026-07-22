# Roadmap

- Sprint 28: infraestrutura local do EvidenceDossier; coleta controlada depende de autorização humana.

## Sprint 26

Sinais temporais observacionais e conservadores sobre a memória existente, sem previsão, coleta, agenda ou publicação.

## Sprint 23 — Grafo Científico V1

Fundação local para um piloto supervisionado. O checkpoint de dry-run antecede qualquer persistência. Interpretação de evidência, agenda e novas fontes não pertencem a esta Sprint.

## Sprint 20 — staging remoto validado

Worker, D1, migration, seed, Central protegida, smoke, sessão durável, rate
limit, locks, backup/restore e rollback foram validados em staging isolado.
Produção, domínio definitivo, indexação, publicação, agenda, IA e integrações
externas permanecem fora de operação.

## Sprint 19 — preparada localmente

Configuração, emulação D1, seed, smoke, workflow e operação de staging estão
versionados. Naquela Sprint, provisionamento, migrations remotas, deploy e
smoke remoto permaneceram pendentes; foram executados sob autorização na
Sprint 20. Produção não foi promovida.

## Sprint 17 — Central Editorial privada

Implementada localmente com sessão administrativa única, cockpit operacional e ações supervisionadas. Próximos passos dependem de backend privado persistente, autenticação definitiva e revisão de implantação; publicação continua fora da Central.

## Sprint 16 — concluída localmente

Pipeline diário supervisionado, agenda protegida, controles operacionais, relatório, inbox, recovery e workflow foram implementados. Backend persistente, Cloudflare Cron, notificação remota, IA e publicação continuam fora do escopo.

## Entregue na Sprint 15

Orquestração supervisionada, decisões privadas, risco, readiness, revisão e contrato de pauta estão implementados. Permanecem futuros: ampliar fontes independentes, revisar traduções, operar pautas reais, redação factual, agenda e qualquer publicação automatizada.

## Entregue na Sprint 14

Clusters, claims, pacotes de evidência e tradução demonstrativa offline estão implementados. Continuam futuros e não autorizados: provider externo, tradução em massa, geração de texto, verificação factual automatizada, agenda diária e publicação automática.

## Sprint 12

Fontes, saúde, coleta controlada, quarentena, métricas e cobertura concluídos. Primeiro cadastro real depende de URL/evidência. Agenda, tradução, IA e publicação não foram implementadas.

## Sprint 12

Fontes, saúde, coleta controlada, quarentena, métricas e cobertura concluídos. O primeiro cadastro real depende de URL/evidência fornecida. Agenda, tradução, IA e publicação não foram implementadas.

## Épico 4 — Sprint 11 concluída

- [x] Cadastro e validação do primeiro autor real autorizado.
- [x] RSS/Atom e fixture local, sem scraping e sem fonte externa ativa.
- [x] Normalização, deduplicação, classificação e scoring explicável.
- [x] Fila e auditoria locais com aprovação limitada a briefing.
- [ ] Confirmar e autorizar feeds reais antes de qualquer ativação.
- [ ] Planejar verificação cruzada avançada em Sprint separada.
- [ ] Tradução, IA, agenda e publicação automática continuam fora do escopo.

O roadmap organiza a evolução por Eras, sem datas ou compromissos de prazo. Itens concluídos refletem apenas o estado confirmado do repositório.

## Era 1 — Fundação

### Objetivo

Consolidar a base técnica, documental e visual do portal público.

### Itens concluídos

- [x] Aplicação React, TypeScript e TanStack Start configurada.
- [x] Layout responsivo com cabeçalho, rodapé e temas claro e escuro.
- [x] Home, artigo, categoria, busca, sobre, newsletter e contato.
- [x] Conteúdo editorial simulado em dados TypeScript.
- [x] Fundação documental inicial.
- [x] Baseline reproduzível de LF, lint, typecheck e CI.
- [x] Proteção contra publicação silenciosa do conteúdo demonstrativo.

### Itens pendentes

- [ ] Resolver divergências entre arquitetura documentada e implementação.
- [ ] Definir a fonte definitiva de conteúdo.
- [x] Estabelecer testes automatizados; o CI mínimo já está configurado.
- [ ] Verificar acessibilidade, desempenho e comportamento SSR em ambiente publicado.
- [x] Criar baseline local de imagens responsivas, foco, testes e orçamento de performance.

## Era 2 — Sistema Editorial

### Objetivo

Permitir produção, validação e publicação de conteúdo por um fluxo editorial definido.

### Itens concluídos

- [x] Tipos básicos de artigo, autor e categoria.
- [x] Páginas de leitura e listagem sobre dados simulados.
- [x] MDX versionado como fonte editorial da fase atual.
- [x] Validação Zod, índice resumido e loaders sob demanda.
- [x] Fluxo de rascunho, revisão e publicação documentado.
- [x] Matriz de ambientes, proteção de preview e produção explícita.
- [x] Páginas legais iniciais, headers, observabilidade abstrata e smoke do worker.
- [x] Documentação de deploy e checklists de release e lançamento editorial.
- [x] Taxonomia estável, fontes estruturadas e workflow completo por metadata no Git.
- [x] Templates e CLI que criam somente drafts, com validação pré-publicação.
- [x] Metodologia pública, política de IA e plano de pautas não produzidas.
- [x] Operação CLI para inventário, revisão, transição e publish-check.
- [x] Autoria tipada e piloto estrutural draft sem conteúdo factual.
- [x] Onboarding privado, verificação explícita e perfil pending protegido.
- [x] Briefing de pesquisa, classificação de fontes e gate para redação factual.

### Itens pendentes

- [ ] Decidir entre conteúdo no repositório e CMS.
- [ ] Implementar persistência e validação da fonte escolhida.
- [x] Criar fluxo de rascunho, revisão, aprovação, agendamento e publicação por metadata.
- [x] Implementar página e arquivo de autores.
- [ ] Substituir conteúdo demonstrativo por conteúdo editorial validado.
- [ ] Apurar, revisar e aprovar a coleção inicial real conforme o plano de lançamento.
- [ ] Receber dados autorizados, verificar o primeiro autor e substituir o marcador técnico.
- [ ] Apurar e preencher o piloto com fontes confirmadas, fact-checks e mídia licenciada.
- [ ] Definir domínio, revisar textos jurídicos e executar implantação pública controlada.

## Era 3 — SEO

### Objetivo

Tornar o conteúdo rastreável, compartilhável e tecnicamente consistente para mecanismos de busca.

### Itens concluídos

- [x] Metadados básicos definidos nas rotas existentes.
- [x] Renderização via TanStack Start.
- [x] Canonicals, metadados sociais e JSON-LD por tipo de página.
- [x] Sitemap, RSS, robots e páginas de autor.

### Itens pendentes

- [x] Implementar canonical por rota.
- [x] Implementar Open Graph e Twitter Cards completos.
- [x] Implementar JSON-LD para organização e artigos.
- [x] Gerar sitemap e feed RSS.
- [x] Adicionar e validar `robots.txt`.
- [ ] Auditar SSR, indexação e Core Web Vitals no domínio real de produção.

## Era 4 — Audiência

### Objetivo

Medir o uso do portal e criar canais próprios de relacionamento com leitores.

### Itens concluídos

- [x] Interface de busca local.
- [x] Interface de inscrição em newsletter, sem integração.
- [x] Controles de compartilhamento em artigos.

### Itens pendentes

- [ ] Definir e integrar serviço de newsletter com consentimento e privacidade.
- [ ] Definir e integrar analytics.
- [ ] Implementar métricas editoriais e operacionais.
- [ ] Definir estratégia de segmentação e retenção de audiência.

## Era 5 — Monetização

### Objetivo

Viabilizar receitas sem comprometer independência editorial, privacidade ou desempenho.

### Itens concluídos

- [x] Abstração de slot responsivo criada e desativada, sem scripts ou IDs.

### Itens pendentes

- [ ] Definir política editorial para publicidade e patrocínio.
- [ ] Definir critérios de ativação baseados em audiência e desempenho.
- [ ] Projetar slots publicitários antes de integrar scripts externos.
- [ ] Definir transparência e identificação de conteúdo patrocinado.
- [ ] Avaliar modelos de assinatura e produtos somente após validação das Eras anteriores.

## Após o piloto de fontes

- [x] Ativar catálogo pequeno com evidência e health check.
- [x] Executar coleta manual e revisão amostral sem publicação.
- [ ] Curar fontes aptas no Brasil, América Latina, África e Ásia.
- [ ] Melhorar dicionários multilíngues após amostras humanas.
- [ ] Só considerar agenda recorrente após estabilidade e revisão jurídica.

## Persistência serverless

- [x] Contratos, adapter local, adapter D1 e emulador.
- [x] Migrations, import/export, locks, sessão, rate limit e auditoria.
- [x] Provisionar D1 de staging e aplicar migrations com autorização.
- [x] Testar recuperação em D1 temporário isolado antes de qualquer produção.
- [ ] Avaliar R2 se relatórios excederem o limite operacional definido.
# Sprint 29

Workspace Editorial de Pesquisa implementado localmente e aguardando revisão humana. A etapa não inclui publicação nem inicia a Sprint seguinte.
