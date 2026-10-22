# Correções locais de SEO e privacidade — 22/10/2026

## Escopo e resultado

- Categoria sem artigos publicados: `noindex, follow`, canonical próprio e exclusão do sitemap. A regra usa a contagem de artigos recebidos do repositório público, para qualquer categoria. Categorias preenchidas preservam metadados, breadcrumb e indexação implícita. Fora de produção, o head mantém `noindex, nofollow`.
- URL, navegação, cards, artigos, tags, busca, RSS, publicidade e funcionalidades existentes preservados. Uma primeira publicação torna a categoria elegível automaticamente; a remoção da última retira sua elegibilidade.
- Privacidade: removidas as afirmações de ausência de publicidade e de cookies não essenciais. Documentado o banner existente, a comunicação com terceiros e a ausência atual de escolha de consentimento publicitário. Não foi implementado um gestor de consentimento nem alterado o carregamento do anúncio.
- HTTP → HTTPS: o responsável informou que configurou o redirecionamento na Cloudflare e o validou externamente com HTTP 301. Nenhuma configuração de HTTPS foi alterada por esta correção local.

## HTTPS: diagnóstico histórico e resolução externa informada

Atualização para preparação da publicação: o responsável confirmou a configuração externa e a validação com HTTP 301. Não executar novamente o procedimento abaixo; ele permanece somente como registro da recomendação original. Não houve nova consulta às configurações privadas nem alteração de HTTPS nesta preparação.

Evidências: as quatro consultas HTTP da auditoria (home, tag, busca com query e ART-032) responderam 200 sem `Location`; uma consulta HEAD independente à tag confirmou `Server: cloudflare`. `src/server.ts` não redireciona o esquema. HSTS em `src/lib/security-headers.ts` só é emitido para HTTPS em produção, não substitui o redirecionamento de uma primeira requisição HTTP.

O destino versionado é o Worker `sul-global-production`, definido em `cloudflare/wrangler.production.template.jsonc` e protegido por `scripts/production-config.ts`. O template fixa a URL pública HTTPS e não declara `routes`/`custom_domain`. O vínculo efetivo do domínio e as regras da zona precisam ser conferidos no painel; não foram consultadas configurações privadas nem alterados DNS, Worker ou regras remotas.

Mecanismo recomendado: **Always Use HTTPS na borda Cloudflare**, evitando uma segunda regra no Worker. Fonte oficial consultada em 22/10/2026: <https://developers.cloudflare.com/ssl/edge-certificates/additional-options/always-use-https/>.

Procedimento originalmente proposto (não executar nesta publicação):

1. Selecionar a zona `sulglobalenergia.com.br` e conferir Workers & Pages → `sul-global-production` → Settings → Domains & Routes, confirmando o vínculo de produção. Não criar nem modificar DNS/vínculos nesta operação.
2. Conferir regras existentes de redirecionamento (Redirect Rules, Page Rules, Bulk Redirects, Snippets e eventuais Workers) e SSL/TLS. Se já existir uma regra equivalente, diagnosticar por que não atua; não duplicá-la. Registrar o estado anterior para reversão.
3. Em SSL/TLS → Edge Certificates, habilitar **Always Use HTTPS**, somente após confirmar HTTPS válido e compatibilidade de todos os hosts atendidos pela zona. A opção abrange hosts/subdomínios: se houver serviços que precisem permanecer HTTP, não habilitar globalmente; submeter uma Single Redirect restrita ao host público para autorização. Não alterar o modo SSL/TLS ou outros serviços para viabilizar a opção.
4. Validar, sem seguir redirects automaticamente:

   ```powershell
   curl.exe --max-time 20 --silent --show-error --head http://sulglobalenergia.com.br/
   curl.exe --max-time 20 --silent --show-error --head "http://sulglobalenergia.com.br/busca?q=energia%20solar&pagina=2"
   curl.exe --max-time 20 --silent --show-error --head http://sulglobalenergia.com.br/tag/agrivoltaica
   ```

   Exigir redirecionamento permanente para o mesmo host, caminho e query em HTTPS. Conferir também artigo, arquivo estático e URL inexistente, e que o destino HTTPS não redirecione de volta para HTTP. Não usar HSTS ou `upgrade-insecure-requests` do navegador como prova de redirect do servidor.

5. Se houver conflito, loop ou alteração de host/caminho/query, interromper e restaurar somente a configuração recém-alterada ao estado registrado. Não adicionar uma regra alternativa no Worker silenciosamente.

## Publicidade, armazenamento e consentimento: evidências e limites

