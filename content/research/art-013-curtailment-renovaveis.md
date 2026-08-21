# ART-013 — Restrições de geração solar e eólica

## Estado do documento

- Tipo: dossiê de pesquisa, não publicável
- Verificação: 16 de agosto de 2026
- Escopo: fundamentos, Brasil, China, Chile, economia e soluções
- Termo editorial adotado: **restrição de geração**; na primeira ocorrência, explicar que o termo também é conhecido pelo inglês *curtailment* e, informalmente, por “corte de geração”

## Protocolo de abrangência global aplicado

A pesquisa não parte de uma lista fixa de países. Ela combina fontes brasileiras, organismos multilaterais, literatura internacional e fontes primárias dos sistemas que se mostrarem relevantes depois da busca inicial. Países entram na narrativa somente quando oferecem evidência, contraste ou uma solução que ajude a responder à pergunta central.

China e Chile, portanto, não delimitam a revisão. A rodada complementar examinou também Austrália, Califórnia/EUA, Alemanha, Espanha, Grã-Bretanha, Irlanda, Dinamarca e Japão. Foram procurados deliberadamente mecanismos diferentes e resultados que contrariassem uma leitura única do problema. Indicadores incompatíveis permanecem separados.

## Pergunta central

Por que um sistema elétrico pode precisar de mais eletricidade ao longo do ano e, ao mesmo tempo, mandar usinas solares ou eólicas reduzir a produção em determinadas horas?

A aparente contradição desaparece quando se considera que eletricidade não é apenas uma quantidade anual. Ela precisa chegar no instante, no lugar e nas condições técnicas em que pode ser consumida. Uma usina pode ter vento ou sol disponível e ainda não conseguir transformar todo esse recurso em eletricidade entregue: a demanda local pode estar baixa, a transmissão pode estar no limite ou o operador pode precisar preservar segurança, frequência, tensão e reservas operacionais.

## Título: decisão preliminar

| Opção | Vantagem | Risco |
| --- | --- | --- |
| Por que desperdiçamos energia solar e eólica mesmo quando precisamos de mais eletricidade? | Provocativo e acessível | “Desperdício” antecipa um juízo econômico e técnico |
| Por que usinas solares e eólicas precisam reduzir a geração? | Preciso e compatível com reduções parciais | Menos provocativo |
| Por que nem toda energia solar e eólica disponível chega à rede? | Expõe a cadeia física | Pode sugerir que transmissão é a única causa |

**Recomendação:** “Por que usinas solares e eólicas precisam reduzir a geração?”. O título preserva a pergunta sem classificar toda restrição como desperdício. “Desperdício” pode aparecer no corpo como hipótese a ser examinada.

## Vocabulário e grandezas

### A cadeia que o artigo precisa preservar

1. **Recurso disponível:** sol ou vento nas condições daquele instante.
2. **Geração potencial/estimada:** eletricidade que a instalação poderia produzir segundo a metodologia adotada.
3. **Geração restringida:** parcela que deixou de ser produzida por comando, limitação ou despacho aplicável.
4. **Geração entregue:** eletricidade efetivamente injetada e aceita pelo sistema.

Esses conceitos dependem de medição e modelagem. “Potencial” não é uma observação direta universal: pode ser estimado a partir de meteorologia, disponibilidade das máquinas, curvas de potência e produção frustrada.

### Potência não é energia

- **GW** mede potência: uma taxa instantânea de geração ou restrição.
- **GWh/TWh** mede energia acumulada durante um intervalo.

Uma restrição de 40 GW durante 15 minutos corresponde, de forma simplificada, a 10 GWh. Sem duração, não é possível converter potência restringida em energia. Portanto, o cenário do Operador Nacional do Sistema Elétrico (ONS) com mais de 40–50 GW de redução instantânea não significa “40–50 GW de energia desperdiçada”.

## Por que ocorre a restrição

### 1. Limites de transmissão

Linhas, transformadores e corredores de intercâmbio têm limites térmicos, elétricos e de segurança. Se uma região produz mais do que consegue consumir ou exportar com segurança, parte da geração precisa ser reduzida. Uma nova linha pode aliviar o gargalo, mas sua eficácia depende de onde está o limite e de como a rede evolui.

### 2. Equilíbrio instantâneo

Geração e consumo precisam permanecer equilibrados continuamente. Uma necessidade anual crescente não elimina excedentes ao meio-dia de um domingo. O mesmo sistema pode precisar de expansão para atender noites, secas ou picos e enfrentar excesso solar em horas de baixa carga.

