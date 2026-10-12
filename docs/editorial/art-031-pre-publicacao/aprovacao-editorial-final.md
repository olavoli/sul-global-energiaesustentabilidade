## Aplicação da aprovação proporcional

A implementação mínima no gate existente foi autorizada pelo responsável.
A decisão já registrada foi aplicada pelo fluxo oficial: draft → review → approved.
O briefing guarda responsável, data, justificativa geral e justificativas por risco.
Não é uma confirmação de revisão humana integral nem uma licença presumida.
O mecanismo agora suporta a decisão documentada, preservando os registros anteriores
como histórico. O artigo permanece fora da distribuição até published e deploy.

# ART-031 — decisões humanas para liberação

Estado: draft. Decisões editoriais e proveniência registradas; preparação da publicação ainda condicionada ao gate oficial, descrito abaixo. Sem deploy ou newsletter.

## Aceitação editorial de riscos residuais — 12/10/2026

O responsável editorial reafirmou a aprovação do ART-031 e aceitou os riscos
residuais conhecidos: conferência documental assistida por IA sem confirmação
de revisão humana integral das 22 referências; imagens com origem declarada
ChatGPT; representação ilustrativa do símbolo do SUS, sem atribuir chancela
institucional; e ausência de declaração pública genérica individual de conflitos.
Relações comerciais diretamente ligadas ao conteúdo continuam sujeitas à divulgação.
A Nota de Transparência e a aprovação anterior permanecem inalteradas.

Essa aceitação não comprova conferência concluída, licença de terceiro, autorização
institucional ou inexistência de vínculos específicos; não substitui exigência legal.
Não foram identificadas novas evidências de erro que justifiquem reabrir pesquisa.

### Resultado da inspeção do mecanismo de exceções

O fluxo operacional atual **não implementa exceção por artigo**. A documentação
não prevê waiver/override, e a CLI não aceita parâmetro para tal exceção.
A decisão acima fica registrada como aceitação editorial, não como conformidade
com os gates técnicos nem como exceção operacional executada.

Travas exatas:

1. `scripts/editorial-operations.ts`, `prepareStatusChange`: draft → review exige
   `researchReport.readyForWriting === true`; depois exige
   `draftStage: review-ready` e `reviewArticle` sem bloqueadores.
2. `scripts/research-operations.ts`, `evaluateResearch`: exige confirmedSources
   não vazio, todos os factChecks confirmed com URLs, openQuestions vazio e
   researchStatus ready-for-writing. Os campos atuais preservam honestamente
   a falta de confirmação; aprovação editorial não muda esses fatos.
3. `scripts/editorial-operations.ts`, `reviewArticle`: rejeita
   `cover.license` ausente, unknown ou pending. Origem ChatGPT é proveniência,
   não uma licença de banco de imagens. Não foi inventada licença para satisfazer
   essa comparação.

Menor alteração legítima para acomodar a decisão sem falsificação: acrescentar
um mecanismo de exceção editorial explícita, limitado ao ART-031 e a esses
bloqueios documentais, com responsável, motivo, data e riscos aceitos. Ele deve
preservar factChecks e confirmedSources, registrar que o fluxo passou por
exceção e manter os demais controles (schema, autoria verificada, fontes não-demo,
transições, datas, transparência e patrocínio aplicável). Exigiria alteração
pontual da CLI, teste de isolamento e documentação operacional; nenhuma dessas
alterações foi feita ou considerada implicitamente autorizada nesta rodada.
Não é legítimo editar status diretamente para contornar o fluxo ou transformar
os campos pendentes em confirmação fictícia.

## Decisão específica do ART-031 — 12/10/2026

Responsável designado pela conferência factual e editorial: **Olavo Oliveira**.
Olavo Oliveira é o responsável pela conferência e pelo conteúdo, conforme decisão expressa do responsável editorial. A aprovação foi concedida **sem confirmação de conferência humana integral das 22 referências**. Não foi registrada conclusão dessa revisão nem confirmados direitos de terceiros ou ausência de conflitos.

## Nota de Transparência aprovada pelo responsável

> Este artigo foi desenvolvido com apoio de ferramentas de inteligência artificial na organização editorial, pesquisa assistida e produção de imagens e infográficos. A seleção das fontes, as interpretações apresentadas e a responsabilidade pelo conteúdo publicado pertencem à autoria e à equipe editorial do Sul Global Energia e Sustentabilidade.

A redação foi aprovada explicitamente nesta conversa, exclusivamente para o ART-031.
Diverge do modelo permanente de `docs/AI_EDITORIAL_POLICY.md`: descreve apoio
em organização editorial, pesquisa assistida e produção visual, atribui responsabilidade
à autoria e à equipe editorial e não declara que todo o conteúdo factual foi
verificado, expandido e editado por Olavo Oliveira. A política global permanece
inalterada. A redação permanece aprovada. A decisão posterior autoriza o avanço editorial,
sem confirmar revisão factual humana integral. A preparação da publicação depende
do gate oficial, sem presumir conferência concluída ou licença inexistente. Não se aplica a outros artigos.