- `ArticleAdRail.tsx` carrega o iframe somente após hidratação, com largura mínima de 1440 px e margem suficiente. Não consulta preferência de consentimento. A restrição de tamanho não é um mecanismo de consentimento.
- `src/lib/advertising/adsterra.ts` entrega o script `https://bicea.org/22/b5a35db3ccd7e9e06392b002636eb4d5` no recurso isolado `/_ads/adsterra-160x600.html`. A CSP/sandbox limita o documento; permite frames HTTPS de criativos. Isso não demonstra ausência de cookies, medição, dados técnicos ou terceiros.
- Newsletter e comentários possuem consentimentos próprios; não há conexão desses consentimentos com publicidade. Preferências locais e cookies de comentários/administração continuam descritos na política. Não foi alterado nenhum desses mecanismos.
- Não houve execução de criativos reais ou inventário exaustivo de cookies/rede nesta rodada. Não se atribuem ao Sul Global os cookies listados para o site institucional da Adsterra. Nomes, retenção, destinos e comportamento efetivo dos criativos ainda precisam de medição em ambiente autorizado; não se afirma que cookies estejam efetivamente presentes em toda visita.
- Políticas do fornecedor consultadas: <https://adsterra.com/privacy-policy-managed/> e <https://adsterra.com/cookies/>. São documentação do fornecedor, não prova de cada tratamento que ocorra nesta unidade específica.

Decisões editoriais/jurídicas pendentes: avaliar finalidade/base aplicável, necessidade e forma de consentimento prévio/recusa/revogação e informações sobre destinatários, retenção e transferências, à luz do comportamento efetivo e da documentação contratual do fornecedor. A correção da redação **não certifica conformidade jurídica** nem substitui controles que venham a ser necessários. Esta tarefa não autoriza sua implementação ou a alteração do anúncio.

## Arquivos deste trabalho

- `src/lib/category-seo.ts`
- `src/lib/category-seo.test.ts`
- `src/lib/distribution.ts`
- `src/routes/categoria.$slug.tsx`
- `src/routes/privacidade.tsx`
- `src/lib/privacy.test.tsx`
- `docs/SEO_PRIVACIDADE_2026-10-22.md`

## Validação local

- 34 testes focados aprovados: categorias, sitemap/SEO, tags, busca, privacidade renderizada em SSR e isolamento/responsividade do banner. O teste de privacidade foi movido de `src/routes/` para `src/lib/privacy.test.tsx` para não ser interpretado pelo gerador de rotas; foi reconferido com sucesso no caminho final.
- `bun run typecheck`: aprovado. O gerador apresentou os 27 avisos editoriais preexistentes e zero erros; nenhum artigo ou índice versionado foi alterado.
- Lint dos seis arquivos TypeScript/TSX desta correção: aprovado, sem avisos. A execução geral de `bun run lint` ficou sem resultado e foi interrompida; não é registrada como aprovada.
- Build de preview local: aprovado, sem deploy. As primeiras tentativas não iniciaram por `CouldntReadCurrentDirectory` no sandbox; a mesma execução fora do sandbox concluiu. Sem limpeza, alteração de dependências ou configuração de produção. O aviso transitório do teste dentro de `src/routes/` foi resolvido pela movimentação descrita acima; nenhuma rota pública foi adicionada.
- Prettier dos arquivos deste trabalho e `git diff --check`: aprovados. Canonicals, breadcrumb, robots rastreável, exclusão de rascunhos e regras existentes das tags/busca cobertos pelos testes. O sitemap local passa a excluir a categoria vazia, sem alterar URLs de artigos.

Sem staging, commit, push, deploy ou alteração remota. Alterações anteriores e `artifacts/` fora do escopo.

## Preparação do pacote seletivo

Branch inspecionada: `main`; HEAD `d001b6b` (`feat(ads): add responsive isolated Adsterra article rail`). Índice Git vazio. Os sete arquivos acima foram conferidos individualmente: os três arquivos rastreados contêm somente o diff desta correção; os quatro novos arquivos contêm o helper, os dois testes e este relatório. Não foram encontradas alterações anteriores não relacionadas dentro desses sete arquivos.

Há alterações locais anteriores em admin, Kit, migrations/testes de armazenamento, staging e documentação; nenhuma integra este pacote. O build de preview existente passou, mas foi produzido no workspace com essas alterações presentes: não é um pacote seletivo de produção e não deve ser implantado. Não há build de produção exclusivo deste pacote aprovado nesta etapa.

Plano após autorização: sincronizar `origin/main` sem descartar alterações locais, adicionar somente os sete caminhos explícitos, conferir `git diff --cached --name-status`, `--check` e o diff integral; criar commit específico e fazer push normal para `origin/main`. Acompanhar todos os checks de `.github/workflows/ci.yml` (typecheck, lint geral, testes, build e smoke). O lint geral local permanece não aprovado, pois foi interrompido; não substituí-lo pelo lint focado na decisão do CI.

Somente após CI integralmente aprovado, gerar o build de produção em checkout limpo do commit seletivo, com dependências próprias, seguindo `docs/DEPLOYMENT.md`. Usar as variáveis oficiais de build, `production:config`, `production:check`, `production:dry-run` e, após revisão das guardas, `wrangler deploy --config .wrangler/production.generated.json --keep-vars`. Nunca implantar o build de preview atual nem a configuração automática Nitro. Não alterar HTTPS, DNS, bindings ou banco.

Verificação pós-deploy prevista: categoria vazia com canonical próprio e `noindex, follow`, fora do sitemap; categoria preenchida e artigos preservados; `/privacidade` atualizado; tags de um artigo e busca ainda `noindex`; sitemap, RSS e robots íntegros. O HTTP 301 já informado será somente observado, sem alteração de configuração.