### 3. Confiabilidade e estabilidade

O operador também limita geração para manter frequência, tensão, margens de segurança e resposta a contingências. “Há espaço energético” não implica que qualquer combinação de máquinas possa operar sem restrições. Inversores, controles, compensação reativa, reservas e serviços de rede mudam o resultado, mas não eliminam todos os limites.

### 4. Flexibilidade insuficiente

Usinas despacháveis, armazenamento, resposta da demanda, intercâmbios e regras operativas permitem ajustar oferta e consumo. Quando esses recursos são insuficientes, lentos, mal localizados ou economicamente indisponíveis, aumenta a necessidade de reduzir renováveis variáveis.

### 5. Concentração espacial e temporal

Projetos solares tendem a produzir em horas semelhantes; parques eólicos de uma mesma área também podem apresentar produção correlacionada. A coincidência reduz a diversidade do portfólio e pode criar excedentes regionais mesmo quando outro local precisará de energia mais tarde.

### 6. Geração distribuída

A geração solar próxima ao consumidor reduz a carga líquida observada pelo operador durante o dia. No Brasil, parte relevante desses recursos não é diretamente controlável nem plenamente observável pelo ONS. O efeito é duplo: menor espaço diurno para a geração centralizada e rampas mais íngremes quando o sol cai.

## Brasil

### Diagnóstico do ONS

O PAR/PEL 2025 distingue duas famílias principais:

- **razões de confiabilidade elétrica:** limites de transmissão, indisponibilidades e requisitos elétricos;
- **razões energéticas:** oferta potencial superior à demanda instantânea que o sistema consegue absorver, mesmo sem o limite de transmissão analisado.

O método “de cima para baixo” do ONS classifica como energética a parcela que continuaria necessária caso o gargalo de transmissão fosse removido. Essa escolha evita atribuir à rede toda redução observada. Segundo o sumário executivo, em 2025 as razões energéticas já se tornaram a principal causa no diagnóstico apresentado.

O problema se concentra entre 9h e 16h, sobretudo em domingos e feriados, quando a geração solar é elevada e a carga é menor. A Micro e Minigeração Distribuída (MMGD) reduz ainda mais a carga líquida supervisionada. O ONS destaca limitações de observabilidade e controle desses recursos.

### O que significam 40–50 GW

Para 2026–2029, o ONS simulou 8.760 horas anuais com perfis históricos e hipóteses de expansão. Em cenários críticos, os cortes instantâneos podem ultrapassar 40–50 GW. O número:

- é **potência instantânea**, não energia anual;
- é **prospectivo**, não registro histórico;
- depende de premissas de carga, expansão, hidrologia, MMGD e entrada de projetos;
- não inclui todos os possíveis limites internos, como algumas restrições locais indicadas pelo próprio estudo;
- deve orientar planejamento, não ser tratado como previsão pontual inevitável.

O estudo parte, entre outras simplificações, do padrão hidrelétrico observado em 2024. Para eólica e solar, estima a produção potencial somando a geração realizada à geração frustrada e ajustando-a pela expansão de capacidade. Essas escolhas tornam o cenário reproduzível, mas não eliminam incerteza meteorológica, hidrológica e regulatória.

### Nordeste, intercâmbios e transmissão

A concentração de projetos no Nordeste torna decisiva a capacidade de intercâmbio com Sudeste/Centro-Oeste. O PAR/PEL prevê reforços e elevação dos limites de transferência. Transmissão é parte essencial da resposta, mas não basta quando o excedente é nacional ou coincide com carga muito baixa. Planejar geração e rede de maneira coordenada reduz o risco de ativos entrarem antes da infraestrutura necessária.

### Regulação e compensação

O tratamento econômico não deve ser simplificado como “todo corte será indenizado”. Contratos, causa, responsabilidade, regra vigente e data do evento importam. Após a Consulta Pública nº 210/2025, o Ministério de Minas e Energia publicou a Portaria nº 140, de 18 de julho de 2026. O ato regulamentou procedimentos, critérios e prazos para a celebração de termo de compromisso relacionado à compensação por determinados cortes de usinas eólicas e solares conectadas ao Sistema Interligado Nacional, ocorridos entre 1º de setembro de 2023 e 25 de novembro de 2025. O mecanismo possui causas e requisitos definidos na Lei nº 15.269/2025 e na portaria; não constitui compensação universal por sobreoferta energética ou por qualquer restrição de geração.

