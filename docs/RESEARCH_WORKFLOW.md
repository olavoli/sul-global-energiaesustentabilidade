# Fluxo de pesquisa verificável

O briefing em `content/research/<slug>.yml` é material interno: não entra no MDX, bundle, sitemap ou RSS. A Sprint não pesquisa nem preenche fontes automaticamente.

## Etapas

1. Defina pergunta central, escopo, público, questões, dados necessários e tipos de fonte.
2. Registre fontes ainda não avaliadas em `candidateSources`. Candidata não é confirmação.
3. Mova uma fonte para `confirmedSources` somente após conferir URL, título, organização e data de verificação.
4. Registre fontes descartadas em `rejectedSources` com motivo; elas nunca contam para o gate.
5. Liste cada afirmação planejada em `factChecks`. O item só fica `confirmed` com fonte confirmada correspondente.
6. Resolva perguntas abertas, conflitos, riscos editoriais e o checklist completo da imagem.
7. Use `bun run research:status -- <slug>` durante a apuração e `bun run research:validate -- <slug>` como gate.

Estados: `not-started`, `researching`, `sources-collected`, `fact-checking`, `ready-for-writing` e `blocked`.

`ready-for-writing` permite iniciar o draft factual; não permite review nem publicação. Para review, o artigo ainda precisa estar em `draftStage: review-ready`, usar autor verificado, conter fontes estruturadas, fact-checks concluídos, imagem licenciada e conflitos avaliados.

## Imagem

O briefing exige origem, licença, autorização, crédito, alt, largura, altura, proporção, versão social, risco de uso e confirmação de que o ativo não é demo. Não buscar, copiar ou baixar mídia automaticamente.
