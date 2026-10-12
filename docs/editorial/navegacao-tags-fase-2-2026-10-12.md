# Navegação por tags — fase 2 (local)

## Interface e rotas

As etiquetas no final dos artigos passam de texto estático para links, com quebra de linha, foco visível e área de toque ampliada. A rota dinâmica `/tag/$slug` reutiliza Container, EditorialBreadcrumb e ArticleCard, com título do tema, quantidade de publicações e cards em uma, duas ou três colunas conforme a largura. Não há nova entrada no menu nem diretório adicional de temas.

A listagem usa associação exata à etiqueta, não resultados aproximados da busca. Ordem: publicação mais recente, com desempate por slug. Categorias, busca textual e algoritmo de relacionados permanecem intactos.

## Cobertura e SEO

- 31 artigos reais publicados; 92 etiquetas e páginas temáticas disponíveis.
- 23 temas têm dois ou mais artigos: elegíveis à indexação em produção oficial e acrescentados ao sitemap.
- 69 temas têm apenas um artigo: página acessível com `noindex, follow`, canonical próprio e ausência no sitemap.
- Tags inexistentes, apenas em demos ou rascunhos, não geram páginas públicas: HTTP 404 com noindex.
- Preview/desenvolvimento mantêm `noindex, nofollow`, inclusive para temas com vários artigos.
- URLs e entradas de sitemap existentes dos artigos, categorias e autores são preservadas. RSS não recebe temas e não é modificado.
- A segunda publicação real associada ao tema o promove automaticamente ao critério de indexação, sem cadastro adicional. Demos, agendados, drafts, approved e datas futuras não contam.

O mínimo de dois artigos é um critério editorial desta implementação, não uma garantia de indexação ou posicionamento. Páginas pequenas podem continuar tendo pouco valor orgânico. `noindex` é emitido no HTML inicial; não se bloqueiam as páginas individuais no robots.txt, para permitir a leitura da diretiva pelo crawler. Base: [Google Search Central — noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing).

## Inventário por tag