### Planejamento de flexibilidade

A Empresa de Pesquisa Energética (EPE) trata armazenamento e resposta da demanda como Recursos Energéticos Distribuídos (RED). A versão em consulta do Plano Nacional de Energia 2055 discute forte expansão da MMGD, baterias, Usinas Hidrelétricas Reversíveis (UHR) e resposta da demanda. Por ser documento de consulta, seus cenários não são decisão vinculante.

## China: escala e metodologia própria

A Administração Nacional de Energia da China (NEA) informa que, em 2025, a geração eólica chegou a 1,13 trilhão de kWh e a solar fotovoltaica a 1,17 trilhão de kWh. As taxas médias nacionais de utilização foram 94% para eólica e 95% para solar.

Esses percentuais devem permanecer com o nome e a metodologia chineses. As regras consultadas relacionam geração real e geração disponível e também descrevem um tratamento específico para a taxa que considera somente restrições por razões sistêmicas. Ainda é necessário confirmar qual variante sustenta o indicador nacional publicado. Por isso, não é seguro escrever “houve exatamente 6% e 5% de curtailment” nem comparar o complemento aritmético com séries estrangeiras. Documentos da NEA também permitem metas provinciais de utilização compatíveis com desenvolvimento renovável, capacidade do sistema, economia e custos sociais. Isso mostra que algum nível de não aproveitamento pode ser administrado como escolha sistêmica, não apenas como falha física.

**Pendente antes da publicação:** transcrever e traduzir de forma controlada a fórmula oficial completa da taxa de utilização e confirmar o denominador e as exclusões aplicáveis.

## Chile: energia reduzida, não taxa harmonizada

O Coordinador Eléctrico Nacional publica planilhas mensais de reduções de energia renovável variável. Em apresentação preliminar, registrou aproximadamente 5.700 GWh em 2025, acumulados até 25 de dezembro, ante 5.640 GWh em 2024. O valor de 2025 é preliminar e a cobertura temporal deve acompanhar a fonte.

O Chile ilustra bem o efeito da concentração geográfica: recursos solares abundantes no norte precisam alcançar centros de consumo e atravessar uma rede com limites. Entretanto, seus GWh não devem ser convertidos em percentual nem comparados diretamente às taxas de utilização chinesas ou aos cenários de potência do ONS sem denominadores e metodologias compatíveis.

## Varredura global complementar

| País/sistema | Magnitude e definição | Causas ou mecanismo | Soluções/resultado observado | Fonte primária e metodologia | Utilidade para o ART-013 |
| --- | --- | --- | --- | --- | --- |
| Austrália/NEM | A AEMO publica resultados históricos trimestrais e projeções locacionais de curtailment por faixas | congestionamento, limites de conexão, elevada geração solar distribuída e localização de novos projetos | zonas de energia renovável, transmissão, baterias, hidrelétricas reversíveis e sinais locacionais | AEMO, QED e Enhanced Locational Information 2025; projeções não equivalem a resultados observados | mostra que risco de corte pode orientar localização antes do investimento |
| Califórnia/CAISO | relatórios diários separam energia horária restringida em MWh e máximo de potência em MW | excesso solar diurno, condições de mercado e limites operativos/transmissão | armazenamento, exportações/intercâmbios e demanda flexível | CAISO Daily Renewable Report; séries de despacho em tempo real | reforça a distinção entre potência máxima e energia acumulada |
| Irlanda/SEM | Na metodologia EirGrid/SONI, *constraint* designa redução por problema local e *curtailment*, redução por razão sistêmica; em 2024, a Irlanda registrou 627.440 MWh de curtailment eólico e 32.006 MWh solar | segurança local de rede e limites sistêmicos para acomodar renováveis | evolução das regras operativas, reforços e relatórios com códigos de causa | EirGrid, Annual Renewable Constraint and Curtailment Report 2024; os volumes citados são da Irlanda, não total automático de toda a ilha | é o contraste conceitual mais próximo da distinção brasileira entre causas locais/elétricas e sistêmicas, sem equivalência taxonômica perfeita |
| Alemanha | redispatch inclui redução renovável, aumento de geração em outro ponto, reservas e countertrading | eólica concentrada no norte, consumo no sul e atraso de transmissão | “Use, don’t curtail 2.0” testa carga adicional localizada: calor elétrico, armazenamento, eletrolisadores e bombas de calor | Bundesnetzagentur/SMARD; redispatch é categoria mais ampla que curtailment | mostra que resposta da demanda precisa estar no lado certo do gargalo e não substitui expansão da rede |
| Grã-Bretanha/NESO | relatórios de redispatch e custos de restrições usam estrutura regulatória própria | limites de transmissão, especialmente fronteiras com elevada geração escocesa | reforços, *boundary flow smoothing* e serviço de demanda para restrições em avaliação | NESO ETYS e Constraints Collaboration Project | acrescenta solução de curto prazo enquanto obras de rede têm prazo longo; não usar estimativas de custo sem auditar o cenário |
| Espanha/REE | “restrição técnica” inclui circunstâncias que afetam segurança, qualidade e confiabilidade | balanço, rede e requisitos de operação | serviços de ajuste, resposta ativa da demanda, mecanismo automático de redução de potência e plataformas europeias | Red Eléctrica, Servicios de ajuste; não é uma série diretamente comparável de curtailment renovável | evidencia integração entre balanceamento nacional e plataformas europeias |
| Japão/OCCTO | documentos oficiais tratam controle de saída renovável e verificação de sua aplicação | excedentes regionais, limites de interconexão e regras de prioridade | expansão/interligações, armazenamento e revisão de operação | OCCTO, Business Plan FY2025; tradução e estatísticas detalhadas ainda requerem auditoria | útil para futuro aprofundamento, mas não supera os casos escolhidos para o corpo condensado |
| Dinamarca/Energinet | sistema altamente interligado combina eólica, mercados nórdicos/europeus e flexibilidade térmica | o caso testa a hipótese de que alta participação renovável leva inevitavelmente a cortes elevados | interconexões, comércio e flexibilidade reduzem a necessidade de tratar cada excedente internamente | fontes do operador foram mapeadas, mas não foi consolidada nesta rodada uma série harmonizada de corte | contraexemplo relevante, mantido como lacuna de pesquisa e não usado quantitativamente |

