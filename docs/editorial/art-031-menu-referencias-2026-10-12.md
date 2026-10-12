# Menu Ciência e bibliografia do ART-031 — correção local

## Diagnóstico e solução

O MDX do ART-031 contém uma bibliografia manual numerada de 1 a 22. A rota de artigo também renderizava SourceList com as fontes estruturadas, resultando em duas seções. A lista manual é preservada integralmente; `referencesInBody: true` explicita sua apresentação no MDX e impede somente a lista automática redundante neste artigo. As fontes estruturadas continuam disponíveis nos metadados. Não se deduz a presença da bibliografia de palavras soltas, nem se oculta conteúdo via CSS.

URLs longas da lista manual provocavam overflow a 390 px. ArticleBody permite quebra de palavras explicitamente para o artigo com bibliografia manual declarada; sem modificar URLs, texto ou estilos globais.

O item Ciência utiliza o DropdownMenu Radix já instalado, com links independentes para `/categoria/ciencia` e `/categoria/politicas-publicas`. A mesma implementação é reutilizada no drawer móvel, acima dele, fechando o drawer ao navegar. Mantidos as outras categorias, rodapé e URLs.

## Outros artigos

Além do ART-031, 14 artigos publicados têm seção manual de referências e fontes estruturadas: cobre; minerais críticos; baterias de sódio; fusão nuclear; geotermia; fim de vida do painel solar; energia; potência; perovskita-silício; armazenamento; eficiência; curtailment; conexão à rede; tamanho das baterias. Isso confirma que a coexistência das duas apresentações não é exclusiva do ART-031. Não se presume equivalência integral entre suas bibliografias. Nenhum desses artigos recebeu a opção nem perdeu fontes.

## Arquivos

- `src/components/navigation/ScienceMenu.tsx`: dropdown compartilhado.
- `src/components/layout/SiteHeader.tsx`: item Ciência desktop.
- `src/components/navigation/MobileMenu.tsx`: item Ciência móvel.
- `src/components/navigation/science-menu.test.ts`: destinos e preservação da bibliografia numerada; somente ART-031 opta pela lista manual.
- `src/content/schema.ts`: campo opcional `referencesInBody`, ausente por padrão.
- `content/articles/a-pandemia-salvou-o-sus.mdx`: somente o novo campo de apresentação.
- `src/content/generated/articles.ts`: regenerado pelo procedimento oficial.
- `src/routes/artigo.$slug.tsx`: escolha explícita de apresentação e quebra de palavras.
- `src/components/article/ArticleBody.tsx`: opção de quebra de palavras, desligada por padrão.
- Este registro.

## Validação

13 testes focados aprovados: ART-031, contratos do menu móvel e regressões desta correção. Typecheck, lint dos arquivos TypeScript afetados, build e diff check aprovados. Conteúdo: 27 avisos preexistentes, zero erros.

Prévia Vite: desktop 1440 px e celular 390 px. Dropdown abre por clique e Enter, permite navegação por setas e fecha com Escape; seleção móvel de Políticas Públicas conserva a URL existente. Bibliografia com um único título; 22 itens preservados; viewport móvel 390 px, documento 375 px, sem overflow horizontal depois da correção. Teste físico de gestos em aparelho não realizado; usa eventos de ponteiro e alvos de 44 px do componente existente.

Corpo editorial, Nota de Transparência, imagens e fontes do ART-031 sem alteração. Sem staging, commit, push, deploy, operações Kit ou banco. `artifacts/` e nove arquivos rastreados do trabalho anterior preservados; hashes anteriores conferidos.
