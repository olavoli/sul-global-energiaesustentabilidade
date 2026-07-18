# Validação remota de staging

Data: 2026-07-18  
Alvo: `https://sul-global-staging.sul-global.workers.dev`

## Validações locais

- instalação congelada, typecheck, lint e build aprovados;
- preview executado com Node real >=20 e encerrado sem processo órfão;
- testes e smoke local da Sprint 19 permaneceram aprovados;
- manifesto versionado conserva placeholders e nenhum ID real;
- nenhuma dependência ou lockfile foi alterado.

## Validações por emulador

- migration idempotente;
- seed sanitizado;
- contratos D1 de documentos, sessões, rate limit, locks e fencing;
- export, checksum, restore e comparação de IDs;
- falha segura sem binding e isolamento de ambientes.

## Validações remotas

- home, autor Olavo, páginas legais, robots, sitemap e RSS responderam;
- draft piloto permaneceu 404;
- staging permaneceu `noindex`;
- Central anônima respondeu 401;
- login, dashboard, health D1 e logout responderam 200;
- sessão persistiu após nova versão do Worker;
- logout revogou a sessão e replay respondeu 401;
- rate limit preservou duas tentativas através de nova versão;
- lock expirado elevou fencing de 41 para 42;
- concorrente ativo e owner antigo foram recusados;
- `run:cleanup` executou apenas planejamento e gerou auditoria;
- migration ficou sem pendências e o seed foi idempotente;
- backup remoto foi restaurado com todas as tabelas idênticas;
- D1 temporário de restore foi excluído;
- rollback retornou à versão anterior com home 200 e Central anônima 401;
- versão atual foi restaurada e confirmada.

## Correções objetivas encontradas

Nitro delegava ao serviço SSR somente o `Request`; os bindings estavam no
contexto Cloudflare anexado ao request. `src/server.ts` passou a resolver esse
contexto antes de configurar a Central.

`run:cleanup` dependia da leitura da política diária no filesystem. A política
padrão passou a ser importada estaticamente no bundle, mantendo leitura por
arquivo somente para caminhos locais alternativos.

O preview local também passou a exigir Node real >=20, evitando a tentativa de
executar Wrangler sob compatibilidade parcial do Bun.

## Não executado

- nenhuma requisição ou migration em produção;
- nenhum domínio oficial, DNS ou rota customizada;
- nenhuma publicação ou agenda;
- nenhuma coleta externa;
- nenhuma IA ou tradução externa;
- nenhum anúncio, analytics ou deploy de produção;
- nenhum commit, push ou merge.

## Riscos restantes

- autenticação administrativa continua single-secret;
- não há identidade federada, alerta externo nem métricas de campo;
- conteúdo demo permanece fisicamente no bundle, embora bloqueado;
- revisão jurídica, domínio, conteúdo real e checklist de produção permanecem
  pendentes;
- diff e recursos Cloudflare ainda aguardam revisão humana.
