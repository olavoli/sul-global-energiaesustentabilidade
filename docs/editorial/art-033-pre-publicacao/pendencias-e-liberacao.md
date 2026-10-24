# ART-033 — integração local e pendências

## Diagnóstico vigente do gate — 24/10/2026

Reproduções solicitadas concluídas sem alterar timeout/concorrência: isolado 1 passa/1 falha (3,35 s, workerd ConnectEx #1225 e HTTP 500); relacionados 75/0 (9,50 s); suíte oficial 907/1 (17,81 s), agora **EBADF no kill do processo em Miniflare.dispose()**, e não timeout. Não há comprovação de defeito na lógica Kit; causa interna do descritor inválido ainda indeterminada. Dossiê com comandos, durações e stack: `diagnostico-workerd-2026-10-24.md`. Gate reprovado, artigo permanece approved, sem published, staging, commit, push ou deploy; nenhum arquivo Kit/newsletter alterado nesta rodada.

## Estado vigente — regularização e bloqueio técnico, 24/10/2026

Procedência da marca consolidada: criação assistida ChatGPT pelo responsável editorial, aplicação manual posterior, sem designer externo indicado; não é prova de registro/exclusividade. Condições de uso das imagens documentadas com termos e orientação oficial Pippit/Seedream 4.0; metadados de licença atualizados, sem licença CC. Briefing retrospectivo criado e fluxo oficial persistiu **review → approved**, após draft/review-ready, preservando fact-checks pendentes e decisão de riscos existentes.

**Publish-check oficial, typecheck e lint aprovados. Publicação interrompida:** suíte completa final com **907 aprovados e 1 falha**, timeout de 30 s no teste Kit/workerd. Nenhuma alteração no Kit ou bypass. Sem published, staging, commit, push ou deploy. Dossiê completo: `regularizacao-e-validacao-publicacao-2026-10-24.md`. Este estado substitui os bloqueios documentais históricos abaixo; não solicitar novamente origem, modelo ou insumos já declarados.

## Complemento vigente de procedência — marca e Seedream 4.0, 24/10/2026

O responsável identificou **Pippit / Seedream 4.0** na geração da imagem 3 e na edição da Hero (redução dos pássaros). A lacuna de identificação do modelo está resolvida. Confirmou também que inseriu manualmente a logomarca Sul Global nas imagens em que aparece, posteriormente à geração; a marca não foi gerada pela IA. Registro detalhado: `procedencia-logomarca-2026-10-24.md` e `imagens.json`.

Não localizado documento específico de titularidade/autorização da marca no repositório consultado; não se conclui inexistência de direitos ou infração. Licenças não alteradas. Nota e arquivos finais preservados: a política não exige acrescentar a operação manual à nota pública. Continua necessária a conclusão da análise dos termos oficiais aplicáveis ao Seedream 4.0 via Pippit, agora sem repetir a solicitação do nome do modelo. Publicação segue condicionada aos requisitos obrigatórios; nenhuma transição, staging, commit, push ou deploy nesta rodada.

## Regularização documental — declaração ampliada, 24/10/2026

O responsável confirmou prompts preparados com auxílio do ChatGPT e **ausência de arquivos externos de terceiros em todas as imagens**. Hero: ChatGPT e redução dos pássaros no Pippit; imagens 1/2: ChatGPT; imagem 3: Pippit por prompt. Essas pendências descritivas estão resolvidas e registradas em `imagens.json`.

Base contratual OpenAI documentada para imagens 1/2. Resta identificar o recurso/modelo Pippit usado na Hero e imagem 3 para conferir os termos específicos; arquivos sem metadados suficientes para essa identificação. Processo interrompido nessa condição, conforme autorização condicional, sem substituir comprovação por aceitação automática de risco. Detalhes, versões e encaminhamento mínimo em `condicoes-imagens-regularizacao-2026-10-24.md`. Não foram executadas transições, briefing ou publicação nesta tentativa. Nenhum MDX, imagem, nota ou licença foi alterado.

## Edição específica da Hero confirmada — 24/10/2026

O responsável confirmou: Hero gerada originalmente no ChatGPT (OpenAI); **a mesma imagem foi enviada ao Pippit para reduzir o tamanho dos pássaros presentes na composição**. Registrado em `imagens.json`, sem atribuir outras intervenções. Isso resolve a lacuna sobre o insumo imediato e a finalidade da etapa Pippit da Hero, atendendo ao registro descritivo de procedência com base na declaração editorial. Não equivale a verificação independente do projeto de edição, confirmação de todos os insumos da geração inicial ou comprovação de direitos/licença. A pendência genérica “tipo de intervenção não informado” da Hero está resolvida; os registros anteriores permanecem históricos.

Nota de Transparência, artigo e imagens **não alterados** nesta rodada. Licença mantida `pending`, sem nova conclusão jurídica. Ainda cabe identificar as condições aplicáveis ao recurso Pippit usado nessa edição; para imagem 3, o processo específico continua não esclarecido. Não se pressupõe uso de template ou ativo de terceiros, nem sua ausência.

`content:publish-check` executado novamente: **exit 1**, três bloqueios: (1) imagem sem licença verificável; (2) estado diferente de approved/scheduled elegível; (3) ambiente oficial e URL pública não configurados nesta execução local. Autoria, schema, taxonomia e três fontes estruturadas aprovados. Para o fluxo de transição, permanece ausente o briefing oficial identificado no relatório de bloqueio. Estado mantido `draft / writing`. Os bloqueios de estado/ambiente não são demonstração de defeito técnico: são etapas ainda não executadas.

MDX preservado byte a byte nesta rodada: SHA-256 `9e94bcc92fcb554101adaf5a5bfcc80c11085daff41245a279f6dcbe7bfdc501`. Sem staging, commit, push ou deploy.

## Procedência da Hero atualizada — 24/10/2026

Confirmação expressa do responsável: **Hero produzida inicialmente no ChatGPT (OpenAI) e posteriormente trabalhada no Pippit**. Imagens 1 e 2 permanecem ChatGPT; imagem 3 permanece Pippit. Atualizados `cover.aiProvenance`, inventário `imagens.json` e a atribuição da Hero na Nota de Transparência; todo o restante da nota foi preservado. O papel `editing` é a classificação genérica disponível no schema para a etapa posterior, sem especificar o procedimento realizado no Pippit.

Não houve edição ou substituição dos arquivos de imagem, nem declaração de direitos/licença. Condições de uso continuam pendentes e passam a incluir também a etapa Pippit da Hero. O script de integração original continua arquivado/protegido contra execução; suas atribuições antigas não prevalecem sobre este registro e os metadados atuais.

Validação desta atualização: 5 testes focados aprovados (115 assertions), geração/validação de conteúdo sem erros, `git diff --check` aprovado. Estado `draft / writing` preservado; sem staging, commit, push ou deploy.

## Autorização de publicação e bloqueio obrigatório — 24/10/2026

Publicação expressamente autorizada pelo responsável, condicionada às verificações. Interrompida antes de transições/staging: licença ainda `pending`, condições aplicáveis aos quatro arquivos não integralmente documentadas e briefing oficial ausente. Termos OpenAI/Pippit conferidos sem atribuir direitos não comprovados. Detalhes e encaminhamento mínimo em `publicacao-bloqueada-2026-10-24.md`. Autorização editorial registrada, sem inventar confirmação científica. MDX e imagens não alterados; sem commit, push ou deploy.

## Revisão final aplicada — 24/10/2026

Consolidado vigente: `revisao-final-2026-10-24.md`; antes/depois: `revisao-aplicada-2026-10-24.json`. Corrigidos somente volumes 9–11, contexto dos percentuais chineses, baterias/Ni-MH, aditivos Dy/Tb, link DOE definitivo e sequência de chamadas/lista. Duan foi conferido integralmente e citado na limitação da reciclagem, p. 80, seção 5. Numeração antiga → nova: 5→6, 6→5, 13→12, 12→13. Mantidas 14 referências.

**25 testes focados, typecheck, build preview, content:validate e diff check aprovados.** Lint geral aprovado com exclusão somente de `.wrangler/**` e `artifacts/**`; primeira execução sem exclusões interrompida, não aprovada. Prévia atualizada em http://127.0.0.1:8088/, conferida em desktop/celular. `publish-check` mantém três bloqueios: licença, estado draft e ambiente oficial.

Mantidos 21 Mt por decisão editorial, com comprovação documental pendente internamente; quatro imagens intactas e Nota de Transparência integral. Permanecem sem aplicação C02/C03 (causa da divergência ANM/USGS), C09 (generalização visual no infográfico) e propostas bibliográficas adicionais não autorizadas. Não se declarou revisão científica integral concluída. Esta seção atualiza o encaminhamento das seções históricas abaixo, sem apagar as evidências. Sem staging, commit, push ou deploy.

## Decisão editorial sobre reservas brasileiras — 24/10/2026

O responsável editorial determinou expressamente manter **21 milhões de toneladas (21 Mt)** no texto e no infográfico, preservando redação e composição visual. Não acrescentar ao artigo valores alternativos, comparações ou explicações de divergências. A proposta C01 da matriz **não está autorizada para aplicação**.

A verificação documental permanece **interna e não concluída para sustentar os 21 Mt na fonte indicada**. A decisão editorial não equivale a confirmação científica do número e não apaga a evidência USGS já registrada. A divergência fica documentada somente nos registros de revisão; não foi inserida no conteúdo do artigo. Nenhuma declaração automática de validação científica foi acrescentada.

MDX e quatro imagens inalterados nesta rodada; artigo mantido como `draft / writing`. Sem staging, commit, push ou deploy. Esta decisão substitui o encaminhamento anterior de aplicar C01, sem alterar os achados históricos nem decidir as demais propostas da matriz.

## Auditoria científica — 24/10/2026, posterior à aprovação da nota

Matriz entregue em `matriz-auditoria-cientifica-2026-10-24.md`; evidência versionada da tabela USGS em `evidencia-usgs-2026-10-24.json`. **Nenhuma proposta foi aplicada.**

Achado novo prioritário: a cópia oficial USGS consultada traz **11 Mt**, não 21 Mt, para as reservas brasileiras. Isso afeta pontos-chave, seção brasileira, conclusão, infográfico e alt. O registro inicial que mantinha 21 Mt não deve ser interpretado como validação desse número. A segunda posição permanece na tabela atual. A data exata da revisão e uma cópia oficial anterior com 21 Mt não foram recuperadas.

Confirmados os três percentuais chineses, exigindo explicitação do universo Nd/Pr/Dy/Tb e de ímãs sinterizados; confirmados separadamente 326 t ANM e 2.000 t REO USGS para 2025, sem comprovação da explicação causal da divergência. Bibliografia: volumes 500/216/908 em [9–11], [13] sem chamada, ordem [6] antes de [5], link DOE [4] preliminar e metadados [2,7,8] a precisar. Propostas técnicas para baterias/Ni-MH/NdFeB e rastreabilidade detalhadas na matriz. Configurações dos 17 elementos confirmadas; seis das sete reservas do infográfico conferem. Autoria e nota aprovadas permanecem resolvidas; condições de uso das imagens não foram presumidas.

Artigo mantido em draft. Aguardando decisão editorial sobre as correções propostas, sem staging, commit, push ou deploy.

## Atualização vigente — 24/10/2026

**Resolvido por decisão editorial expressa:** autoria vinculada ao cadastro existente `olavo-oliveira` (Olavo Oliveira), sem novo registro; Nota de Transparência aprovada inserida integralmente em `aiDisclosure`, modo `detailed`, no componente existente `AiEditorialCredit`, após as referências. O endereço Pippit é armazenado como texto legível `www.pippit.ai`, conforme o mecanismo existente (não interpreta Markdown), sem alterar as palavras da nota. A nota substitui a atribuição provisória anterior e aparece uma única vez. Os registros abaixo de 23/10 são históricos; autoria e aprovação da redação da nota não permanecem pendentes.

**Ainda pendente:** revisão científica das afirmações listadas abaixo; reconciliação bibliográfica, incluindo volumes [9], [10], [11], chamada [13] e ordem de citações; confirmação documental das condições de uso das quatro imagens. A aprovação da nota e da autoria não confirma a conclusão dessas verificações nem concede licença às imagens. Mantida a diferença registrada em relação à declaração permanente de revisão factual integral da política; não foi declarada conformidade inexistente nem alterada a política global.

Texto autoral, 14 referências e quatro imagens preservados. `status: draft`, `draftStage: writing`. O script local de preparação foi sincronizado com as decisões para não restaurar metadados antigos.

Validação desta rodada: **5 testes focados, zero falhas, 111 assertions**; geração e validação de conteúdo aprovadas, 28 avisos gerais e zero erros (o aviso de autoria pendente foi eliminado; permanece o de licença). `git diff --check` aprovado. Sem repetição de build ou auditoria científica para uma alteração de metadados. Prévia isolada atual: **http://127.0.0.1:8088/**; utiliza MDX, estilos e componente real da nota, sem liberar rota pública. Conferência de autoria/nota em larguras desktop e celular; em 390 px a largura de rolagem é 375 px, sem overflow horizontal. Sem staging, commit, push ou deploy. A prévia anterior 8087 é uma instância antiga; utilizar 8088.

Registro de 23/10/2026. Estado: **draft / writing**. Integração concluída; **não liberado para publicação**. Nenhum staging, commit, push, deploy ou ação no Kit.

## Preservação e arquivos

- MDX: `content/articles/terras-raras-os-17-elementos-que-movem-a-tecnologia-parte-1.mdx`.
- Extração integral: `word-original-extraido.json`; script reproduzível: `preparar_local.py`.
- Imagens e hashes: `imagens.json`; cópias byte a byte e derivados em `public/images/articles/terras-raras-os-17-elementos-que-movem-a-tecnologia-parte-1/`.
- Verificação documental inicial: `verificacao-referencias.json`.
- Teste novo: `src/content/art-033.test.tsx`.
- Índices regenerados: `src/content/generated/articles.ts` e `src/content/generated/loaders.ts`. O diff acrescenta somente o novo registro e loader (96 e 2 linhas respectivamente).

Word original preservado, SHA-256 `3dc092a0de9284a5935e36812173e0253353e8c3987db3daa27721e296a3ba2c`. Extração: 115 blocos, 64 parágrafos não vazios; sem tabelas ou alterações controladas. O teste compara cada parágrafo original ao texto renderizado, incluindo os 14 registros bibliográficos. Apenas espaços de diagramação externos foram normalizados; barras e aspas do original foram preservadas. Mantidos cinco pontos-chave, um destaque e dez seções. Não foi aplicada nenhuma correção científica ou bibliográfica.

## Metadados propostos

- Categoria existente: **Transição Energética** (`transicao-energetica`).
- Título autoral integral preservado; slug: `terras-raras-os-17-elementos-que-movem-a-tecnologia-parte-1`.
- Canonical relativo: `/artigo/terras-raras-os-17-elementos-que-movem-a-tecnologia-parte-1`.
- Descrição SEO: “Conheça os 17 elementos das terras raras, suas aplicações e os desafios tecnológicos, industriais e ambientais para o Brasil. Parte 1 da série.”
- Tags: **terras raras**, **minerais críticos**, **mineração**, **reciclagem**, **brasil**. Todas reutilizadas: respectivamente 1, 2, 3, 3 e 6 outros registros no catálogo. Nenhuma tag nova. Política de indexação preservada; o rascunho não aumenta contagens públicas.
- Subtítulo, resumo, descrição SEO, legendas descritivas e textos alternativos são metadados novos, sujeitos à aprovação editorial; não substituem texto do Word.
- Autoria: registro existente `autoria-pendente`, pois a resposta confirmou ferramentas das imagens, não autoria do texto. `sponsored: false` é o valor estrutural inicial, sem declaração humana de ausência de relações comerciais específicas.

## Quatro imagens

Origem declarada pelo responsável: Hero e imagens 1 e 2, **ChatGPT (OpenAI)**; imagem 3, **Pippit (pippit.ai)**. A declaração foi registrada, sem atribuição a fotógrafos ou bancos de imagens. Origem não comprova, isoladamente, condições de licença nem ausência de insumos de terceiros; `license: pending` permanece.

Hero na capa; imagem 1 após definição dos 17 elementos; imagem 2 após reservas brasileiras; imagem 3 na seção ambiental, antes de reciclagem. Sequência coincide com os relacionamentos do Word. Quatro originais preservados e dez derivados WebP, sem ampliação artificial; infográficos em WebP sem perdas e resolução integral disponível. Fotografias ilustrativas convertidas com qualidade 90. Proporções, textos e números das imagens não foram editados. Crédito institucional conforme padrão existente: “Fonte: SGES, (2026).”; ferramentas explicitadas no registro e atribuição provisória.

## Inconsistências documentadas — mudanças não aplicadas

| Local | Evidência / problema | Proposta para aprovação |
| --- | --- | --- |
| Referência [9] | DOI `10.1016/j.jhazmat.2025.140400`: título confirmado; registro Crossref informa volume **500**, enquanto Word informa 485 | Corrigir apenas volume 485 → 500 |
| Referência [10] | DOI `10.1016/j.mineng.2024.108889`: título confirmado; volume **216**, enquanto Word informa 215 | Corrigir apenas volume 215 → 216 |
| Referência [11] | DOI `10.1016/j.scitotenv.2023.168210`: título confirmado; volume **908**, enquanto Word informa 912 | Corrigir apenas volume 912 → 908 |
| Referência [13] | Registro editorial do periódico confirma Duan, 2024, volume 56, pp. 77–81; não há chamada [13] no corpo | Decidir local de citação após conferência do conteúdo, sem inserir chamada arbitrária |
| Ordem das citações | [6] precede primeira chamada [5]; demais chamadas e intervalos originais preservados | Reconciliar a ordem em rodada autorizada, sem renumerar silenciosamente |
| Produção brasileira | Texto apresenta 326 t ANM e 2 mil t USGS e explica a diferença como metodológica | Conferir produto, período e metodologia nas tabelas primárias antes de afirmar causa da divergência; não tratar estimativas distintas como faixa estatística observada |
| Participação chinesa | 60% mineração, 91% refino e 94% ímãs precisam de denominadores compatíveis (quatro elementos magnéticos versus conjunto das terras raras) | Explicitar escopo exato da IEA após localização da tabela; não substituir por percentuais de outro universo |
| Baterias | “Lítio, níquel, cobalto e grafite são essenciais para armazenamento eletroquímico” generaliza tecnologias com químicas distintas | Proposta: “Lítio, níquel, cobalto e grafite têm diferentes funções nas cadeias de baterias, conforme a química utilizada.” |
| Ni-MH | “baterias antigas” pode sugerir tecnologia extinta | Proposta: “algumas baterias Ni-MH”; manter distinção entre baterias e ímãs |
| Infográfico 1 | Configurações e legendas densas em imagem de 941 px; frase sobre Nd/Pr/Dy/Tb pode sugerir necessidade universal dos quatro | Conferir qualificação sobre Dy/Tb como adições dependentes da aplicação; manter original até autorização |
| Infográfico 2 | Reservas em REO, países/territórios selecionados, não produção anual; imagem já explicita essa distinção | Conferir as sete linhas na tabela USGS, sem confundir reservas, recursos e produção |

O teste de links (HEAD) registrou **8 respostas 200 e 6 respostas 403** nos 14 endereços. HTTP 403 é restrição de acesso automatizado, não prova de referência inexistente. A existência de um documento ou DOI não comprova todas as afirmações associadas. Foram cadastradas somente três fontes estruturadas com conferência documental identificada e notas de escopo ([1], [5], [13]); as 14 referências originais continuam integrais no corpo, com `referencesInBody: true` para evitar duplicação.

Evidências específicas: [Crossref, Han](https://api.crossref.org/works/10.1016%2Fj.jhazmat.2025.140400), [Crossref, Diao](https://api.crossref.org/works/10.1016%2Fj.mineng.2024.108889), [Crossref, Vo](https://api.crossref.org/works/10.1016%2Fj.scitotenv.2023.168210), [Duan, periódico](https://ace.ewapub.com/article/view/11867), [IEA — Rare Earth Elements](https://www.iea.org/reports/rare-earth-elements), [USGS 2026](https://pubs.usgs.gov/periodicals/mcs2026/mcs2026-rare-earths.pdf). A conferência inicial não é uma auditoria científica integral.

## Transparência e decisões humanas pendentes

O Word não contém Nota de Transparência. Para impedir que o componente use sua declaração automática de conferência humana, o rascunho recebeu apenas a atribuição provisória: **“Hero e imagens 1 e 2: ChatGPT (OpenAI). Imagem 3: Pippit (pippit.ai).”**

Essa redação não é apresentada como nota final aprovada. O modelo permanente em `docs/AI_EDITORIAL_POLICY.md` afirma que todo o conteúdo factual foi verificado por Olavo Oliveira; essa verificação não foi confirmada para ART-033 e não foi declarada. Antes de publicação: confirmar autoria, aprovar nota fiel ao processo efetivo, esclarecer condições de uso das imagens e decidir as correções acima. Nenhuma política global foi alterada ou exceção presumida.

## Validação e apresentação

- 24 testes focados aprovados, zero falhas (ART-033, tags e SEO); preservação textual, hashes das imagens e exclusão pública incluídas.
- Typecheck: aprovado após tratamento explícito de ausência do título no fixture de teste.
- `content:validate`: 46 registros, 29 avisos, zero erros. Dois avisos novos: autoria e licença pendentes; demais preexistentes.
- ESLint focado no teste novo, Prettier check e `git diff --check`: aprovados. Lint geral iniciado, não concluído e interrompido; **não registrado como aprovado**.
- Build local preview: aprovado, cliente e servidor. Avisos de ferramentas do build sem falha.
- `content:publish-check`: quatro bloqueios corretos — autor não verificado, licença pendente, estado não aprovado e ambiente oficial não configurado. Não se tentou contorná-los para publicar um rascunho.
- Prévia isolada em loopback usando MDX e componentes reais, sem rota pública nem anúncios: desktop 1440 px e celular 390 px. Com as classes oficiais `prose-editorial` e `overflow-wrap:anywhere`, largura de rolagem móvel 375 px para viewport 390 px, sem overflow horizontal; referências longas quebram corretamente. Imagens mantêm proporção. Lazy loading significa que imagens fora da janela não estão necessariamente carregadas ao capturar a tela; existência e dimensões dos quatro arquivos são cobertas pelos testes. Não foi executada validação completa de hidratação do template público para o rascunho.
- Nenhum outro artigo-fonte foi modificado. Alterações locais anteriores e `artifacts/` foram preservados.

**Conclusão:** apto como integração local em rascunho para revisão editorial. Não apto para publicação até resolver as pendências identificadas; nenhuma reescrita autoral foi aplicada.