| Tag | Artigos publicados | Rota local | Tratamento em produção |
|---|---:|---|---|
| água e energia | 1 | /tag/agua-e-energia | noindex, follow; fora do sitemap |
| amônia | 1 | /tag/amonia | noindex, follow; fora do sitemap |
| armazenamento de energia | 6 | /tag/armazenamento-de-energia | index, follow; sitemap |
| armazenamento de longa duração (ldes) | 2 | /tag/armazenamento-de-longa-duracao-ldes | index, follow; sitemap |
| armazenamento térmico | 1 | /tag/armazenamento-termico | noindex, follow; fora do sitemap |
| arquitetura bioclimática | 1 | /tag/arquitetura-bioclimatica | noindex, follow; fora do sitemap |
| atenção primária à saúde | 1 | /tag/atencao-primaria-a-saude | noindex, follow; fora do sitemap |
| baterias | 3 | /tag/baterias | index, follow; sitemap |
| baterias de sódio | 1 | /tag/baterias-de-sodio | noindex, follow; fora do sitemap |
| biomassa | 1 | /tag/biomassa | noindex, follow; fora do sitemap |
| bombeamento de água | 1 | /tag/bombeamento-de-agua | noindex, follow; fora do sitemap |
| brasil | 5 | /tag/brasil | index, follow; sitemap |
| brics | 2 | /tag/brics | index, follow; sitemap |
| calor residual | 1 | /tag/calor-residual | noindex, follow; fora do sitemap |
| carneiro hidráulico | 1 | /tag/carneiro-hidraulico | noindex, follow; fora do sitemap |
| carvão | 2 | /tag/carvao | index, follow; sitemap |
| células tandem | 1 | /tag/celulas-tandem | noindex, follow; fora do sitemap |
| centros de dados | 1 | /tag/centros-de-dados | noindex, follow; fora do sitemap |
| chaminé solar | 1 | /tag/chamine-solar | noindex, follow; fora do sitemap |
| china | 1 | /tag/china | noindex, follow; fora do sitemap |
| ciclo rankine orgânico | 1 | /tag/ciclo-rankine-organico | noindex, follow; fora do sitemap |
| cobre | 1 | /tag/cobre | noindex, follow; fora do sitemap |
| cogeração | 1 | /tag/cogeracao | noindex, follow; fora do sitemap |
| conexão à rede | 1 | /tag/conexao-a-rede | noindex, follow; fora do sitemap |
| conservação de energia | 2 | /tag/conservacao-de-energia | index, follow; sitemap |
| conversão de energia | 1 | /tag/conversao-de-energia | noindex, follow; fora do sitemap |
| covid-19 | 1 | /tag/covid-19 | noindex, follow; fora do sitemap |
| custos do sistema elétrico | 1 | /tag/custos-do-sistema-eletrico | noindex, follow; fora do sitemap |
| descarbonização | 1 | /tag/descarbonizacao | noindex, follow; fora do sitemap |
| distribuição | 1 | /tag/distribuicao | noindex, follow; fora do sitemap |
| dlr | 1 | /tag/dlr | noindex, follow; fora do sitemap |
| economia circular | 1 | /tag/economia-circular | noindex, follow; fora do sitemap |
| eficiência energética | 8 | /tag/eficiencia-energetica | index, follow; sitemap |
| egs | 1 | /tag/egs | noindex, follow; fora do sitemap |
| eletrificação | 2 | /tag/eletrificacao | index, follow; sitemap |
| eletrólise | 1 | /tag/eletrolise | noindex, follow; fora do sitemap |
| emprego | 2 | /tag/emprego | index, follow; sitemap |
| energia | 2 | /tag/energia | index, follow; sitemap |
| energia eólica | 4 | /tag/energia-eolica | index, follow; sitemap |
| energia firme | 1 | /tag/energia-firme | noindex, follow; fora do sitemap |
| energia nuclear | 1 | /tag/energia-nuclear | noindex, follow; fora do sitemap |
| energia solar | 9 | /tag/energia-solar | index, follow; sitemap |
| facts | 1 | /tag/facts | noindex, follow; fora do sitemap |
| ferro-ar | 1 | /tag/ferro-ar | noindex, follow; fora do sitemap |
| financiamento da saúde | 1 | /tag/financiamento-da-saude | noindex, follow; fora do sitemap |
| financiamento da transição | 1 | /tag/financiamento-da-transicao | noindex, follow; fora do sitemap |
| flexibilidade do sistema elétrico | 2 | /tag/flexibilidade-do-sistema-eletrico | index, follow; sitemap |
| fotovoltaica | 1 | /tag/fotovoltaica | noindex, follow; fora do sitemap |
| fusão nuclear | 1 | /tag/fusao-nuclear | noindex, follow; fora do sitemap |
| geotermia | 1 | /tag/geotermia | noindex, follow; fora do sitemap |
| geração distribuída | 1 | /tag/geracao-distribuida | noindex, follow; fora do sitemap |
| gets | 2 | /tag/gets | index, follow; sitemap |
| golpe de aríete | 1 | /tag/golpe-de-ariete | noindex, follow; fora do sitemap |
| hidrogênio | 1 | /tag/hidrogenio | noindex, follow; fora do sitemap |
| hidrogênio verde | 1 | /tag/hidrogenio-verde | noindex, follow; fora do sitemap |
| htls | 1 | /tag/htls | noindex, follow; fora do sitemap |
| inteligência artificial | 1 | /tag/inteligencia-artificial | noindex, follow; fora do sitemap |
| iter | 1 | /tag/iter | noindex, follow; fora do sitemap |
| logística reversa | 1 | /tag/logistica-reversa | noindex, follow; fora do sitemap |
| mineração | 2 | /tag/mineracao | index, follow; sitemap |
| minerais críticos | 2 | /tag/minerais-criticos | index, follow; sitemap |
| mmgd | 1 | /tag/mmgd | noindex, follow; fora do sitemap |
| módulos fotovoltaicos | 1 | /tag/modulos-fotovoltaicos | noindex, follow; fora do sitemap |
| mudanças climáticas | 1 | /tag/mudancas-climaticas | noindex, follow; fora do sitemap |
| nif | 1 | /tag/nif | noindex, follow; fora do sitemap |
| participação social | 1 | /tag/participacao-social | noindex, follow; fora do sitemap |
| perfuração | 1 | /tag/perfuracao | noindex, follow; fora do sitemap |
| perovskita | 1 | /tag/perovskita | noindex, follow; fora do sitemap |
| potência | 2 | /tag/potencia | index, follow; sitemap |
| processamento mineral | 1 | /tag/processamento-mineral | noindex, follow; fora do sitemap |
| progeo | 1 | /tag/progeo | noindex, follow; fora do sitemap |
| reciclagem | 3 | /tag/reciclagem | index, follow; sitemap |
| redes elétricas | 6 | /tag/redes-eletricas | index, follow; sitemap |
| refrigeração | 1 | /tag/refrigeracao | noindex, follow; fora do sitemap |
| refrigeração por absorção | 1 | /tag/refrigeracao-por-absorcao | noindex, follow; fora do sitemap |
| requalificação profissional | 1 | /tag/requalificacao-profissional | noindex, follow; fora do sitemap |
| resfriamento passivo | 1 | /tag/resfriamento-passivo | noindex, follow; fora do sitemap |
| restrição de geração (curtailment) | 1 | /tag/restricao-de-geracao-curtailment | noindex, follow; fora do sitemap |
| santa catarina | 2 | /tag/santa-catarina | index, follow; sitemap |
| saúde pública | 1 | /tag/saude-publica | noindex, follow; fora do sitemap |
| segurança energética | 1 | /tag/seguranca-energetica | noindex, follow; fora do sitemap |
| segurança mineral | 1 | /tag/seguranca-mineral | noindex, follow; fora do sitemap |
| siderurgia | 1 | /tag/siderurgia | noindex, follow; fora do sitemap |
| silício | 1 | /tag/silicio | noindex, follow; fora do sitemap |
| sus | 1 | /tag/sus | noindex, follow; fora do sitemap |
| tarifas de energia | 1 | /tag/tarifas-de-energia | noindex, follow; fora do sitemap |
| termodinâmica | 1 | /tag/termodinamica | noindex, follow; fora do sitemap |
| termoeletricidade | 1 | /tag/termoeletricidade | noindex, follow; fora do sitemap |
| transição justa | 2 | /tag/transicao-justa | index, follow; sitemap |
| transmissão | 3 | /tag/transmissao | index, follow; sitemap |
| trítio | 1 | /tag/tritio | noindex, follow; fora do sitemap |
| usinas reversíveis | 1 | /tag/usinas-reversiveis | noindex, follow; fora do sitemap |