### Casos escolhidos para a narrativa

Além do Brasil, a versão condensada preserva:

1. **China**, pela escala e pelo cuidado metodológico com “taxa de utilização”;
2. **Chile**, pela concentração geográfica e publicação de energia reduzida;
3. **Irlanda**, pela separação explícita entre restrições locais e sistêmicas;
4. **Alemanha**, por transformar demanda localizada em instrumento contra congestionamentos.

Austrália e Califórnia permanecem no dossiê como casos importantes de planejamento e transparência de dados. A seleção não representa ranking mundial.

## Curtailment é sempre desperdício?

Não. Projetar uma rede capaz de escoar o último megawatt renovável de todas as horas pode custar mais do que reduzir uma pequena parcela em ocasiões raras. Literatura econômica mostra que curtailment limitado pode integrar uma solução de menor custo total. Também pode ser tecnicamente necessário para segurança.

Isso não torna irrelevante qualquer corte. Restrição persistente, crescente ou concentrada pode indicar atraso de transmissão, localização inadequada, sinais econômicos ruins ou pouca flexibilidade. A pergunta útil não é “zero ou desperdício”, mas: **qual nível, por qual causa, com que frequência e comparado a qual alternativa?**

## É só colocar baterias?

Baterias podem armazenar excesso diurno e devolvê-lo à noite, reduzir rampas e fornecer serviços operativos quando projetadas para isso. Ainda assim, localização, potência, energia, duração, eficiência e custo importam.

- A capacidade do armazenamento de aliviar congestionamentos depende de localização elétrica, conexão, estratégia de operação, potência, duração e natureza da restrição; sua simples presença não elimina um limite de rede.
- Armazenamento de poucas horas não resolve necessariamente excedentes de vários dias ou sazonais.
- Serviços de estabilidade dependem de conversores, controles e regras, não apenas da presença de células.
- Carregar e descarregar só cria valor quando o diferencial temporal e os serviços compensam custos e perdas.

Portanto, não há tecnologia vencedora universal. O problema pede combinação de rede, armazenamento de diferentes durações, carga flexível e operação coordenada.

## Portfólio de respostas

1. **Transmissão e interligações:** levam energia entre regiões e compartilham diversidade.
2. **Armazenamento:** desloca energia e, conforme o projeto, presta serviços de rede.
3. **Resposta da demanda:** move consumo para horas de maior disponibilidade.
4. **Flexibilidade operacional e despachável:** ajusta recursos e preserva reservas.
5. **Melhor observabilidade da geração distribuída:** reduz incerteza sobre a carga líquida.
6. **Sinais econômicos e locacionais:** aproximam decisões privadas do custo sistêmico.
7. **Planejamento coordenado:** sincroniza geração, rede e flexibilidade.

