# ART-038 — Histórico da integração

> Registro inicial, preservado para rastreabilidade. Os bloqueios descritos abaixo foram saneados na etapa posterior; consulte [saneamento-final.md](./saneamento-final.md). Este histórico não representa o estado final do release.

Registro de 20 de novembro de 2026. Branch codex/art-038-integracao, baseada na main 549b1bd8265ad603aef3ec64406923e513001365.

## Material integrado

Manuscrito fornecido em Word, autoria Olavo Oliveira. Contagem de 3.764 palavras no texto extraído, incluindo bibliografia. Foram representados 80 parágrafos de conteúdo; dois rótulos de estrutura foram convertidos para os componentes KeyPoints e Callout. Cinco pontos-chave, destaque, títulos e sequência narrativa, 22 referências numeradas e respectivas citações foram preservados. A conferência encontrou os 12 trechos de itálico do Word representados no MDX.

O subtítulo conserva o parêntese final existente no Word. O cabeçalho da bibliografia conserva “Referências Biográficas”. Esses dois detalhes podem ser corrigidos editorialmente, mas não foram alterados nesta importação.

A abertura integral do Word foi mantida no corpo. Foi redigida uma descrição curta para o metadado excerpt, cujo schema admite no máximo 240 caracteres.

## Imagens e transparência

Hero original em PNG de 2000 × 1125 px, gerada com Pippit/Seedream 4.0, com logotipo inserido no Microsoft PowerPoint conforme declaração do responsável. Imagem 1: mapa de mercados potenciais, 941 × 1672 px. Imagem 2: três caminhos para o mercado, 941 × 1672 px. Ambos produzidos com ChatGPT conforme declaração do responsável. A numeração segue os nomes definitivos dos arquivos encaminhados, que prevalecem sobre a ordem da lista genérica do texto de instruções.

Os três originais foram copiados sem reprocessamento. Sete derivados WebP foram gerados com qualidade 90, sem upscale, para o srcset existente. Os infográficos preservam o PNG de resolução integral na ampliação e têm descrições textuais acessíveis baseadas exclusivamente nas artes. O arquivo imagens.json registra dimensões, caminhos e hashes.

A Nota de Transparência usa exatamente os dois parágrafos da mensagem mais recente, incluindo a condição de publicação. O componente detalhado existente apresenta os rótulos em negrito. Créditos e procedência foram associados a cada imagem. A documentação de licença aplicável à Hero permanece pendente no gate; não foi atribuída ao Pippit a licença da OpenAI.

## Série e taxonomia

Categoria transicao-energetica, igual ao ART-037. Oito tags: hidrogênio verde, santa catarina, transição energética, armazenamento de energia, indústria, portos, amônia verde e descarbonização. Os três termos ausentes foram acrescentados ao catálogo multilíngue existente, sem criar edições traduzidas.

O ART-038 aponta para o ART-037. O artigo publicado anteriormente permanece intacto. A navegação relacionada existente poderá relacioná-los quando o ART-038 for publicado. Nenhuma URL de Parte 3 provisória foi criada.

EN/ES permanecem sem tradução de artigo. Não foram criadas rotas de artigos EN/ES, nem iniciados processos de inferência ou tradução.

## Verificação bibliográfica

As 22 entradas e os números 1–22 nas citações do corpo foram preservados. Os 20 destinos distintos de hiperlinks foram consultados uma vez; os resultados estão em links-verificados.json. Resposta HTTP não confirma o suporte de uma fonte à afirmação.

- Referências 2, 3, 8, 10 e 17 apontam para páginas iniciais de instituições. Identificar os documentos específicos antes de considerá-las confirmadas.
- Referência 7 retornou HTTP 404.
- Referências 1/18, 11 e 16 retornaram HTTP 403 no cliente HTTP. O relatório da IEA e a tabela do DOE puderam ser consultados pela ferramenta de pesquisa. A IRENA possui PDF oficial indexado que sustenta 17,5 L/kg para PEM e 22,3 L/kg para alcalina. O bloqueio HTTP não foi tratado como ausência da fonte.
- Referências 19 e 20 tiveram falha de comunicação no cliente HTTP. O texto oficial da Câmara confirma que a Lei nº 14.990 é de 27/09/2024 e foi publicada no DOU em 30/09/2024. A referência 20 do Word registra 26/09/2024; foi preservada para decisão editorial.
- Referência 21: o alvo de hiperlink do Word era malformado (%20https:/...). Foi corrigido para https://leis.alesc.sc.gov.br/ato-normativo/22556, já escrito no texto visível. A data do DOE também deve ser revista, pois a fonte oficial do ART-037 registrava publicação em 02/10/2024.
- O DOE confirma 55 kWh/kg no status de 2022 e 52 kWh/kg como meta de 2026 para o sistema. A exclusão subsequente dos auxiliares no manuscrito exige esclarecer o limite adotado, antes de validar o exemplo.
- Os cálculos ilustrativos 52 MWh/dia, 2,17 MW em 24 horas e 4,33 MW em 12 horas são aritmeticamente consistentes com 52 kWh/kg e uma tonelada/dia.
- O percentual de eletricidade de 70–80% do OPEX requer fonte e delimitação.
- O caráter prospectivo dos mercados e modelos de negócio foi preservado.

Fontes de verificação:
https://www.energy.gov/cmei/fuels/technical-targets-liquid-alkaline-electrolysis
https://www.iea.org/reports/global-hydrogen-review-2026
https://www.irena.org/-/media/Files/IRENA/Agency/Publication/2023/Dec/IRENA_Bluerisk_Water_for_hydrogen_production_2023.pdf
https://www2.camara.leg.br/legin/fed/lei/2024/lei-14990-27-setembro-2024-796410-publicacaooriginal-173227-pl.html
https://www.pippit.ai/clause/terms-of-service
https://www.pippit.ai/tools/text-to-design

## Validação e estado

MDX compilado, integridade do texto e citações conferida, TypeScript e build de produção aprovados. Os 66 testes focados passaram (56 de fluxo, tags, descoberta e transparência; dez de taxonomia multilíngue). A prévia local em 1440, 768 e 390 px carregou as três imagens, a Nota de Transparência e o MDX, sem rolagem horizontal. O laboratório temporário foi encerrado e seus arquivos foram removidos.

O catálogo valida 51 artigos, com zero erros e 28 avisos, incluindo a licença pendente do ART-038. O controle editorial do artigo rejeita a licença de imagem pendente. O gate de pesquisa mantém bloqueios de fact-check, perguntas abertas, conflitos de interesse e conclusão da pesquisa.

O ART-038 permanece draft/writing, com briefing fact-checking. Não há aprovação editorial final ou avaliação de conflitos inferida de outro artigo. Nenhuma transição para published foi executada.

A suíte completa local foi iniciada e interrompida depois de deixar de progredir. O último resultado registrado foi uma falha em scripts/i18n-cloudflare-experiment/campaigns.test.ts:86, com expected 1 e received 0. A suíte completa não está aprovada. O registro não permite atribuir essa falha ao ART-038; o código do experimento e as dependências não foram modificados.

Arquivos de evidência são locais. Nenhum commit, PR ou deploy foi criado para este rascunho. O gate editorial deve ser repetido após saneamento antes de preparar o release.O lint focado dos arquivos TypeScript alterados passou. O lint global ficou inconclusivo e foi interrompido após deixar de progredir; deve ser repetido no release isolado antes de publicação.
