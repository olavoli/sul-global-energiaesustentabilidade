# CLI editorial — correção da persistência JSON

## Diagnóstico e correção

`setYamlField` procurava campos YAML sem aspas em todo o documento. Em frontmatter JSON válido, não encontrava `status`, retornava o texto inalterado e a CLI anunciava sucesso porque validava apenas o schema, não a correspondência com o destino.

Agora a função delimita o frontmatter, interpreta sua estrutura com o parser YAML existente (também compatível com JSON) e substitui somente o intervalo do escalar de nível superior solicitado. Campos novos de data são inseridos conforme JSON ou YAML; demais campos, comentários fora do escalar e corpo MDX são preservados. Não se procura nem substitui `status` no corpo ou em campos aninhados.

`prepareStatusChange` exige que o candidato interpretado tenha o status solicitado, mantendo todos os gates anteriores. `persistStatusChange` grava, relê o arquivo e o interpreta pelo parser/schema e validador MDX oficiais; compara o status persistido ao solicitado. Erro de escrita, leitura, parsing ou divergência lança mensagem `Falha ao persistir transição editorial`. O tratamento de erro já existente da CLI retorna exit code 1. O resumo aplicado e “Status gravado” só aparecem após a confirmação; dry-run continua sem escrita.

Não há promessa de rollback em caso de falha: a CLI informa a falha e o operador deve inspecionar o arquivo antes de repetir. Não foi criado caminho alternativo de transição nem relaxado controle editorial.

## Arquivos desta correção

- `scripts/editorial-operations.ts` — escrita JSON/YAML, pós-condição e releitura após persistência.
- `src/content/editorial-operations.test.ts` — regressões usando fixtures e diretórios temporários.
- Este registro local.

## Evidências

54 testes passaram nos três arquivos de testes de operações editoriais, pesquisa/autoria e ART-032. Cobertura nova: JSON draft → review com preservação byte a byte fora do status; JSON/YAML com novo approvedAt e preservação semântica dos demais campos; corpo inalterado; persistência em arquivo temporário e releitura; escrita simulada sem efeito; saída inválida; erro de escrita; entrada inválida; workflow proibido. Também foi coberta a inclusão de publishedAt no JSON.

Typecheck aprovado; lint focado dos dois arquivos aprovado; `git diff --check` aprovado. O typecheck regenerou o índice oficial sem mudança de conteúdo. Os 33 caminhos do inventário editorial foram comparados por SHA e todos permaneceram idênticos. Staging vazio. ART-032 permanece `draft / review-ready`; nenhuma transição real foi executada nesta rodada.

**CLI pronta para repetir a transição oficial com verificação real de persistência.** Não houve commit, push, deploy, publicação, operação Kit ou alteração em `artifacts/`.
