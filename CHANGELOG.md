# Changelog

## Não publicado — Sprint 8

### Adicionado

- Fontes estruturadas, workflow editorial completo, histórico de correções e guardrails por tipo.
- Seis templates, CLI segura de criação de drafts e validação editorial com resumo acionável.
- Página de metodologia, padrões editoriais, política de IA e plano de conteúdo para lançamento.
- Dezessete testes de fluxo editorial, sem novo framework ou dependência.

### Alterado

- Repositório publica apenas estado `published` com data não futura; demos permanecem separados.
- Sitemap e smoke incluem metodologia; artigo pode exibir fontes estruturadas, atualizações e disclosures.

Nenhuma notícia, fonte, citação ou autoria real foi inventada. Não houve publicação automática, CMS, deploy ou integração externa.

## Não publicado — Sprint 7

### Adicionado

- Matriz de ambientes, headers de segurança, CSP e proteção explícita de previews.
- Páginas iniciais de privacidade, termos e política editorial.
- Observabilidade sem fornecedor, smoke tests do worker e documentação operacional de deploy/release.

### Alterado

- Preview Wrangler passou a declarar Node como runtime; Bun permanece no restante da toolchain.
- Formulários simulados e feeds não oficiais passaram a comunicar e falhar de forma segura.

Nenhum deploy, domínio, segredo, analytics, anúncio, CMS ou persistência foi ativado.

## Não publicado — Sprint 6

### Adicionado

- Contrato editorial de mídia e componente de imagem responsiva com fallback.
- Ativo social local provisório 1200×630, breadcrumbs visíveis e disclosure patrocinado acessível.
- Estrutura publicitária desativada e 13 testes de mídia/acessibilidade.
- Inventário de imagens externas, orçamento de performance e checklist pré-publicação.

### Alterado

- Capas passaram de strings dispersas para objetos validados; dimensões desconhecidas continuam explicitamente não informadas.
- Menu móvel passou a gerenciar foco e a tipografia externa deixou de solicitar o peso Newsreader 500 sem uso comprovado.

Nenhuma publicidade, analytics, CMS ou imagem de terceiro foi incorporada ao repositório.

## Não publicado — Sprint 5

### Adicionado

- Canonicals, Open Graph, Twitter Cards e dados estruturados coerentes por tipo de página.
- Rota pública de autor e endpoints `/robots.txt`, `/sitemap.xml` e `/rss.xml`.
- Preview do artefato Nitro/Cloudflare com Wrangler e 12 testes de SEO/distribuição.

### Alterado

- Conteúdo demo continua excluído por padrão em produção e ambientes sem URL pública ficam bloqueados para indexação.
- RSS identifica material patrocinado; nenhuma rede de anúncios ou identificador fictício foi ativado.

Todas as mudanças relevantes deste projeto serão documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Adicionado

- Pipeline MDX validado por Zod, índice editorial resumido e carregamento de corpos sob demanda.
- Componentes editoriais autorizados, fontes estruturadas e guardrails de patrocínio.
- Dez testes automatizados da camada editorial e fluxo de publicação documentado.

- Fundação documental do projeto.
- Política determinística de finais de linha com Git e EditorConfig.
- Script de typecheck e workflow mínimo de CI.
- Configuração central de informações públicas e exemplo de ambiente.
- Proteção em duas camadas para conteúdo editorial fictício.

### Corrigido

- Índice de `docs/` reconciliado com a existência do frontend atual e com a distinção entre implementação e arquitetura planejada.
- Estado documental atualizado com os resultados reais de instalação, lint, build e servidor de desenvolvimento.
- Mensagens raiz de 404 e erro traduzidas para português brasileiro.
- Baseline de lint restaurada sem desabilitação global de regras.

### Alterado

- Doze artigos demonstrativos migrados de TypeScript para arquivos MDX individuais.
- Home, artigo, categoria e busca passaram a consumir uma interface única de conteúdo.

### Removido

- `src/data/articles.ts` e o utilitário de busca acoplado à fonte anterior.

## [v0.1.0]

### Adicionado

- Primeira versão conhecida do portal Sul Global.
