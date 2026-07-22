# Notas Editoriais de Pesquisa

Notas são registros manuais privados vinculados a um `scientificWorkId` e, opcionalmente, a um dossiê. O schema v1 contém identificador, título, Markdown sanitizado, autor, status, versão e timestamps.

Estados permitidos: `draft`, `active`, `resolved` e `archived`. Não há preenchimento automático, IA, exclusão pela interface, geração de artigo ou publicação. Cada alteração incrementa a versão e preserva uma revisão imutável.

O sanitizador remove HTML, instruções `import`/`export`, protocolos executáveis e caracteres de controle. Auditorias registram somente ação, ator e identificadores; nunca título, corpo ou trechos científicos.
