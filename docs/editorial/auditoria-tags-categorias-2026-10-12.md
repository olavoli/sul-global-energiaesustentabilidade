# Sul Global — auditoria e proposta de tags e categorias

12/10/2026. Base: commit cedb79c4c9d0f7ad3144681b7c2a044317664453, MDX e índice dos artigos publicados. Documento para aprovação editorial; nenhuma implementação. Metadados, resumos, seções e pontos-chave foram inspecionados, sem reabrir revisão científica.

## 1. Diagnóstico executivo

- 31 artigos publicados, não-demo, em sete categorias; oito categorias cadastradas.
- 81 tags distintas, 142 associações; 55 tags com apenas uma ocorrência. Isso não torna uma tag especializada automaticamente inadequada.
- Nenhuma duplicata dentro de um artigo e nenhuma forma rejeitada pelo normalizador atual. Os problemas são semânticos e de cobertura, não frontmatter inválido.
- Proposta: 90 termos e 132 associações. Três a cinco por artigo, com uma exceção técnica de seis; pertinência prevalece sobre quantidade.

Os 90 termos incluem 58 já existentes e 32 novas formas/temas. O vocabulário
cresce nove termos líquidos porque a proposta inclui assuntos centrais hoje
ausentes, além de consolidar ou retirar 23 etiquetas antigas. Não é uma promessa
de reduzir o catálogo nem uma recomendação de criar 90 páginas. Para uma adoção
mais conservadora, começar pelas equivalências claras e pelas lacunas de ORC,
IA, carneiro hidráulico e SUS; o restante da tabela pode ser aprovado por etapas.

## 2. Categorias — manter como áreas amplas

| Categoria | Slug | Publicados |
|---|---|---:|
| Políticas Públicas | politicas-publicas | 1 |
| Energia | energia | 10 |
| Sustentabilidade | sustentabilidade | 1 |
| Ciência | ciencia | 2 |
| Tecnologia | tecnologia | 6 |
| Desenvolvimento | desenvolvimento | 0 |
| Transição Energética | transicao-energetica | 7 |
| Funcional | funcional | 4 |

Não proponho recategorizar artigos nesta rodada. Políticas Públicas permanece independente em /categoria/politicas-publicas e fora do menu principal. Desenvolvimento tem zero publicados; sua proximidade com Políticas Públicas pede um critério futuro (desenvolvimento econômico/territorial versus gestão e avaliação de políticas), sem fusão automática.

Critério editorial sugerido para futuras classificações, sem mover o acervo:
Energia cobre funcionamento/economia do sistema; Ciência, pesquisa e mecanismos;
Tecnologia, aplicações de engenharia; Funcional, soluções e práticas; Sustentabilidade,
impactos ambientais e ciclo de vida; Transição Energética, mudança da matriz e
seus efeitos; Desenvolvimento, economia e território; Políticas Públicas,
instrumentos, financiamento e gestão institucional. A categoria é o enquadramento
principal; as tags descrevem os temas específicos e permitem cruzar essas áreas.

## 3. Como as tags funcionam hoje

