# ART-014 — Auditoria factual das figuras informativas

Escopo: auditoria do texto incorporado às duas figuras informativas recebidas. A Hero `Cidade Ampliada e Definida.png` não contém afirmações textuais e foi tratada apenas como imagem editorial conceitual.

## Figura 2 — `Fluxo de Eletricidade Isom_trico.png`

### Veredito

**APROVADA COM CORREÇÕES.** A sequência geração → transmissão → distribuição é adequada como introdução, mas a versão atual simplifica em excesso os níveis de tensão, usa “energia” onde as setas representam mais precisamente fluxo de potência e sugere bidirecionalidade automática para bateria e veículo elétrico.

### Correções necessárias no texto incorporado

| Texto atual                                                        | Texto recomendado                                                              | Motivo                                                                                                                 |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `DISTRIBUIÇÃO / MÉDIA TENSÃO`                                      | `DISTRIBUIÇÃO / REDES LOCAIS`                                                  | No Brasil, as redes de distribuição abrangem alta, média e baixa tensão; distribuição não é sinônimo de média tensão.  |
| `LINHAS DE ALTA TENSÃO / TRANSMISSÃO EFICIENTE`                    | `LINHAS DE ALTA TENSÃO / TRANSMISSÃO`                                          | “Eficiente” é uma conclusão não demonstrada pela imagem.                                                               |
| `SUBESTAÇÃO INTELIGENTE / TRANSIÇÃO E CONTROLE`                    | `SUBESTAÇÃO / TRANSFORMAÇÃO, PROTEÇÃO E CONTROLE`                              | “Transição” não descreve uma função da subestação; transformação, proteção e controle são termos técnicos apropriados. |
| `FLUXO DE ENERGIA (GERAÇÃO → CONSUMIDOR)`                          | `FLUXO DE POTÊNCIA — REPRESENTAÇÃO SIMPLIFICADA`                               | A figura representa direção instantânea do fluxo elétrico, não energia acumulada ao longo do tempo.                    |
| `FLUXO DE ENERGIA (DISTRIBUIÇÃO)`                                  | `FLUXO DE POTÊNCIA NA DISTRIBUIÇÃO`                                            | Mesma correção terminológica.                                                                                          |
| `FLUXO BIDIRECIONAL (ARMAZENAMENTO E GERAÇÃO LOCAL)`               | `FLUXO BIDIRECIONAL POSSÍVEL (GERAÇÃO LOCAL E ARMAZENAMENTO)`                  | A bidirecionalidade depende da conexão, dos conversores, das proteções, das regras e do modo de operação.              |
| `CARREGADOR VEICULAR ELÉTRICO` associado a setas nos dois sentidos | `RECARGA DE VEÍCULO ELÉTRICO` e nota `fluxo reverso somente quando habilitado` | A maioria dos carregadores opera apenas da rede para o veículo; V2G/V2H não é automático.                              |

### Nota HTML recomendada

> Esquema conceitual do sistema elétrico. Níveis de tensão, topologia e sentidos de fluxo variam conforme a rede e as condições de operação. Geração local, baterias e veículos só injetam potência quando equipamentos, conexão e regras aplicáveis permitem.

## Figura 3 — `Grade de Solu_es Energ_ticas.png`

### Veredito

**CORRIGIR.** As seis opções são válidas como exemplos, mas não constituem uma lista completa nem garantem, isoladamente, sustentabilidade, confiabilidade ou aumento de capacidade. A figura também usa “recondicionamento” no lugar do termo técnico “recondutoramento” e não representa diretamente DLR, FACTS ou outras GETs centrais ao artigo.

### Correções necessárias no texto incorporado

