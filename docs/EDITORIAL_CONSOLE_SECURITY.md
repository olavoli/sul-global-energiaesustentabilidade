# Segurança da Central Editorial

`NEWSROOM_ADMIN_SECRET` é segredo exclusivo do servidor. Nunca use prefixo `VITE_`, localStorage, query string ou valor versionado. Sem segredo, a API fica indisponível e as rotas protegidas não abrem.

O login compara digests SHA-256 sem retorno antecipado e cria sessão HMAC de oito horas. O cookie é `HttpOnly`, `SameSite=Strict`, `Path=/` e recebe `Secure` em produção. Logout expira o cookie. Cinco falhas em quinze minutos bloqueiam temporariamente novas tentativas por origem.

Cada sessão contém token CSRF aleatório. Toda mutação exige `X-CSRF-Token`, ator igual ao ator da sessão, schema Zod e confirmação.

- autorização ocorre antes do SSR;
- respostas privadas usam `Cache-Control: private, no-store`;
- páginas e APIs administrativas recebem `noindex, nofollow`;
- IDs aceitam somente formatos conhecidos;
- componentes cliente nunca leem arquivos em `newsroom/`;
- erros enviados ao navegador não contêm paths locais;
- segredo, cookie e CSRF não são registrados;
- dados privados não entram em sitemap, RSS ou navegação pública.

O filesystem do worker Cloudflare não é backend persistente. Até existir armazenamento privado aprovado, a operação mutável é suportada somente no ambiente local/server compatível.

O backend durável preparado é D1 server-side. O cookie passou a carregar token
opaco; a sessão revogável fica no storage e expira em oito horas. Login usa rate
limit durável por identificador derivado. Ações adquirem lock por entidade,
validam CSRF/ator e geram auditoria resumida append-only. Produção sem binding
falha fechada. Consulte `NEWSROOM_STORAGE_SECURITY.md`.