- Array no frontmatter content/articles/*.mdx; categoria única. Índice gerado oficialmente em src/content/generated/articles.ts.
- src/content/schema.ts permite uma a oito tags e rejeita duplicatas e formas divergentes de preferredEditorialTag nos artigos reais. src/content/taxonomy.ts normaliza caixa e espaços e tem seis aliases. canonicalTags tem 18 entradas, mas não é whitelist: os 71 termos publicados fora dela não são inválidos por esse motivo.
- src/routes/artigo.$slug.tsx exibe #tags como spans; não são links. Não há rotas /tag/ ou páginas próprias para tags.
- src/content/repository.ts pesquisa título, subtítulo, resumo, categoria, tags e autor; não o corpo integral. Remove acentos/caixa, sem expansão de sinônimos. /busca?q= possui noindex, follow.
- Relacionados: tag exata compartilhada vale 6 pontos; mesma categoria, 4; mesmo tipo, 1. Máximo três; empate por slug, não recência. Duplicar sinônimos infla pontuação; grafias divergentes perdem correspondência.
- src/lib/seo.ts não deriva título/descrição/canonical/OG das tags; Article JSON-LD não inclui keywords.
- src/lib/distribution.ts inclui artigos e categorias no sitemap, não tags. RSS não emite tags/categorias por item; GUID é a URL do artigo. Slug e canonical não dependem das tags.

## 4. Problemas encontrados e formas recomendadas

| Situação atual | Proposta | Limite de aplicação |
|---|---|---|
| rede elétrica / redes elétricas | redes elétricas | Mesmo conceito editorial; unificar singular/plural. |
| armazenamento / armazenamento de energia | armazenamento de energia | Forma existente e explícita; revisar contexto antes de substituir. |
| longa duração / ldes | armazenamento de longa duração | Sigla referente à duração, não sinônimo de todo armazenamento; preservar busca por LDES. |
| curtailment / restrição de geração no mesmo artigo | restrição de geração | Um conceito; preservar curtailment como alias de busca antes de remover a tag. |
| conexão | conexão à rede | Explicita o assunto elétrico. |
| flexibilidade | flexibilidade do sistema elétrico | Evita ambiguidade. |
| processamento | processamento mineral | Somente no contexto mineral. |
| tarifas / custos | tarifas de energia / custos do sistema elétrico | Não fundir: custo do sistema e tarifa ao consumidor são distintos. |
| fotovoltaica / energia solar | Não criar alias automático | Fotovoltaica é subconjunto; chaminé solar não é fotovoltaica. |
| hidrogênio / hidrogênio verde | Manter distintos | Tecnologia geral e rota específica. |
| energia nuclear / fusão nuclear | Manter distintos | Não tratar tecnologias distintas como sinônimos. |
| saúde / saúde pública / ciência no ART-031 | Saúde pública e temas sanitários concretos | Categoria continua Políticas Públicas; priorizar financiamento e APS. |
| tecnologia / sustentabilidade / desenvolvimento / brasil | Retirar quando secundários | Não proibir: geografia e temas amplos podem ser centrais em outros textos. |
| smart grid → redes elétricas, alias já existente | Revisar antes de ampliar aliases | Redes inteligentes não equivalem a toda rede elétrica. Não alterado aqui. |

Lacunas: ORC/calor residual não estão nas tags do ART-030; inteligência artificial e centros de dados faltam no artigo de IA; carneiro hidráulico não está identificado; armazenamento térmico é mais preciso no texto de termoeletricidade. Energia é genérica para o portal, mas apropriada nos textos conceituais Energia/Potência. Não adicionar tags apenas para preencher uma cota.

## 5. Inventário completo e proposta por artigo

Título/URL/categoria preservados; última coluna é proposta.

| Artigo | Categoria atual | Tags atuais | Tags propostas |
|---|---|---|---|
| [A Pandemia salvou o SUS?](https://sulglobalenergia.com.br/artigo/a-pandemia-salvou-o-sus) | Políticas Públicas | ciência; saúde; políticas públicas; sus; saúde pública; covid-19 | sus; saúde pública; covid-19; financiamento da saúde; atenção primária à saúde |
| [A máquina que transforma calor desperdiçado em eletricidade](https://sulglobalenergia.com.br/artigo/a-maquina-que-transforma-calor-desperdicado-em-eletricidade) | Energia | eficiência energética; tecnologia; biomassa | ciclo rankine orgânico; calor residual; eficiência energética; biomassa; cogeração |
| [Transição Energética Justa em Santa Catarina: quem paga a conta e quem decide o futuro da região carbonífera? — Parte 2](https://sulglobalenergia.com.br/artigo/transicao-energetica-justa-em-santa-catarina-quem-paga-a-conta-e-quem-decide-o-futuro-da-regiao-carbonifera-parte-2) | Transição Energética | carvão; emprego; santa catarina; transição justa | carvão; transição justa; santa catarina; financiamento da transição; participação social |
| [Transição Energética Justa em Santa Catarina: Empregos e cidades depois do carvão - Parte 1](https://sulglobalenergia.com.br/artigo/transicao-energetica-justa-em-santa-catarina-empregos-e-cidades-depois-do-carvao) | Transição Energética | carvão; emprego; santa catarina; transição justa | carvão; transição justa; santa catarina; emprego; requalificação profissional |
| [É possível produzir eletricidade de dia e de noite?](https://sulglobalenergia.com.br/artigo/e-possivel-produzir-eletricidade-de-dia-e-de-noite) | Ciência | termoeletricidade; armazenamento; energia solar | termoeletricidade; armazenamento térmico; conversão de energia; energia solar |
| [É possível resfriar uma casa sem ar-condicionado?](https://sulglobalenergia.com.br/artigo/e-possivel-resfriar-uma-casa-sem-ar-condicionado) | Funcional | eficiência energética; sustentabilidade; arquitetura bioclimática | arquitetura bioclimática; resfriamento passivo; eficiência energética |
| [O que acontece com a rede quando todo mundo instala painel solar?](https://sulglobalenergia.com.br/artigo/o-que-acontece-com-a-rede-quando-todo-mundo-instala-painel-solar) | Transição Energética | geração distribuída; energia solar; redes elétricas; armazenamento | geração distribuída; energia solar; redes elétricas; armazenamento de energia |
| [A chaminé que produz eletricidade com o calor do Sol](https://sulglobalenergia.com.br/artigo/a-chamine-que-produz-eletricidade-com-o-calor-do-sol) | Funcional | energia solar; tecnologia; eficiência energética | energia solar; chaminé solar; conversão de energia |
| [O ar-condicionado que funciona sem compressor](https://sulglobalenergia.com.br/artigo/o-ar-condicionado-que-funciona-sem-compressor) | Funcional | eficiência energética; sustentabilidade; tecnologia | refrigeração; refrigeração por absorção; eficiência energética |
| [A bomba d’água que não precisa de eletricidade](https://sulglobalenergia.com.br/artigo/a-bomba-dagua-que-nao-precisa-de-eletricidade) | Funcional | eficiência energética; sustentabilidade; desenvolvimento | carneiro hidráulico; bombeamento de água; golpe de aríete |
| [A inteligência artificial vai virar um problema para o sistema elétrico?](https://sulglobalenergia.com.br/artigo/a-inteligencia-artificial-vai-virar-um-problema-para-o-sistema-eletrico) | Tecnologia | redes elétricas; eficiência energética; armazenamento; brasil | inteligência artificial; centros de dados; demanda elétrica; redes elétricas; eficiência energética |
| [A energia nuclear está voltando?](https://sulglobalenergia.com.br/artigo/a-energia-nuclear-esta-voltando) | Transição Energética | energia nuclear; transição energética; segurança energética; descarbonização; brasil; china | energia nuclear; segurança energética; descarbonização; viabilidade econômica |
| [O paradoxo da energia barata: Por que a conta de luz não cai apesar da revolução solar e eólica?](https://sulglobalenergia.com.br/artigo/o-paradoxo-da-energia-barata) | Transição Energética | energia solar; energia eólica; tarifas; redes elétricas; brasil; brics | tarifas de energia; energia solar; energia eólica; redes elétricas; custos do sistema elétrico |
| [A Conta da Transição Energética: Entre a Geração Barata e o Sistema Complexo](https://sulglobalenergia.com.br/artigo/a-conta-da-transicao-energetica-entre-a-geracao-barata-e-o-sistema-complexo) | Transição Energética | energia solar; energia eólica; brasil; armazenamento; redes elétricas; custos | transição energética; tarifas de energia; redes elétricas; armazenamento de energia; custos do sistema elétrico |
| [A transição energética vai aumentar o consumo de água?](https://sulglobalenergia.com.br/artigo/a-transicao-energetica-vai-aumentar-o-consumo-de-agua) | Transição Energética | energia solar; energia eólica; hidrogênio; brasil; mudanças climáticas; eficiência energética | água e energia; segurança hídrica; transição energética; hidrogênio |
| [A transição energética pode criar uma nova dependência mineral?](https://sulglobalenergia.com.br/artigo/a-transicao-energetica-vai-trocar-petroleo-por-minerais-criticos) | Energia | minerais críticos; transição energética; mineração; processamento; reciclagem; segurança mineral | minerais críticos; segurança mineral; mineração; processamento mineral; reciclagem |
| [Por que o hidrogênio verde não vai substituir toda a eletricidade?](https://sulglobalenergia.com.br/artigo/por-que-o-hidrogenio-verde-nao-vai-substituir-toda-a-eletricidade) | Energia | hidrogênio verde; eletrificação; eletrólise; amônia; siderurgia; brics | hidrogênio verde; eletrificação; eletrólise; amônia; siderurgia |
| [A rede elétrica está preparada para a transição energética?](https://sulglobalenergia.com.br/artigo/a-rede-eletrica-esta-preparada-para-a-transicao-energetica) | Energia | rede elétrica; transmissão; distribuição; conexão; flexibilidade; gets; mmgd | redes elétricas; transmissão; distribuição; conexão à rede; flexibilidade do sistema elétrico |
| [Por que usinas solares e eólicas precisam reduzir a geração?](https://sulglobalenergia.com.br/artigo/por-que-usinas-solares-e-eolicas-precisam-reduzir-a-geracao) | Energia | curtailment; restrição de geração; energia solar; energia eólica; flexibilidade; transmissão | restrição de geração; energia solar; energia eólica; flexibilidade do sistema elétrico; transmissão |
| [A transição energética vai ficar sem cobre?](https://sulglobalenergia.com.br/artigo/a-transicao-energetica-vai-ficar-sem-cobre) | Energia | cobre; minerais críticos; transição energética; mineração; reciclagem; eletrificação | cobre; minerais críticos; mineração; reciclagem; eletrificação |
| [Geotermia de nova geração: podemos levar o calor da Terra a muito mais lugares?](https://sulglobalenergia.com.br/artigo/geotermia-de-nova-geracao) | Tecnologia | geotermia; egs; energia firme; perfuração; progeo | geotermia; egs; perfuração; energia firme |
| [O que acontece com um painel solar quando ele chega ao fim da vida?](https://sulglobalenergia.com.br/artigo/o-que-acontece-com-um-painel-solar-no-fim-da-vida) | Sustentabilidade | energia solar; reciclagem; módulos fotovoltaicos; economia circular; logística reversa | energia solar; reciclagem; módulos fotovoltaicos; economia circular; logística reversa |
| [Perovskita + silício: por que empilhar duas células solares?](https://sulglobalenergia.com.br/artigo/perovskita-silicio-por-que-empilhar-duas-celulas-solares) | Tecnologia | energia solar; perovskita; silício; células tandem; fotovoltaica | energia solar; perovskita; silício; células tandem |
| [Temos energia. Por que não conseguimos conectá-la à rede?](https://sulglobalenergia.com.br/artigo/temos-energia-por-que-nao-conseguimos-conecta-la-a-rede) | Tecnologia | transmissão; redes elétricas; dlr; gets; facts; htls | transmissão; redes elétricas; dlr; gets; facts; htls |
| [Uma bateria precisa mesmo ser pequena?](https://sulglobalenergia.com.br/artigo/uma-bateria-precisa-mesmo-ser-pequena) | Tecnologia | armazenamento de energia; baterias; ldes; ferro-ar; usinas reversíveis | armazenamento de energia; armazenamento de longa duração; baterias; ferro-ar; usinas reversíveis |
| [Baterias de sódio estão chegando. Elas vão substituir o lítio?](https://sulglobalenergia.com.br/artigo/baterias-de-sodio-estao-chegando) | Tecnologia | baterias de sódio; armazenamento de energia; baterias; transição energética | baterias de sódio; baterias; armazenamento de energia |
| [Fusão nuclear está mais perto. Mas perto de quê?](https://sulglobalenergia.com.br/artigo/fusao-nuclear-esta-mais-perto-mas-perto-de-que) | Ciência | fusão nuclear; nif; iter; trítio; energia | fusão nuclear; trítio; nif; iter |
| [O que é potência e por que ela não é a mesma coisa que energia?](https://sulglobalenergia.com.br/artigo/o-que-e-potencia) | Energia | potência; energia; eficiência energética | potência; energia; consumo de energia |
| [Por que armazenar energia é tão difícil?](https://sulglobalenergia.com.br/artigo/por-que-armazenar-energia-e-tao-dificil) | Energia | armazenamento; baterias; longa duração; potência | armazenamento de energia; baterias; armazenamento de longa duração; potência |
| [Por que nenhuma máquina é 100% eficiente?](https://sulglobalenergia.com.br/artigo/por-que-nenhuma-maquina-e-100-eficiente) | Energia | eficiência energética | eficiência energética; termodinâmica; conservação de energia |
| [O que é energia?](https://sulglobalenergia.com.br/artigo/o-que-e-energia) | Energia | energia; eficiência energética; energia nuclear; energia solar | energia; conservação de energia; conversão de energia |

Exceção: seis tags no texto sobre conectar energia à rede. DLR, FACTS e HTLS são técnicas diferentes; GETs é guarda-chuva. Não fundir para atingir cinco. EGS não equivale a toda geotermia; NIF/ITER são projetos e não sinônimos de fusão. Siglas e entidades podem permanecer quando centrais; orientar seu significado no vocabulário editorial.

## 6. Vocabulário recomendado completo

Lista inicial orientadora, não fechada. Caixa baixa, acentos e uma forma por conceito; atualizar só após aprovação. Tags de uma ocorrência não são eliminadas por frequência.

| Forma recomendada | Artigos na proposta | Situação |
|---|---:|---|
| água e energia | 1 | Nova forma/tema proposto |
| amônia | 1 | Existente |
| armazenamento de energia | 5 | Existente |
| armazenamento de longa duração | 2 | Nova forma/tema proposto |
| armazenamento térmico | 1 | Nova forma/tema proposto |
| arquitetura bioclimática | 1 | Existente |
| atenção primária à saúde | 1 | Nova forma/tema proposto |
| baterias | 3 | Existente |
| baterias de sódio | 1 | Existente |
| biomassa | 1 | Existente |
| bombeamento de água | 1 | Nova forma/tema proposto |
| calor residual | 1 | Nova forma/tema proposto |
| carneiro hidráulico | 1 | Nova forma/tema proposto |
| carvão | 2 | Existente |
| células tandem | 1 | Existente |
| centros de dados | 1 | Nova forma/tema proposto |
| chaminé solar | 1 | Nova forma/tema proposto |
| ciclo rankine orgânico | 1 | Nova forma/tema proposto |
| cobre | 1 | Existente |
| cogeração | 1 | Nova forma/tema proposto |
| conexão à rede | 1 | Nova forma/tema proposto |
| conservação de energia | 2 | Nova forma/tema proposto |
| consumo de energia | 1 | Nova forma/tema proposto |
| conversão de energia | 3 | Nova forma/tema proposto |
| covid-19 | 1 | Existente |
| custos do sistema elétrico | 2 | Nova forma/tema proposto |
| demanda elétrica | 1 | Nova forma/tema proposto |
| descarbonização | 1 | Existente |
| distribuição | 1 | Existente |
| dlr | 1 | Existente |
| economia circular | 1 | Existente |
| eficiência energética | 5 | Existente |
| egs | 1 | Existente |
| eletrificação | 2 | Existente |
| eletrólise | 1 | Existente |
| emprego | 1 | Existente |
| energia | 2 | Existente |
| energia eólica | 2 | Existente |
| energia firme | 1 | Existente |
| energia nuclear | 1 | Existente |
| energia solar | 7 | Existente |
| facts | 1 | Existente |
| ferro-ar | 1 | Existente |
| financiamento da saúde | 1 | Nova forma/tema proposto |
| financiamento da transição | 1 | Nova forma/tema proposto |
| flexibilidade do sistema elétrico | 2 | Nova forma/tema proposto |
| fusão nuclear | 1 | Existente |
| geotermia | 1 | Existente |
| geração distribuída | 1 | Existente |
| gets | 1 | Existente |
| golpe de aríete | 1 | Nova forma/tema proposto |
| hidrogênio | 1 | Existente |
| hidrogênio verde | 1 | Existente |
| htls | 1 | Existente |
| inteligência artificial | 1 | Nova forma/tema proposto |
| iter | 1 | Existente |
| logística reversa | 1 | Existente |
| mineração | 2 | Existente |
| minerais críticos | 2 | Existente |
| módulos fotovoltaicos | 1 | Existente |
| nif | 1 | Existente |
| participação social | 1 | Nova forma/tema proposto |
| perfuração | 1 | Existente |
| perovskita | 1 | Existente |
| potência | 2 | Existente |
| processamento mineral | 1 | Nova forma/tema proposto |
| reciclagem | 3 | Existente |
| redes elétricas | 6 | Existente |
| refrigeração | 1 | Nova forma/tema proposto |
| requalificação profissional | 1 | Nova forma/tema proposto |
| refrigeração por absorção | 1 | Nova forma/tema proposto |
| resfriamento passivo | 1 | Nova forma/tema proposto |
| restrição de geração | 1 | Existente |
| santa catarina | 2 | Existente |
| saúde pública | 1 | Existente |
| segurança energética | 1 | Existente |
| segurança hídrica | 1 | Nova forma/tema proposto |
| segurança mineral | 1 | Existente |
| siderurgia | 1 | Existente |
| silício | 1 | Existente |
| sus | 1 | Existente |
| tarifas de energia | 2 | Nova forma/tema proposto |
| termodinâmica | 1 | Nova forma/tema proposto |
| termoeletricidade | 1 | Existente |
| transição energética | 2 | Existente |
| transição justa | 2 | Existente |
| transmissão | 3 | Existente |
| trítio | 1 | Existente |
| usinas reversíveis | 1 | Existente |
| viabilidade econômica | 1 | Nova forma/tema proposto |

## 7. Simulação de descoberta e relacionados

Somente as tags foram trocadas em memória, sem alterar ranking: os três relacionados (seleção ou ordem) mudam em 24 dos 31 artigos. Isso não comprova melhora de pertinência. O algoritmo admite candidatos só pelo tipo de conteúdo; o ART-031 ainda pode receber artigos de energia com score 1 e nenhum tema comum. Eventual exigência de relação temática seria decisão técnica separada, não migração silenciosa.

Exemplos (slugs):

- A Pandemia salvou o SUS?: atuais [a-conta-da-transicao-energetica-entre-a-geracao-barata-e-o-sistema-complexo; a-energia-nuclear-esta-voltando; a-inteligencia-artificial-vai-virar-um-problema-para-o-sistema-eletrico]; propostos [a-conta-da-transicao-energetica-entre-a-geracao-barata-e-o-sistema-complexo; a-energia-nuclear-esta-voltando; a-inteligencia-artificial-vai-virar-um-problema-para-o-sistema-eletrico].
- A máquina que transforma calor desperdiçado em eletricidade: atuais [a-chamine-que-produz-eletricidade-com-o-calor-do-sol; o-ar-condicionado-que-funciona-sem-compressor; o-que-e-energia]; propostos [por-que-nenhuma-maquina-e-100-eficiente; a-inteligencia-artificial-vai-virar-um-problema-para-o-sistema-eletrico; e-possivel-resfriar-uma-casa-sem-ar-condicionado].
- A rede elétrica está preparada para a transição energética?: atuais [por-que-usinas-solares-e-eolicas-precisam-reduzir-a-geracao; temos-energia-por-que-nao-conseguimos-conecta-la-a-rede; a-transicao-energetica-vai-ficar-sem-cobre]; propostos [por-que-usinas-solares-e-eolicas-precisam-reduzir-a-geracao; temos-energia-por-que-nao-conseguimos-conecta-la-a-rede; a-conta-da-transicao-energetica-entre-a-geracao-barata-e-o-sistema-complexo].
- Baterias de sódio estão chegando. Elas vão substituir o lítio?: atuais [uma-bateria-precisa-mesmo-ser-pequena; a-energia-nuclear-esta-voltando; a-transicao-energetica-vai-ficar-sem-cobre]; propostos [uma-bateria-precisa-mesmo-ser-pequena; por-que-armazenar-energia-e-tao-dificil; a-conta-da-transicao-energetica-entre-a-geracao-barata-e-o-sistema-complexo].

Sem aliases ou preservação editorial dos termos antigos, 37 pares artigo/termo deixariam de corresponder na busca. Não é contagem de URLs quebradas ou de buscas sem resultado no portal inteiro. Lista para decisão explícita:

| Artigo | Termo antigo que deixaria de encontrar esse artigo |
|---|---|
| A Pandemia salvou o SUS? | ciência |
| A máquina que transforma calor desperdiçado em eletricidade | tecnologia |
| Transição Energética Justa em Santa Catarina: quem paga a conta e quem decide o futuro da região carbonífera? — Parte 2 | emprego |
| É possível resfriar uma casa sem ar-condicionado? | sustentabilidade |
| A chaminé que produz eletricidade com o calor do Sol | tecnologia |
| A chaminé que produz eletricidade com o calor do Sol | eficiência energética |
| O ar-condicionado que funciona sem compressor | sustentabilidade |
| A bomba d’água que não precisa de eletricidade | eficiência energética |
| A bomba d’água que não precisa de eletricidade | sustentabilidade |
| A bomba d’água que não precisa de eletricidade | desenvolvimento |
| A inteligência artificial vai virar um problema para o sistema elétrico? | armazenamento |
| A inteligência artificial vai virar um problema para o sistema elétrico? | brasil |
| A energia nuclear está voltando? | brasil |
| A energia nuclear está voltando? | china |
| O paradoxo da energia barata: Por que a conta de luz não cai apesar da revolução solar e eólica? | brasil |
| O paradoxo da energia barata: Por que a conta de luz não cai apesar da revolução solar e eólica? | brics |
| A Conta da Transição Energética: Entre a Geração Barata e o Sistema Complexo | energia solar |
| A Conta da Transição Energética: Entre a Geração Barata e o Sistema Complexo | energia eólica |
| A Conta da Transição Energética: Entre a Geração Barata e o Sistema Complexo | brasil |
| A transição energética vai aumentar o consumo de água? | energia solar |
| A transição energética vai aumentar o consumo de água? | energia eólica |
| A transição energética vai aumentar o consumo de água? | brasil |
| A transição energética vai aumentar o consumo de água? | mudanças climáticas |
| A transição energética vai aumentar o consumo de água? | eficiência energética |
| Por que o hidrogênio verde não vai substituir toda a eletricidade? | brics |
| A rede elétrica está preparada para a transição energética? | gets |
| A rede elétrica está preparada para a transição energética? | mmgd |
| Por que usinas solares e eólicas precisam reduzir a geração? | curtailment |
| Geotermia de nova geração: podemos levar o calor da Terra a muito mais lugares? | progeo |
| Perovskita + silício: por que empilhar duas células solares? | fotovoltaica |
| Uma bateria precisa mesmo ser pequena? | ldes |
| Baterias de sódio estão chegando. Elas vão substituir o lítio? | transição energética |
| Fusão nuclear está mais perto. Mas perto de quê? | energia |
| O que é potência e por que ela não é a mesma coisa que energia? | eficiência energética |
| O que é energia? | eficiência energética |
| O que é energia? | energia nuclear |
| O que é energia? | energia solar |

## 8. Implementação mínima após aprovação

1. Alterar apenas tags dos MDX com mudança efetiva, mantendo texto, títulos, categorias, slugs, URLs, canonical, primeira data/GUID e Notas. Não tratar atualização de tags como nova publicação nem newsletter. Registrar a manutenção pelo fluxo editorial existente.
2. Atualizar o vocabulário orientador e aliases realmente equivalentes em src/content/taxonomy.ts, com testes de normalização/duplicação. Manter o limite de oito: três a cinco é preferência editorial.
3. Antes de eliminar termos ainda relevantes, acrescentar aliases de busca em src/content/repository.ts ou manter a etiqueta temporariamente. Prioridades: curtailment e LDES. Não mapear sinônimos amplos por conveniência. Termos despriorizados devem ser removidos conscientemente.
4. Regenerar índices pelo procedimento oficial; conferir buscas e relacionados antes/depois. Não modificar algoritmo de ranking junto com tags sem aprovação específica.
5. Nenhuma necessidade de D1, migrations, dependências, CSP ou integrações. Etiquetas clicáveis para /busca?q= são opção posterior; busca continua noindex. Páginas /tag/ ficam para projeto separado, com slug estável, conteúdo útil, canonical e política de indexação próprios. Não criar 81 páginas automaticamente.

Arquivos potencialmente afetados: MDX efetivamente alterados da tabela; src/content/taxonomy.ts; testes de schema/taxonomia/repositório; src/content/repository.ts somente se aliases de busca forem aprovados; índices gerados e guia editorial. src/routes/artigo.$slug.tsx somente com aprovação de links clicáveis. Não adicionar Políticas Públicas a nav-items.ts.

## 9. Riscos e SEO

Tags não mudam URL, canonical ou GUID na arquitetura encontrada. Não há páginas de tag antigas para redirecionar. Alterar slugs/categorias não faz parte da proposta. Efeitos reais: rótulos visíveis, busca e relações entre conteúdos; não há promessa de ganho automático de ranking.

Para navegação temática futura, links internos devem usar href e texto descritivo: [Google Search Central — links rastreáveis](https://developers.google.com/search/docs/crawling-indexing/links-crawlable). Evitar coleções duplicadas sem propósito, manter canonical/links/sitemap consistentes e não usar noindex como substituto de canonicalização: [Google — canonical](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls). A política atual noindex da busca é separada da navegação interna: [Google — robots meta](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag).

## 10. Decisões editoriais solicitadas

Aprovar a tabela de tags e suas formas canônicas; decidir quais termos antigos ainda devem encontrar cada artigo; manter categorias e a exceção técnica de seis tags; decidir separadamente sobre links de tags ou ranking temático. Recomendo primeiro padronização e aliases de busca, depois conferência de relacionados, e só então páginas temáticas se houver demanda.

Criado exclusivamente este relatório. Nenhum artigo, código, índice, configuração, artifacts/ ou alteração local preexistente modificado. Sem commit, push, deploy ou Kit. Sem testes/build que escrevam índices; simulações em memória e conferência de todos os 31 registros.
