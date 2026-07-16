# Curadoria de fontes públicas

## Escopo do piloto

Em 15 de julho de 2026 foi realizada pesquisa pública controlada, restrita a páginas oficiais de feeds, documentação e políticas de uso. Não houve scraping de matérias, tentativa de caminhos, acesso a paywall, download de imagens, tradução, geração de texto ou publicação. O alvo era pequeno e deliberadamente conservador: somente fontes demonstravelmente aptas seriam ativadas.

Cada análise possui dossiê JSON versionado em `newsroom/sources/evidence/`. A ativação transacional exige decisão `confirmed`, titularidade do feed, URL exatamente correspondente, HTTPS no domínio oficial, termos e copyright revisados e limitações explícitas. Mudança de URL exige novo dossiê.

## Catálogo ativo

| Fonte                       | Feed oficial                                             | Tipo       | Confiança | Saúde inicial              | Limites                                                        |
| --------------------------- | -------------------------------------------------------- | ---------- | --------- | -------------------------- | -------------------------------------------------------------- |
| MIT News — Renewable Energy | `https://news.mit.edu/topic/mitrenewable-energy-rss.xml` | university | primary   | healthy, cerca de 50 itens | 20 itens/execução; snippet; sem imagem ou texto integral       |
| NASA Technology             | `https://www.nasa.gov/technology/feed/`                  | official   | primary   | healthy, cerca de 10 itens | 20 itens/execução; snippet; sem imagem, logo ou texto integral |

`primary` significa fonte primária sobre a própria instituição, não confirmação independente. O catálogo tem duas fontes porque as demais candidatas não cumpriram todos os gates; a cobertura geográfica ainda é insuficiente.

## Fontes não ativadas

| Candidata                   | Decisão      | Motivo                                                          |
| --------------------------- | ------------ | --------------------------------------------------------------- |
| IRENA News                  | needs-review | feed válido, mas termos públicos proíbem meios automatizados    |
| gov.br Energia              | rejected     | endpoint oficial redirecionou para autenticação, sem RSS válido |
| DOE Energy News             | rejected     | URL testada respondeu HTML                                      |
| Agência FAPESP              | rejected     | URL RSS publicada usa HTTP e redirecionou à homepage HTML       |
| Asian Development Bank News | rejected     | feed HTTP em domínio terceiro FeedBurner                        |
| EPE Notícias                | rejected     | nenhuma URL RSS/Atom explícita localizada                       |

Outras páginas institucionais consideradas sem URL de feed comprovada não entraram no catálogo. Sitemap não é feed. Ausência de termos ou copyright leva a `needs-review`; incompatibilidade leva a `rejected`.

## Coleta piloto e amostra

O cadastro foi executado por `newsroom:source:add`, em dry-run e `--apply`. Depois de health check aplicado, a coleta manual executou dry-run e aplicação explícita com `--all --confirm-all`, recebendo 20 itens MIT e 10 NASA, sem rejeições ou duplicatas na primeira execução. Somente feeds foram requisitados.

Três itens MIT foram abertos com `newsroom:review`, sem transição de estado. Títulos, datas, autores, categorias, snippets e links estavam presentes; nenhum texto integral ou imagem foi armazenado. A amostra revelou falso positivo de `Asia` dentro do sobrenome `Asiamigbe`; a regra passou a exigir limite de palavra e ganhou teste de regressão. Os itens permanecem `scored`, sem briefing ou publicação.

Após o recálculo auditável, o falso positivo caiu de `priority` para `monitor` (score 34). Itens NASA sem evidência temática no próprio título, categorias ou snippet caíram para `archive` (scores 0–5); o prior temático da fonte, isoladamente, não evita a penalidade de irrelevância.

## Limitações e continuidade

- cobertura atual concentrada nos Estados Unidos e em inglês;
- duas fontes são insuficientes para confirmação cruzada e diversidade regional;
- sinais da própria fonte são contexto fraco, não prova temática;
- fontes institucionais podem ter viés institucional;
- não há agendamento automático;
- expansão exige nova curadoria pública, revisão humana e evidência versionada.

Próximo passo: buscar feeds oficiais aptos no Brasil, América Latina, África e Ásia, sem reduzir os gates jurídicos e técnicos.
