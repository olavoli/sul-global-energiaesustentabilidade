# Sprint 24 — resolução determinística de entidades

A camada resolve identidades de autores, instituições, periódicos, editoras, categorias, países e financiadores sem IA, fuzzy matching ou inferência. Ela produz somente candidatos explicáveis para revisão humana.

## Precedência e confiança

1. ORCID e ROR: 100.
2. DOI: 100.
3. ISSN, OpenAlex ID e Crossref ID: 95.
4. Nome normalizado exatamente igual: 80.
5. Alias conhecido exatamente igual: 60.

A primeira regra aplicável vence. A normalização remove diacríticos, pontuação, diferença de caixa e espaços repetidos. Não há distância lexical, expansão automática de siglas ou inferência de identidade.

Cada correspondência permanece em `pending` até uma pessoa escolher `accepted` ou `ignored` na Central. Aceitar confirma a correspondência; não funde, apaga ou reescreve registros. Toda decisão exige nota e gera auditoria sanitizada com `mergedAutomatically: false` e `generatedContent: false`.