| Texto atual                                                                                      | Texto recomendado                                                                                                      | Motivo                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `6 SOLUÇÕES PARA UM FUTURO ELÉTRICO SUSTENTÁVEL`                                                 | `6 FERRAMENTAS COMPLEMENTARES PARA MODERNIZAR A REDE`                                                                  | Evita apresentar uma seleção não exaustiva como receita suficiente ou garantia de sustentabilidade.                                                                                     |
| `Expansão da infraestrutura para atender à crescente demanda de energia.`                        | `Expansão da infraestrutura para conectar geração e cargas, ampliar intercâmbios e atender ao crescimento da demanda.` | Redes atendem potência, conexão, intercâmbio e confiabilidade, não apenas crescimento genérico de “energia”.                                                                            |
| `RECONDICIONAMENTO DE CONDUTORES`                                                                | `RECONDUTORAMENTO DE LINHAS`                                                                                           | É o termo técnico para substituição de condutores de linhas existentes.                                                                                                                 |
| `Substituição de condutores em linhas existentes para aumentar a capacidade e a confiabilidade.` | `Substituição de condutores para ampliar a capacidade quando estruturas, isolação e subestações forem compatíveis.`    | O ganho é condicionado e confiabilidade não aumenta automaticamente.                                                                                                                    |
| `Sistemas de baterias em contêineres para armazenar energia limpa e equilibrar a rede.`          | `Baterias podem deslocar injeções e retiradas no tempo e prestar serviços ao sistema.`                                 | Eletricidade armazenada não possui origem “limpa” intrínseca; função e resultado dependem da operação.                                                                                  |
| `GÊMEOS DIGITAIS DE SUBESTAÇÕES`                                                                 | `TECNOLOGIAS PARA MELHOR USO DA REDE (DLR, CONTROLE DE FLUXO E TOPOLOGIA)`                                             | Alinha a síntese às tecnologias auditadas e ao núcleo do artigo. Se gêmeos digitais forem mantidos, devem ser apresentados como ferramenta de apoio, não substituto dessas tecnologias. |
| `Modelos virtuais para monitoramento, análise e otimização em tempo real.`                       | `Dados e modelos apoiam monitoramento, simulação e decisões operacionais.`                                             | Nem todo gêmeo digital executa otimização em tempo real.                                                                                                                                |
| `MEDIDORES INTELIGENTES E RESPOSTA À DEMANDA`                                                    | `MEDIÇÃO AVANÇADA E RESPOSTA DA DEMANDA`                                                                               | Medidores são infraestrutura habilitadora; resposta da demanda exige tarifas, programas, automação ou comando.                                                                          |
| `Medição inteligente e participação ativa dos consumidores para equilibrar o sistema.`           | `Medição, sinais e automação podem permitir deslocar ou reduzir consumo quando necessário.`                            | Evita afirmar que o medidor, por si, equilibra o sistema.                                                                                                                               |
| `INTERCONEXÃO DE REDES TRANSFRONTEIRIÇAS`                                                        | `INTERLIGAÇÕES REGIONAIS E TRANSFRONTEIRIÇAS`                                                                          | Interligações relevantes também ocorrem dentro de países e nem todo sistema possui fronteira elétrica internacional.                                                                    |
| `Integração de redes entre países para promover eficiência, segurança e sustentabilidade.`       | `Interligações coordenadas podem compartilhar recursos, reservas e diversidade entre regiões.`                         | Benefícios dependem de coordenação, capacidade disponível e regras; não são garantidos.                                                                                                 |

### Nota HTML recomendada

> Portfólio ilustrativo e não exaustivo. Cada ferramenta atua sobre restrições diferentes; os benefícios dependem da localização, do projeto, das contingências, da compatibilidade dos equipamentos e das regras do sistema. DLR, FACTS, armazenamento, resposta da demanda e expansão física não são substitutos universais entre si.

## Hero — `Cidade Ampliada e Definida.png`

**APROVADA COMO REPRESENTAÇÃO EDITORIAL CONCEITUAL.** A imagem combina geração, transmissão, subestações e centro de carga sem afirmações quantitativas. A legenda não deve identificar uma cidade ou sistema real, nem sugerir que toda infraestrutura representada pertença à mesma rede ou que a simples coexistência dos ativos prove integração adequada.
