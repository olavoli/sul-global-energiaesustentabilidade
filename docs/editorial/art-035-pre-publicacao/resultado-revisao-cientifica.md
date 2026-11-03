> Resolução vigente: D01–D06 aplicados conforme autorização em 03/11/2026. Ver qualificacoes-D01-D06.md e matriz-auditoria.json. O conteúdo abaixo preserva o histórico da rodada anterior.

# ART-035 — Resultado da revisão científica pré-publicação

Estado final: draft/writing. Sem staging, commit, push, deploy ou publicação. A Hero JPEG não foi refeita ou modificada.

## Entrega

- revisao-cientifica-consolidada.md: tabela de 15 achados e fichas com descrição, trecho original, fonte, evidência, classificação, proposta e impactos sobre referências, conclusões e infográficos.
- matriz-auditoria.json: estado atual; matriz-auditoria-inicial.json: histórico preservado.
- correcoes-aplicadas.json: dez alterações pontuais, nove blocos Word e sincronização do título de uma fonte estruturada, com ANTES/DEPOIS.

## Classificação e decisões

6 confirmados, 5 parcialmente sustentados, 3 incorretos formais, 1 não verificável. Não se deve confundir classificação científica com aprovação editorial. D01–D06 continuam pendentes de decisão substantiva. As chamadas [1] foram acrescentadas sem promover propostas do CGEE a metas oficiais. CNMCE/FSMC não foram trocados automaticamente por CIMCE/FGAM. A redação de 24–36 meses continua no draft para avaliação, com proposta de substituição condicional no relatório.

## Correções aplicadas

Espaço entre frases, “rarss”→“raras” na legenda, “Referências Biográficas”→“Referências”, chamada [2] para gargalos de equipamentos, autores pessoais de [9], espaço antes da chamada [9], ponto final ausente e três chamadas [1] no bloco que utiliza metas do CGEE. Nenhum número ou conclusão foi substituído. Nenhuma nova referência ou URL: os 16 números e destinos foram preservados.

## Verificações desta rodada

- 7 testes focados aprovados, zero falhas, incluindo preservação Word com lista explícita de correções, integridade de imagens, chamadas Vancouver, bloqueio público do draft e decisões pendentes.
- Typecheck, lint, content:validate, build, smoke:i18n, smoke SSR do draft e git diff --check aprovados.
- content:validate: 0 erros; permanece o aviso de licença pending, além dos avisos legados. Isso não é liberação editorial.
- Chrome: 1440×900, 768×1024, 390×844 e 360×800; três imagens carregadas, 16 URLs completas, sem overflow ou erros JavaScript.
- Smoke SSR: rota draft 404; artigo ausente de sitemap/RSS/vitrines; assets existentes no build.
- Suíte completa de 1.192 testes é evidência histórica da integração; não foi repetida nesta rodada restrita, que não alterou código de produção compartilhado.

A transformação do corpo MDX foi reconstruída a partir do estado anterior aplicando somente os dez ajustes registrados; resultado idêntico ao arquivo final. Nenhuma mudança extra de narrativa foi encontrada. Metadados preservados, exceto autoria do título da fonte [9]. Heros, infográficos, Word original, artigos anteriores, traduções, documentos locais e ledger/head foram preservados. 68 arquivos de controle foram conferidos por SHA-256.

## Prévia

http://127.0.0.1:8111/artigo/terras-raras-o-brasil-pode-construir-sua-independencia-tecnologica-ate-2040-parte-3

## Pendências de liberação

Aprovar/rejeitar as qualificações D01–D06; concluir condições de uso visual (cover.license pending) e avaliação de conflitos de interesse; obter autorização expressa de publicação. Nenhuma aprovação humana integral, reviewer ou data de revisão foi inventada. Classificação final: revisão local concluída com pendências editoriais; NÃO APTO para publicação ainda.
