# ART-036 — acessibilidade dos infográficos

Pendência de acesso às informações resolvida por ampliação e descrições textuais. ART-036 permanece em **draft/writing**, sem commit, push ou deploy.

## Implementação

Somente as duas figuras do ART-036 receberam o atributo opcional `accessibleDescription`. Quando presente, ele disponibiliza:

- Botão “Ampliar infográfico”, identificado pelo texto alternativo da respectiva imagem.
- Diálogo modal com título, instruções, botão “Fechar”, fechamento por Escape e retorno do foco ao botão que abriu a visualização.
- Ampliação de 100% a 400%, redução e ajuste à tela; abertura da imagem original em outra aba, identificada no nome acessível do link.
- Pinça com dois dedos e arraste dentro da área ampliada; rolagem por teclado dentro dessa área. A página não ganha rolagem horizontal.
- Controles com foco visível e área mínima de 44 px. O foco permanece no diálogo enquanto ele está aberto.
- Seção nativa expansível “Ler descrição textual do infográfico”, com texto selecionável, legível e compatível com tecnologias assistivas. Pode ser aberta por teclado e funciona independentemente do JavaScript do visualizador.

Foi reutilizada a infraestrutura Radix Dialog já instalada, sem dependências novas. O recurso é opcional: demais figuras e a Hero conservam o comportamento anterior. Componentes novos: `InfographicAccessibility.tsx` e `useInfographicGestures.ts`; ligação opcional em `MdxComponents.tsx`.

## Equivalência textual

Imagem 1: transcritos objetivo, cinco etapas (diagnosticar, conter e tratar, reabilitar, monitorar e prestar contas), parâmetros pH/metais/vazões/riscos, ressalvas sobre geologia e química local, uso seguro, comparação temporal e distinção entre obra concluída e recuperação comprovada.

Imagem 2: transcritos os quatro pilares e suas ações, território em transformação, objetivos ilustrativos até 2050 (rios, empregos, cidades e cultura) e síntese da arte. Preservada a qualificação editorial de que não são metas oficiais nem resultados comprovados.

Os JPEGs originais continuam com 480 px de largura. O zoom não recupera detalhes inexistentes: a descrição textual é a alternativa que garante compreender as informações sem depender da leitura dos caracteres pequenos da imagem. Não houve regeneração, recorte, reexportação ou alteração de conteúdo das artes.

## Verificação

| Verificação | Resultado |
|---|---|
| Testes de preservação ART-036 e procedência/crédito de imagens | 13 aprovados, 0 falhas |
| Typecheck | Aprovado |
| Lint dos três arquivos de implementação | Aprovado |
| Validação de conteúdo | Aprovada; avisos legados preservados |
| Build de produção | Aprovado |
| `git diff --check` | Aprovado |
| Desktop, 1440 px | Duas descrições acessíveis; ampliação de 480 para 720 px por botão; abertura, fechamento e foco aprovados |
| Celular emulado, 390 px | Duas descrições acessíveis; ampliação de 330 para 495 px por botão; rolagem interna sem overflow da página |
| Pinça por entrada de toque na emulação Chrome | Ampliação de 100% para 186%, aprovada |
| Teclado | Enter abre diálogo/descrições; Tab permanece no diálogo; Escape fecha e devolve foco; região ampliada aceita rolagem por setas |
| Foco visível | Contorno sólido de 2 px verificado |
| Erros JavaScript | Nenhum nos dois tamanhos |
| Preservação | 419 arquivos de imagens e outros artigos com hashes inalterados |

No ART-036, a remoção dos dois novos atributos reproduz exatamente o arquivo anterior: texto científico, referências, legenda revisada, tags e todo o frontmatter são idênticos. As oito tags e o estado `draft/writing` foram confirmados.

As capturas do texto no celular foram inspecionadas visualmente. A validação móvel foi feita por emulação com eventos de toque; não constitui teste em aparelho físico ou com leitor de tela real. Sem alteração global de viewport ou bloqueio do zoom do navegador na página.

## Estado editorial

V01 passa a resolvido quanto ao critério solicitado: o leitor consegue acessar e compreender as informações dos infográficos por meio do texto, além de inspecionar as imagens ampliadas. A resolução dos originais permanece documentada; não foi alegado aumento de definição.

Resta somente a autorização editorial posterior para publicar. Nenhum outro artigo foi alterado e não houve commit, push ou deploy.

[Abrir prévia local](http://127.0.0.1:8112/artigo/transicao-energetica-justa-em-santa-catarina-quem-recupera-o-territorio-e-constroi-o-futuro-depois-do-carvao-parte-3).
