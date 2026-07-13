# Roadmap

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
- [ ] Estabelecer testes automatizados; o CI mínimo já está configurado.
- [ ] Verificar acessibilidade, desempenho e comportamento SSR em ambiente publicado.

## Era 2 — Sistema Editorial

### Objetivo

Permitir produção, validação e publicação de conteúdo por um fluxo editorial definido.

### Itens concluídos

- [x] Tipos básicos de artigo, autor e categoria.
- [x] Páginas de leitura e listagem sobre dados simulados.

### Itens pendentes

- [ ] Decidir entre conteúdo no repositório e CMS.
- [ ] Implementar persistência e validação da fonte escolhida.
- [ ] Criar fluxo de rascunho, revisão e publicação.
- [ ] Implementar página e arquivo de autores.
- [ ] Substituir conteúdo demonstrativo por conteúdo editorial validado.

## Era 3 — SEO

### Objetivo

Tornar o conteúdo rastreável, compartilhável e tecnicamente consistente para mecanismos de busca.

### Itens concluídos

- [x] Metadados básicos definidos nas rotas existentes.
- [x] Renderização via TanStack Start.

### Itens pendentes

- [ ] Implementar canonical por rota.
- [ ] Implementar Open Graph e Twitter Cards completos.
- [ ] Implementar JSON-LD para organização e artigos.
- [ ] Gerar sitemap e feed RSS.
- [ ] Adicionar e validar `robots.txt`.
- [ ] Auditar SSR, indexação e Core Web Vitals em produção.

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

- [ ] Nenhum item de monetização está implementado.

### Itens pendentes

- [ ] Definir política editorial para publicidade e patrocínio.
- [ ] Definir critérios de ativação baseados em audiência e desempenho.
- [ ] Projetar slots publicitários antes de integrar scripts externos.
- [ ] Definir transparência e identificação de conteúdo patrocinado.
- [ ] Avaliar modelos de assinatura e produtos somente após validação das Eras anteriores.
