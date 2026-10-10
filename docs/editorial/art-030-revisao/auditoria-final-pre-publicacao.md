# ART-030 — auditoria final local, 10/10/2026

Registro histórico da auditoria visual. A pendência de origem/base de uso das imagens e a frase de rascunho na transparência foram posteriormente resolvidas em [Proveniência e base documental](proveniencia-e-termos-imagens.md). Os demais resultados visuais permanecem aplicáveis; as capturas mostram a transparência anterior.

Resultado: conteúdo e integração local consistentes; publicação ainda bloqueada pela comprovação dos direitos de uso das imagens e pela aprovação editorial final. O artigo permanece `draft`, sem `approvedAt` ou `publishedAt`.

## Método e limites

Foi compilado o MDX real com `remark-frontmatter` e `remarkEditorialSlots`, usando os componentes editoriais existentes, o CSS do build e as classes de largura/tipografia do layout de artigo. A composição temporária foi servida apenas em `127.0.0.1:4174`, com `noindex,nofollow`, e encerrada ao final. Nenhuma rota ou componente global foi modificado.

A prévia representa o conteúdo editorial; não é a rota pública nem uma reprodução integral do cabeçalho, byline, TTS, compartilhamento, comentários ou rodapé do portal. A data mostrada na prévia é explicitamente a de criação, não publicação. As imagens foram carregadas antecipadamente apenas nessa composição para impedir capturas vazias por lazy loading. O comportamento real de lazy loading continua inalterado.

Viewports: 1440 × 1000 e 390 × 844 CSS px. O navegador reserva 15 px para a barra vertical; a largura útil móvel medida foi 375 px. Capturas JPEG são evidência de composição, não uma medição da nitidez do PNG original.

## Conteúdo e componentes

- Manuscrito V3 preservado, comprovado pelos testes de parágrafos/células e pelo hash da cópia canônica. Não houve edição editorial nesta auditoria.
- Um `KeyPoints`, exatamente cinco itens; uma `EditorialTable`, três colunas e seis linhas de comparação; um `Callout` intitulado “O Paradoxo da Eficiência”.
- Exemplo explicitamente hipotético: 1 MW térmico efetivamente aproveitado × 15% de eficiência elétrica líquida = 150 kW elétricos. Potência distinguida de energia; auxiliares e limites do exemplo preservados.
- Cinco referências estruturadas e cinco destinos de citação coerentes: DOE/calor residual; Quoilin et al./ORC; Akasaka, Zhou e Lemmon/NIST/R245fa; DOE/geotermia; OpenStax/Carnot. Uma única seção de fontes.
- Uma Nota de Transparência pelo componente existente. As legendas e os textos alternativos não repetem avisos individuais sobre IA.

## Inspeção visual

| Elemento | Resultado |
| --- | --- |
| Título e subtítulo | Quebras naturais nos dois tamanhos; sem corte ou sobreposição. |
| Parágrafos, pontos-chave e Callout | Texto legível, sem transbordamento; nenhuma sobreposição entre blocos consecutivos. Maior intervalo entre blocos do corpo móvel: aproximadamente 40 px. |
| Hero | Original 2848 × 1600; renderização desktop 896 × 503,36 px e móvel 343,2 × 192,8 px. Proporção preservada; sem corte. |
| Imagem 1 | Original 941 × 1672; desktop 621 × 1103,41 px, móvel 343,2 × 609,8 px; `object-fit: contain`, sem corte. |
| Imagem 2 | Original 1024 × 1536, proporção 2:3 do arquivo aprovado; desktop 621 × 931,5 px, móvel 343,2 × 514,8 px; `contain`, sem corte ou deformação. Não foi convertida artificialmente em 9:16. |
| Legendas e referências | Quebram dentro da coluna; título químico longo também cabe. Sem duplicação de referências. |
| Tabela | Rolagem confinada à região acessível e focável. Conteúdo mínimo de 640 px; região desktop de 619 px e móvel de 342 px. Há pequena rolagem interna também no desktop, decorrente do componente existente. |
| Página | Sem rolagem horizontal: `scrollWidth` igual a `clientWidth` nos dois tamanhos. Nenhum `h1`, `h2`, parágrafo ou legenda com overflow horizontal. |
| Contraste | Cores computadas em tema claro: texto/fundo ≈ 11,56:1 e texto secundário/legendas sobre fundo ≈ 6,96:1. A medição não certifica cada texto rasterizado dos infográficos nem o tema escuro. |

Os infográficos carregaram integralmente, com dimensões naturais corretas. A sequência principal da Imagem 1 e o acoplamento mecânico do gerador são coerentes com o texto. A Imagem 2 apresenta exemplos de aplicações, sem manômetros, gráfico de saturação ou valores universais de pressão/temperatura. As legendas qualificam as condições como dependentes do projeto. São ilustrações didáticas, não provas de instalações existentes.

Ressalva: os textos incorporados nas imagens são pequenos na apresentação móvel, especialmente a comparação em duas colunas da Imagem 2. Diagramas e cores continuam distinguíveis, mas a leitura detalhada exige ampliação. Classificação: não bloqueante para compreensão do artigo, pois as informações essenciais estão no corpo HTML, tabela, alt e legendas; recomendação de melhoria antes da publicação. Não foi implementado zoom nem alterada arte.

## Metadados

