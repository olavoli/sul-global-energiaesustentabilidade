# ART-038 — Saneamento final

Data: 20 de novembro de 2026. Autorização: mensagem do responsável editorial nesta conversa para correções e publicação condicionada aos gates.

## Correções comprovadas

- Referências 2, 3, 7–10 e 17 individualizadas com documentos/páginas oficiais; referência 18 ligada ao capítulo específico. Fontes válidas preservadas; 22 referências, sem renumeração.
- Lei 14.990: 27/09/2024, DOU 30/09/2024. Lei estadual 19.062: DOE 02/10/2024.
- EPE: 86,8% em 2025, corrigindo 86,6% do manuscrito.
- 52 kWh/kg preservado como hipótese ilustrativa e meta de sistema alcalino do DOE. Corrigida a exclusão genérica de BOP; fronteiras devem evitar dupla contagem. O Record 24005 do DOE trata de PEM e não é origem da meta alcalina de 52.
- Percentual 70–80% do OPEX não comprovado: substituído por ressalva sobre preço da eletricidade e regime de operação; argumento econômico preservado.
- WEG adicionada; demais oito tags mantidas.

## Proveniência e licença

Uso editorial autorizado pelo responsável que forneceu a imagem; geração no Pippit com Seedream 4.0 e logotipo inserido no Microsoft PowerPoint. Sujeito aos Termos de Serviço do Pippit e às condições dos materiais e direitos de terceiros aplicáveis; não se presume exclusividade autoral. Condições consultadas em 20 de novembro de 2026: https://www.pippit.ai/clause/terms-of-service e https://www.pippit.ai/blog/ai-image/what-is-ai-image-licensing

Hero e infográficos originais sem alteração de bytes. Nota de Transparência preservada literalmente. Não se afirma exclusividade de direitos de imagem gerada por IA. A autorização editorial não substitui direitos de terceiros.

## Conflitos de interesse

Avaliação documental registrada no briefing privado; não se presumiram vínculos, patrocínios ou sua inexistência, nem declaração humana não fornecida. Fontes corporativas identificadas e limitadas ao escopo dos fatos que divulgam.

## Limitações

Bloqueios de consulta automatizada de fontes não são prova de link inexistente. Marinha e IRENA preservadas; fontes institucionais verificadas por conteúdo oficial acessível e documentos/indexação disponíveis. Não houve inferências pagas nem execução social.

## Validações do release

- Gate de pesquisa: ready-for-writing, sem perguntas abertas; avaliação documental e limitações registradas no briefing privado, não publicado no repositório público.
- Fluxo oficial: draft/review-ready → review → approved → published, autorizado pelo responsável nesta conversa.
- Publish-check em configuração oficial de produção: zero erros e zero avisos para o ART-038. Os 27 avisos globais pertencem a outros conteúdos/demos, sem alteração neste release.
- MDX, integridade de imagens, TypeScript e build de produção aprovados. Testes focados: 27 aprovados, 2.141 verificações.
- Lint da main passou; lint do código do release passou. Arquivos gerados locais de dry-run em .wrangler explicam a execução global inconclusiva anterior; foram excluídos apenas da execução local, sem alteração de regras de CI.
- A falha de campaigns.test.ts:86 (1/0) foi reproduzida na main 549b1bd, sem ART-038. Nenhuma alteração no experimento, dependências ou runtime; a suíte integral e o CI obrigatório permanecem necessários.
- EN/ES: somente cartões de descoberta manualmente adaptados com destino ao português; nenhuma tradução completa fictícia, inferência, publicação ou envio social.

A publicação remota depende de quality e visual aprovados no commit final, merge permitido e controles oficiais de produção. Nenhum gate foi desativado.

Comparação adicional: editorial-policy.test.ts:120 falha na main e no release no Windows por exigir literalmente test-results/ quando o caminho nativo contém barras invertidas. Código e teste não foram alterados pelo ART-038. URLs diretas saneadas (2, 3, 7–10, 17) responderam HTTP 200; bloqueios de automação e TLS das demais fontes estão registrados em links-saneados.json. O CI Linux obrigatório deverá ser aprovado antes do merge.