## Funcionamento futuro e limites

O catálogo é derivado dos metadados publicados a cada requisição/build. Não há whitelist fixa das 92 etiquetas. Duplicações de um mesmo artigo não aumentam a cobertura. Slugs removem acentos e pontuação, sem alterar o nome editorial da etiqueta. Colisões entre etiquetas diferentes são detectadas explicitamente; o teste percorre o acervo real e impede publicar uma colisão silenciosa. Renomear uma etiqueta depois de publicar esta navegação muda sua URL temática; eventuais renomeações deverão considerar redirecionamentos, que não fazem parte desta fase. Nenhuma URL de artigo muda.

## Arquivos desta fase

- `src/content/tags.ts`: catálogo exato, contagem, slugs e elegibilidade.
- `src/content/tags.test.ts`: filtros, contagem, publicação futura, colisões, preservação e sitemap.
- `src/components/article/ArticleTags.tsx`: links das etiquetas com estilos existentes.
- `src/routes/artigo.$slug.tsx`: substituição apenas do bloco de etiquetas.
- `src/routes/tag.$slug.tsx`: página temática e 404.
- `src/lib/tag-seo.ts` e teste: canonical, social e robots das novas páginas.
- `src/lib/distribution.ts`: acréscimo das páginas elegíveis, mantendo entradas existentes e RSS.
- `scripts/smoke-worker.ts`: verificação SSR das páginas, links e guardrails de preview.
- `src/routeTree.gen.ts`: árvore de rotas regenerada pelo Vite, sem edição manual.
- Este documento: decisões e inventário. Total desta fase: 11 arquivos.

