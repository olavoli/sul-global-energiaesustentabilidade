# Adsterra — lateral de artigos, integração local

Unidade única `160x600_1`, código fornecido pelo responsável: key pública `b5a35db3ccd7e9e06392b002636eb4d5`, formato iframe, dimensões 160 × 600, script `https://bicea.org/22/b5a35db3ccd7e9e06392b002636eb4d5`. Não foram incluídos outros formatos publicitários.

Revisão final em 19/10/2026: o responsável confirmou a unidade **ID 31823416 ativa** e o domínio **sulglobalenergia.com.br aprovado**. A correspondência entre esse ID e o snippet é a informação fornecida pelo responsável; não houve acesso independente ao painel. Key, URL, formato, dimensões e params da implementação foram comparados com o código recebido e são idênticos. O ID numérico não substitui a key pública no snippet.

## Arquivos da integração

- `src/components/article/ArticleAdRail.tsx`: componente responsivo.
- `src/components/article/ArticleAdRail.test.tsx`: testes automatizados.
- `src/lib/advertising/adsterra.ts`: configuração, elegibilidade e documento isolado.
- `src/routes/artigo.$slug.tsx`: uma instância no layout compartilhado.
- `src/server.ts`: entrega do recurso interno do iframe.
- `src/lib/security-headers.ts`: CSP específica e proteção de enquadramento.
- `docs/ADSTERRA_ARTICLE_RAIL.md`: este registro.

## Funcionamento

- `ArticleAdRail` é usado uma vez no corpo do layout compartilhado de artigos. Mantém `max-w-[72ch]`; a lateral é posicionada a 32 px do texto, com identificação Publicidade.
- SSR e primeira renderização de hidratação não contêm iframe/script publicitário. Um effect mede a lateral e observa resize/media query. Exige largura CSS mínima de 1440 px e margem direita mínima de 24 px além dos 160 px. Telas estreitas não solicitam sequer o documento do banner.
- O iframe é removido quando falta espaço. Reabrir a janela larga ou navegar para outro artigo pode recarregar a unidade; permanece somente uma instância ativa. Não há auto-refresh por timer.
- O código recebido é servido por um recurso interno `/_ads/adsterra-160x600.html`, não por nova página editorial. GET/HEAD, no-store e noindex/nofollow; não participa de rotas de conteúdo, sitemap, RSS ou busca.
- O documento contém exatamente a configuração e o script recebidos. O isolamento permite document.write do fornecedor sem interferir no DOM React ou em `atOptions` do portal. Sandbox não concede same-origin, navegação superior, formulários ou downloads. Popups são permitidos para navegação de anúncios, sem integrar código de Popunder.
- CSP das páginas de artigos acrescenta somente self à lista de frames. Script externo é permitido exclusivamente no documento do banner, para bicea.org; frames HTTPS dos criativos dinâmicos ficam restritos a esse documento, com sandbox também no header. Homepage e demais políticas de páginas preservadas. Não se abriu script-src ou connect-src publicitário na página editorial.

## Validação local

890 testes passaram, zero falhas. Typecheck e build de preview passaram. Lint focado sem erros ou avisos após separar helpers do componente. Após os pequenos ajustes de organização/sandbox, testes focados e build final foram executados novamente. `git diff --check` aprovado.

Edge headless com SSR/hidratação, CSS do build e interceptação integral da rede publicitária:

| Largura CSS | Iframes da unidade | Requisições ao fornecedor na carga inicial |
| ----------- | ------------------ | ------------------------------------------ |
| 390         | 0                  | 0                                          |
| 1024        | 0                  | 0                                          |
| 1366        | 0                  | 0                                          |
| 1440        | 1                  | 1 simulada                                 |
| 1920        | 1                  | 1 simulada                                 |

Sem erros de hidratação/console, rolagem horizontal do documento ou sobreposição com o texto. Redimensionamento largo → estreito remove o iframe; voltar a largo cria uma única instância. Fixtures, resultados e capturas ficam localmente em `.wrangler/adsterra-qa/`, fora do pacote do produto. A prévia de navegador usa os componentes reais num documento de teste, não comprova visualmente cada artigo individual.

Limitação externa: a consulta HTTP de leitura ao script recebido retornou 200 e corpo vazio. A confirmação de conta/unidade ativa não demonstra entrega de um criativo nesse ambiente. O teste visual utilizou criativo simulado, sem impressões reais. Permanece pendente verificar a resposta e o criativo reais no domínio aprovado, inclusive eventuais bloqueios CSP/sandbox. Não foram inventados domínios adicionais nem liberados scripts arbitrários para contornar essa ausência. Caso a Adsterra exija armazenamento same-origin ou outras origens de script, não relaxar silenciosamente o sandbox/CSP.

## Plano de publicação controlada

Publicação autorizada expressamente em 19/10/2026, condicionada a commit seletivo, CI aprovado, guardas oficiais e verificações pós-deploy. A confirmação da unidade ativa não substitui a evidência de entrega de criativo.

1. Conferir branch/remoto e diff seletivo dos sete arquivos listados, excluindo alterações anteriores, `.wrangler/`, credenciais e `artifacts/`. Não modificar conteúdo editorial, SEO ou distribuição.
2. Reutilizar as evidências locais já obtidas; repetir gates somente se houver alteração ou motivo concreto. Testes focados e `git diff --check` reconferidos na revisão final; sem nova suíte completa desnecessária.
3. Depois da autorização, fazer commit seletivo e push para a branch oficial, acompanhando todos os checks do CI. Nenhum deploy com CI falho.
4. Construir o pacote isolado para produção, usando dependências próprias e o procedimento de `docs/DEPLOYMENT.md`, com production:check/dry-run e --keep-vars. Não incorporar mudanças locais de admin/newsletter nem reutilizar o build de preview para produção.
5. Conferir em produção artigo largo com uma única unidade e label, snippet/iframe e console/CSP; conferir celular e notebook estreito com zero requisições publicitárias. Verificar a entrega real sem cliques de teste ou geração artificial de impressões. Se houver bloqueio do fornecedor, diagnosticar antes de ampliar permissões.
6. Conferir home e artigo, canonical, sitemap/RSS e funções existentes por smoke somente leitura. Interromper diante de regressão; qualquer rollback deve seguir o procedimento documentado, sem reescrever histórico.

Riscos residuais: resposta vazia/no-fill ou bloqueadores podem deixar o espaço reservado vazio; criativos e disponibilidade dependem do fornecedor. O sandbox pode restringir comportamentos que a rede espere, e frames HTTPS de criativos são permitidos somente no documento isolado. Redimensionar de estreito para largo pode iniciar nova carga, sem múltiplas instâncias simultâneas. Esses riscos não autorizam outras unidades, relaxamento automático da CSP ou alegação de entrega real já comprovada.

Na fase de integração e revisão local não houve commit, push ou deploy. A publicação controlada segue o plano acima. Não foram alterados artigos, metadados, URLs públicas, sitemap, integração Kit ou configuração Cloudflare. Alterações anteriores e `artifacts/` permanecem fora do pacote.
