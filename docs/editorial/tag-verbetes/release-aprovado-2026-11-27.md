# Release dos quatro verbetes aprovados — 27/11/2026

A publicação de Hidrogênio verde, Cobre, Armazenamento de energia e Transição energética foi autorizada expressamente pelo responsável editorial nesta conversa. A data registra essa autorização, sem atribuir identidade de revisor ou auditoria independente.

Os textos, referências, classificações e exemplos aprovados foram preservados. Testes de SHA-256 protegem os quatro registros editoriais, excluindo apenas os campos administrativos de estado e data de aprovação. As quatro páginas removem o aviso de protótipo e registram a aprovação editorial.

Fotocatálise permanece reservado: seu texto não integra o cadastro distribuído, não foi criada uma tag e a rota continua inexistente. O material de pesquisa anterior permanece local, fora deste release.

## Escopo e preservação

- Quatro registros vinculados aos identificadores existentes da taxonomia; nenhuma alteração em artigos.
- Referências: três em Hidrogênio verde, duas em Cobre, três em Armazenamento e três em Transição energética.
- Artigos relacionados obtidos do catálogo publicado, sem cadastro manual de links.
- Navegação lateral no desktop e índice recolhível em telas menores.
- Indexação, canonical, sitemap, robots e slugs continuam regidos pelos arquivos existentes, sem alterações. Cobre mantém noindex, follow por possuir um artigo; os demais seguem sua cobertura atual.
- Nenhuma migração, inferência paga, ação social, alteração de secret ou binding.

## Controles do release

Executar testes dos verbetes e regressão de taxonomia/SEO, TypeScript, lint, build oficial e validação/dry-run de produção. Conferir as quatro páginas em 1440, 768 e 390 px, contraste, foco, navegação, imagens e ausência de overflow. Exigir quality e visual aprovados no SHA exato do PR antes de integrar.

Registrar a versão e o deployment anteriores, construir o commit integrado e implantar exclusivamente sul-global-production com a configuração oficial gerada e --keep-vars. Após deploy, executar smoke somente leitura e conferir as quatro URLs, metadados, referências e links. Em regressão impeditiva, restaurar a versão anterior sem modificar dados editoriais.