Nenhum MDX, título, corpo, categoria, slug, imagem ou referência foi alterado. Não há operações no Kit, commit, push ou deploy. Alterações locais anteriores e artifacts/ devem permanecer preservados.

## Validações concluídas

- 11 testes novos de catálogo e SEO passaram; os testes de preservação dos 31 artigos, busca/distribuição e algoritmo de relacionados também passaram.
- Suíte do workspace: 864 testes aprovados, zero falhas na execução final. A primeira execução apresentou falhas transitórias em testes de D1/workerd; a repetição sem mudanças passou.
- Pacote isolado, excluindo alterações locais anteriores de newsletter: 834 testes em 91 arquivos, zero falhas na execução final. Houve uma interrupção anterior do Bun/workerd no Windows (`ERROR_ABANDONED_WAIT_0`), não reproduzida ao repetir sem o Vite em paralelo. Nenhum teste foi removido ou ignorado.
- Build, typecheck, lint pertinente e lint geral do código-fonte isolado passaram. No lint isolado foram excluídos somente os caches em `.wrangler/**`, ignorados pelo Git; nenhuma configuração de lint foi alterada.
- Validação de conteúdo: 0 erros e os mesmos 27 avisos preexistentes.
- Smoke do Worker: 24 endpoints públicos e fluxo administrativo local aprovados; páginas de temas e links estão no HTML inicial.
- Build com parâmetros de produção, executado apenas localmente: tema com cobertura HTTP 200 e `index, follow`; tema único HTTP 200 e `noindex, follow`; tema inexistente HTTP 404 e noindex. Canonicals próprios corretos; sitemap com 23 temas e as 31 URLs de artigos. Zero requisições à produção nessa verificação.
- Conferência visual no Vite a 1440 px e 390 px: página temática sem rolagem horizontal, grid responsivo, tags legíveis, altura de toque de 36 px e foco visível. Clique na tag LDES abriu a página com os dois artigos associados.
- `git diff --check` aprovado; conteúdo dos artigos e algoritmo de relacionados sem diff.

## Riscos não bloqueantes

Os temas `carvão`, `emprego`, `santa catarina` e `transição justa` compartilham atualmente os mesmos dois artigos; `mineração` e `minerais críticos` também compartilham uma seleção idêntica. São conceitos editoriais distintos, preservados como navegação própria, mas a sobreposição pode limitar o valor orgânico dessas páginas. O limiar de dois artigos permite indexação, sem prometer seleção pelo Google. Não foram fundidas etiquetas nem reescritos artigos para produzir conteúdo artificialmente diferente.

Publicação ainda não realizada. O catálogo e a regra de indexação estão preparados para aprovação da implementação local.

## Liberação para publicação — 12/10/2026

O responsável editorial aprovou expressamente a implementação desta fase e autorizou commit seletivo dos 11 arquivos, push para main e deploy condicionado ao sucesso do CI oficial. A sobreposição entre páginas temáticas foi aceita como risco conhecido, sem ampliar o escopo.

Conferência final do pacote isolado: 834 testes em 91 arquivos, typecheck, lint do código-fonte (somente cache ignorado `.wrangler/**` excluído), validação de conteúdo, build e smoke de preview aprovados. A validação de conteúdo mantém 0 erros e os mesmos 27 avisos anteriores. Conferência adicional confirmou 92 temas, com 23 elegíveis à indexação e 69 noindex, preservação das 48 URLs existentes do sitemap e RSS idêntico à versão anterior. A atualização automática de cobertura continua verificada pelos testes de publicação de um segundo artigo.

O deploy seguirá `docs/DEPLOYMENT.md`, com build oficial, `production:config`, `production:check`, `production:dry-run` e `--keep-vars`. Alterações locais de newsletter e outros trabalhos permanecem fora do pacote. Resultados de CI e pós-deploy serão informados no relatório da publicação.