## Checklist de decisões registradas — encerramento desta rodada

- [x] Aprovação editorial expressa preservada; Olavo Oliveira responsável pela conferência e pelo conteúdo.
- [x] Mantido o registro de que não foi confirmada conferência factual humana integral das 22 referências.
- [x] Nota de Transparência e créditos aprovados preservados.
- [x] Origem das quatro imagens declarada pelo responsável: geração por ChatGPT, com edição para publicação.
- [x] Orientação comercial registrada: monetização geral do portal não constitui conflito automático.
- [x] Dispensada declaração pública genérica individual no ART-031; isso não declara inexistência de vínculos específicos.
- [x] Mantida a divulgação de patrocínio, pagamento, parceria ou interesse diretamente relacionado ao artigo quando houver.
- [x] Avaliação documental dos símbolos registrada abaixo; nenhuma licença de banco, fotógrafo ou autorização de terceiros inventada.
- [x] Sem deploy ou newsletter autorizados nesta etapa.

### Compatibilidade com a política e limites do gate

ART-031 é `analysis`. `docs/EDITORIAL_STANDARDS.md`, seção “Tipos editoriais”,
exige declaração pública de vínculos ou ausência para `opinion`, não para todos
os artigos. `docs/EDITORIAL_CONTENT_WORKFLOW.md` exige identificar patrocínio
específico. A simplificação não modifica a política global e não isenta divulgação
quando aplicável. A avaliação interna registra os critérios editoriais aprovados,
sem concluir que não há vínculos comerciais específicos.

Existe um bloqueio independente para preparar a transição oficial:
`docs/EDITORIAL_OPERATIONS.md` exige “fontes confirmadas, fact-checks concluídos,
conflitos avaliados e imagem licenciada”. `scripts/research-operations.ts` e
`scripts/editorial-operations.ts` implementam esse gate. A aprovação concedida
sem confirmação humana integral não transforma fact-checks em concluídos.
`confirmedSources` continua vazio e `factChecks` pendentes. `cover.license`
continua pending: origem ChatGPT não atribui por si uma licença documental.
Não foi alterado código global nem fabricada aprovação para contornar o gate.

### Símbolos: alcance da conferência documental de 12/10/2026

- Lei 5.700/1971, artigos 29 e 31: cores nacionais e usos vedados da bandeira.
  O uso observado é ilustração editorial sobre o SUS, não rótulo ou invólucro
  de produto à venda. Não foi identificado impedimento concreto neste uso;
  isso não constitui autorização geral nem comprovação de direitos de terceiros.
  https://www.planalto.gov.br/ccivil_03/leis/l5700compilado.htm
- O Ministério da Saúde disponibiliza manuais de marcas. O download do manual
  SUS redirecionou para autenticação; não se declara leitura integral desse
  documento. A Portaria 82/2014 disciplina bandeira do SUS e identidade visual,
  não comprova isoladamente proibição geral de representação editorial.
  https://www.gov.br/saude/pt-br/centrais-de-conteudo/manual-de-marcas
  https://bvsms.saude.gov.br/bvs/saudelegis/gm/2014/prt0082_13_01_2014.html
- Não há evidência identificada de uso de fotografia de terceiro, de chancela
  oficial atribuída ao portal ou de cópia de arquivo de marca. Semelhança visual
  isolada não foi tratada como infração. Não se inventa licença ou autorização.

## Inventário e direitos das quatro imagens

As quatro originais foram declaradas pelo responsável como geradas com auxílio
de ChatGPT e editadas para publicação. Os manifestos `imagens.json` e
`imagens-v2.json` documentam arquivos, dimensões e hashes. A declaração de
origem não comprova direitos sobre eventuais insumos nem licença de terceiros.

| Imagem | Versão usada | Elementos que exigem avaliação | Situação documental |
|---|---|---|---|
| Hero | Original preservada; derivados WebP | Símbolo semelhante ao SUS, bandeira brasileira, edificações reconhecíveis e pessoas ilustradas | Origem declarada; insumos e eventuais direitos não confirmados |
| Financiamento | v2 qualitativa ChatGPT; original numérica preservada sem uso no MDX | Símbolo semelhante ao SUS e representação institucional | Edição local rastreável; sem comprovação de licença de elementos de terceiros |
| Legado | v2 qualitativa ChatGPT; original numérica preservada sem uso no MDX | Representação de profissionais e instituições de saúde | Edição local rastreável; insumos não confirmados |
| Viva o SUS | Original preservada; derivados WebP | Símbolo semelhante ao SUS, bandeira, arquitetura e pessoas ilustradas | Origem declarada; insumos e eventuais direitos não confirmados |

Semelhança visual não demonstra cópia de arquivo de terceiro ou pessoa real.
Também não permite afirmar ausência de direitos. Não foi atribuída licença,
autoria de terceiros ou autorização inexistente. `cover.license: pending`
permanece até a decisão documentada. Crédito SGES não equivale a licença.
Não foram acrescentados avisos individuais de IA nas legendas.