| Campo | Valor auditado |
| --- | --- |
| Título e SEO title | A máquina que transforma calor desperdiçado em eletricidade |
| Descrição SEO | Entenda como o Ciclo Rankine Orgânico recupera calor, seu circuito fechado e por que a eficiência e a viabilidade dependem de cada projeto. |
| Slug | `a-maquina-que-transforma-calor-desperdicado-em-eletricidade` |
| Tipo/categoria | `explainer` / `energia` |
| Autoria | `olavo-oliveira`, cadastro existente de Olavo Oliveira |
| Criação | 2026-10-10; verificação de fontes 2026-10-09 |
| Publicação/aprovação | Ausentes, corretamente para rascunho |
| Canonical cadastrado | `/artigo/a-maquina-que-transforma-calor-desperdicado-em-eletricidade` |
| Canonical com base de produção | `https://sulglobalenergia.com.br/artigo/a-maquina-que-transforma-calor-desperdicado-em-eletricidade` |
| Compartilhamento previsto | OG article; título/descrição/canonical acima; hero 2848 × 1600, alt descritivo; Twitter `summary_large_image` |

A geração de canonical/OG/Twitter foi conferida no código existente e pelos testes de SEO. O rascunho não tem um head público de artigo publicado: a rota rejeita sua consulta por slug antes de gerar esses metadados. Portanto não se afirma que seus metadados de publicação foram observados em uma resposta pública. Categoria, autoria e data efetiva de publicação ainda dependem da aprovação editorial normal.

A Nota de Transparência contém a frase “A versão local permanece em rascunho, aguardando revisão editorial final.” É correta agora, mas deverá ser revisada no procedimento autorizado de publicação para não permanecer desatualizada.

## Exclusão pública

Os testes executaram o repositório com `allowDemo=false` e `true`: o ART-030 não aparece em listagem, categoria, autor, busca, consulta pública por slug, sitemap ou RSS. A rota real usa esse repositório e lança `notFound` quando o artigo não é encontrado. Nenhum status foi alterado para viabilizar a auditoria visual.

## Proveniência e direitos

Todas as artes foram fornecidas pelo proprietário na pasta local `Downloads/000000000001 Imagens Sul Global/ART 030`. A origem como imagens geradas por IA foi informada na preparação editorial e é declarada na transparência. Não há comprovação suficiente de ferramenta/conta de geração, termos aplicáveis ou autorização específica de uso; não se atribuiu fotógrafo, instalação, empresa ou licença.

| Arquivo integrado | Material recebido | Dimensões | Bytes |
| --- | --- | --- | ---: |
| `art-030-hero.png` | `Hero - orc_fabrica_skyline_alta_densa.png` | 2848 × 1600 | 7.667.729 |
| `art-030-funcionamento.png` | `Imagem 1 - Infográfico do Ciclo Rankine Orgânico (ORC).png` | 941 × 1672 | 1.949.622 |
| `art-030-comparativo.png` | `Imagem 2 - Rankine Convencional vs ORC_ Comparação Industrial.png` | 1024 × 1536 | 2.493.591 |

Os hashes de integridade das três versões são fixados no teste do ART-030. A hero foi preservada sem recompressão. O campo `cover.license` permanece `pending`; o gerador emite aviso correspondente. **Bloqueante:** registrar a base verificável de direito de uso das três artes antes de publicação, sem inventar licença.

**Não bloqueante, prioridade de desempenho:** os três PNG totalizam 12.110.942 bytes e não possuem variantes responsivas. A hero tem 7,67 MB. As dimensões explícitas estabilizam a geometria, mas não eliminam custo de download/LCP. Eventual criação de variantes requer etapa autorizada que preserve o PNG original.

## Validações desta rodada

- Testes pertinentes: 44 aprovados, 0 falhas, 337 expectativas, cinco arquivos (ART-030, slots editoriais, mídia/acessibilidade, transparência e SEO).
- Typecheck: aprovado.
- Lint de teste ART-030 e índices gerados: aprovado. Não foi executada manutenção ou varredura global de `.agents`.
- Build: aprovado; 43 artigos, 27 avisos editoriais, 0 erros. O aviso específico do ART-030 é licença pendente; os demais avisos são conteúdo demo preexistente. Avisos de ferramentas/build não foram corrigidos fora do escopo.
- `git diff --check`: aprovado.

## Capturas

- [Desktop completo, 1440 px](auditoria-visual/desktop-1440.jpg)
- [Celular completo, 390 px](auditoria-visual/celular-390.jpg)
- [Topo desktop](auditoria-visual/desktop-topo.jpg)
- [Topo celular](auditoria-visual/celular-topo.jpg)
- [Infográfico 1 no celular](auditoria-visual/celular-infografico-1.jpg)
- [Infográfico 2 no celular](auditoria-visual/celular-infografico-2.jpg)
- [Tabela desktop](auditoria-visual/desktop-tabela.jpg)
- [Tabela celular](auditoria-visual/celular-tabela.jpg)
- [Callout desktop](auditoria-visual/desktop-callout.jpg)
- [Fontes e transparência no celular](auditoria-visual/celular-referencias.jpg)

## Conclusão e escopo preservado

Nenhuma falha de compilação, perda de conteúdo V3, deformação de imagem, sobreposição ou vazamento do rascunho nas consultas públicas foi encontrada. A autorização editorial final e os direitos de imagem continuam pendentes; a integração não deve ser publicada ainda. Também se recomenda resolver a legibilidade raster móvel e o custo das imagens na próxima etapa autorizada.

Nesta rodada foram acrescentados somente este relatório e capturas locais. Não foram editados o MDX, o teste, as imagens ou componentes; os índices foram regenerados pelos comandos normais de validação. Artigos publicados, configurações, produção e `artifacts/` não foram tocados. Sem commit, push ou deploy.