Nenhum item elimina sozinho as restrições. A combinação ótima muda por sistema, região e horizonte temporal.

## Registro dos principais números

| Valor | Unidade | Período | País/sistema | Definição | Fonte e cautela |
| --- | --- | --- | --- | --- | --- |
| >40–50 | GW | cenários 2026–2029 | Brasil/SIN | potência instantânea de restrição em horas críticas | ONS PAR/PEL 2025; prospectivo, não energia histórica |
| 269,4 | GW | 2029 | Brasil/SIN | capacidade instalada no caso de referência | ONS PAR/PEL 2025; cenário |
| 60,3 | GW | 2029 | Brasil/SIN | eólica + solar centralizadas no caso | ONS PAR/PEL 2025; cenário |
| 65,3 | GW | 2029 | Brasil/SIN | MMGD no caso | ONS PAR/PEL 2025; cenário |
| 94 | % | 2025 | China | taxa média nacional de utilização eólica | NEA; não converter automaticamente em curtailment |
| 95 | % | 2025 | China | taxa média nacional de utilização fotovoltaica | NEA; mesma cautela |
| 1,13 | trilhão kWh | 2025 | China | geração eólica | NEA |
| 1,17 | trilhão kWh | 2025 | China | geração fotovoltaica | NEA |
| 5.700 | GWh | 2025, até 25/dez | Chile/SEN | reduções de geração renovável | Coordinador; preliminar |
| 5.640 | GWh | 2024 | Chile/SEN | reduções de geração renovável | Coordinador |
| 627.440 | MWh | 2024 | Irlanda | curtailment eólico | EirGrid; metodologia do SEM, não comparar diretamente |
| 32.006 | MWh | 2024 | Irlanda | curtailment solar | EirGrid; mesma cautela |

## Divergências metodológicas

- ONS: cenários horários prospectivos e potência de corte em instantes críticos.
- Chile: energia renovável reduzida acumulada, em GWh, segundo registros do operador.
- China: taxa de utilização calculada segundo metodologia nacional.
- IEA: compilação internacional de energia técnica restringida/constrained, com cobertura e períodos diferentes; exclui certos despachos econômicos/mercantis.
- “Restrição”, “constrained-off”, “reducción” e “utilização” não formam uma estatística internacional harmonizada.
- Irlanda separa *constraint* (local) de *curtailment* (sistêmico), enquanto Alemanha e Grã-Bretanha publicam categorias mais amplas de redispatch; os nomes não são intercambiáveis.
- CAISO publica tanto MW máximos quanto MWh acumulados, mas isso não harmoniza automaticamente suas regras de despacho com as de outros mercados.

## Afirmações que ainda exigem auditoria antes de publicar

1. Fórmula integral e escopo da taxa chinesa de utilização.
2. Eventuais atos complementares à Portaria MME nº 140/2026 e o estágio operacional dos termos de compromisso na data de publicação.
3. Cobertura exata do dado chileno de dezembro de 2025 e eventual fechamento anual revisado.
4. Qualquer total histórico brasileiro de GWh/TWh: deve ser calculado somente a partir das séries oficiais completas, com versão e metodologia registradas.
5. O número de 452 GW de capacidade renovável adicionada pela China em 2025, citado no briefing, não foi necessário para a tese e não deve entrar sem confirmação oficial específica.
6. Consolidar uma série oficial comparável para Dinamarca e verificar em fonte original o detalhe estatístico japonês antes de qualquer uso quantitativo.

## Limitações

- Dados de potencial renovável dependem de modelos contrafactuais.
- Razões podem ser reclassificadas conforme metodologia e ordem de aplicação dos limites.
- Projeções do ONS não abrangem todo gargalo local possível e dependem de premissas de expansão.
- Dados de MMGD têm observabilidade inferior à geração supervisionada.
- Séries internacionais não são diretamente comparáveis.
- Análises anuais escondem concentração horária e regional.
- Curtailment técnico e despacho econômico podem aparecer separados ou combinados conforme o mercado.

## Fontes consultadas

### Brasil

- ONS, PAR/PEL 2025: https://www.ons.org.br/Paginas/energia-no-futuro/suprimento-eletrico/parpel2025/sumario-executivo/index.aspx
- ONS, diagnóstico de curtailment: https://www.ons.org.br/AcervoDigitalDocumentosEPublicacoes/RT%20DGL-ONS%200189-2025%20-%20GT%20Curtailment%20rev1.pdf
- ONS, dados abertos fotovoltaicos: https://dados.ons.org.br/dataset/restricao_coff_fotovoltaica
- EPE, Recursos Energéticos Distribuídos: https://www.epe.gov.br/pt/areas-de-atuacao/economia-da-energia/efici%C3%AAncia-energ%C3%A9tica-e-recursos-energ%C3%A9ticos-distribu%C3%ADdos/recursos-energeticos-distribuidos-red
- EPE, PNE 2055, versão de consulta pública: https://www.epe.gov.br/sites-pt/publicacoes-dados-abertos/publicacoes/PublicacoesArquivos/publicacao-865/topico-844/PNE%202055_Caderno%20S%C3%ADntese_Fevereiro%202026_Vers%C3%A3o%20Consulta%20P%C3%BAblica.pdf
- ANEEL, MMGD: https://www.gov.br/aneel/pt-br/assuntos/geracao-distribuida/
- MME, Portaria nº 140/2026 e procedimentos do termo de compromisso: https://www.gov.br/mme/pt-br/assuntos/noticias/mme-regulamenta-procedimentos-para-celebracao-de-termo-de-compromisso-sobre-compensacao-por-cortes-de-geracao
- Lei nº 15.269/2025: https://presidencia.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15269.htm

### Multilaterais

- IEA, Renewables 2025: https://www.iea.org/reports/renewables-2025/renewable-electricity
- IEA, Electricity 2026 — Flexibility: https://www.iea.org/reports/electricity-2026/flexibility
- IEA, Electricity 2026 — Grids: https://www.iea.org/reports/electricity-2026/grids
- IEA, The Value of Demand Flexibility: https://www.iea.org/reports/the-value-of-demand-flexibility

### China — fontes originais

- NEA, operação eólica e fotovoltaica em 2025: https://www.nea.gov.cn/20260212/742b8c6a078347b0b39de676c05c5d58/c.html
- NEA, metodologia/taxa de utilização: https://hunb.nea.gov.cn/xxgk/zcfg/202510/P020251015318419186107.pdf
- NEA, política de metas provinciais: https://www.nea.gov.cn/20250818/d3e15c2472a6496f97a8ddee90103c57/c.html

### Chile

- Coordinador Eléctrico Nacional, reducciones ERV 2025: https://www.coordinador.cl/operacion/documentos/reducciones-de-generacion-renovable/reducciones-erv-2025/
- Coordinador, balance preliminar de 2025: https://www.coordinador.cl/wp-content/uploads/2026/03/2025-12-29-CONFERENCIA-DE-PRENSA.pdf

### Outros sistemas consultados

- AEMO, Enhanced Locational Information 2025: https://aemo.com.au/-/media/files/electricity/nem/planning_and_forecasting/enhanced-locational-information/2025/2025-enhanced-locational-information-report.pdf
- AEMO, Quarterly Energy Dynamics: https://www.aemo.com.au/energy-systems/major-publications/quarterly-energy-dynamics-qed
- CAISO, Daily Renewable Report: https://www.caiso.com/documents/daily-renewable-report-jul-21-2025.html
- EirGrid, Annual Renewable Constraint and Curtailment Report 2024: https://cms.eirgrid.ie/annual-renewable-constraint-and-curtailment-report-2024
- Bundesnetzagentur, dados de congestionamento no SMARD: https://www.bundesnetzagentur.de/SharedDocs/Pressemitteilungen/EN/2024/20240517_Redispatch.html
- Bundesnetzagentur, “Use, don’t curtail 2.0”: https://www.bundesnetzagentur.de/SharedDocs/Pressemitteilungen/EN/2024/20240701_13k.html
- NESO, Constraints Collaboration Project: https://www.neso.energy/industry-information/balancing-services/constraints-collaboration-project
- Red Eléctrica, Servicios de ajuste: https://www.ree.es/es/operacion/garantia-suministro/servicios-ajuste
- OCCTO, Business Plan FY2025: https://www.occto.or.jp/assets/en/about_occto/articles/files/Business_Plan_FY2025.pdf

### Literatura acadêmica

- *Curtailment of renewable generation: Economic optimality and incentives*, Energy Policy: https://www.sciencedirect.com/science/article/pii/S030142151200585X
