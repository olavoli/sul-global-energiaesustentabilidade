# Fila operacional de tradução — versão 1

Implementada em scripts/i18n-operations/batch.ts, reutilizando o mesmo executor de tradução, validadores e ledger do comando individual. Execução sequencial e supervisionada, sem agendamento, banco remoto ou publicação automática. Testes usam mocks e diretórios temporários; esta implementação não autorizou nem realizou inferências reais.

## Comandos

Na raiz do clone Linux:

```bash
# Planejamento offline: grava somente um descritor privado imutável, nunca reserva dinheiro.
bun run i18n:batch plan --articles o-que-e-potencia,o-que-e-energia

# Consulta somente de leitura.
bun run i18n:batch status --plan HASH_DO_LOTE
```

A seleção preserva a ordem; duplicatas e slugs vazios são rejeitados. O plano lista artigo, EN/ES, chamadas e reserva de cada artigo, total e ID SHA-256. O descritor fica em i18n/storage/batches/plans/<hash>.json, fora do Git e das rotas. Alteração do conteúdo é rejeitada, inclusive quando o arquivo conserva o nome. Repetir um plano idêntico não sobrescreve o descritor.

**Execução paga futura — somente mediante autorização financeira explícita do lote inteiro:**

```bash
I18N_OPERATIONS_ALLOW_PAID=1 bun run i18n:batch execute \
  --plan HASH_DO_LOTE --authorize-plan HASH_DO_LOTE --operator NOME_RESPONSAVEL
```

As credenciais I18N_OPERATIONS_CF_ACCOUNT_ID e I18N_OPERATIONS_CF_API_TOKEN devem estar configuradas de forma segura. Não registrar valores no Git ou argumentos. A CLI não chama OpenAI. O hash autoriza somente os artigos, revisões, ordem e reservas do descritor, e não exige aprovação financeira individual de cada artigo.

Para contingência: planejar com `--pool contingency` e adicionar à execução `--authorize-contingency 'motivo e autorização'`. Os limites não mudam.

Pausa supervisionada entre artigos:

```bash
I18N_OPERATIONS_ALLOW_PAID=1 bun run i18n:batch execute \
  --plan HASH_DO_LOTE --authorize-plan HASH_DO_LOTE --operator NOME_RESPONSAVEL --max-articles 1

I18N_OPERATIONS_ALLOW_PAID=1 bun run i18n:batch resume \
  --plan HASH_DO_LOTE --authorize-plan HASH_DO_LOTE --operator NOME_RESPONSAVEL
```

Retomada mantém a mesma autorização do lote e não reserva novamente. Pula artigos completos e processa somente pendentes, ou um artigo reservado sem qualquer dispatch. Qualquer artigo incompleto com chamadas despachadas bloqueia a retomada: não repetir automaticamente nem mesmo chamadas cujo uso tenha sido informado. Mudança de fonte, código, política, preços, mês UTC ou avanço inesperado do histórico também bloqueia. Não há auto-resume, retry ou auto-merge.

## Interfaces e reserva financeira

- `planBatch(root, slugs, pool)`: leitura; retorna id, plano, allowed/blocked e resumo.
- `saveBatchPlan(root, proposal)`: gravação exclusiva de descritor, sem alterar ledger/head.
- `executeBatch(root, id, authorization)`: lock global; valida autorização e snapshot; reserva tudo antes do primeiro despacho.
- `batchStatus(root, id)`: leitura de descritor e replay do ledger.
- `cancelUnusedBatch(root, id, history, operator, reason)`: encerra apenas parcelas nunca despachadas; não libera dinheiro.

O plano vincula versão, mês, pool, digest inicial do ledger, revisão do código, política, preços e revisões/calls/reservas por artigo. Os IDs individuais derivam do lote e slug. A execução usa o digest corrente sem tratar planos individuais antigos como autorização genérica.

Evento `batch-reserve` registra atomicamente a autorização e todas as parcelas em uma única atualização do livro existente. O total é a soma das parcelas por artigo; não existe uma segunda reserva financeira do lote. `batch-start` reivindica uma parcela e o executor compartilhado produz dispatch/usage/failed/complete. Os eventos antigos continuam válidos. O saldo não é recalculado como se tentativas anteriores não existissem.

Limites inalterados: USD10/mês UTC, USD8 regular, USD2 contingência autorizada, USD0,15 acumulados por artigo EN+ES incluindo reprocessamentos e meses. Conferir simultaneamente cada artigo, soma mensal e soma do pool. Mesmo quando cada artigo cabe individualmente, a soma do lote pode bloquear. As reservas inteiras continuam retidas após falhas, pausas, sucesso e cancelamento operacional; valores calculados ou confirmados maiores prevalecem.

## Interrupção, cobrança e cancelamento

Interromper no primeiro erro de autenticação, orçamento, rede, validação, gravação ou integridade. Nenhum artigo seguinte é despachado. Tokens/neurons reportados são registrados antes de validar conteúdo; cobrança confirmada continua separada. Status não mostra zero como custo observado quando não há usage: calculatedUSD é null. `dispatch` registra intenção persistida, não prova recebimento pelo provedor.

**Um despacho histórico sem uso reportado e sem cobrança confirmada bloqueia a fila inteira, mesmo após reconciliação administrativa.** Esse bloqueio não é removido com renomeação, novo plano, mudança de pool ou contingência. Uso reportado com fatura ainda não confirmada é `unconfirmed`, distinto de `unknown`. Esta tarefa não confirma faturas nem reconcilia operações.

Se for necessário encerrar pendentes não iniciados, depois de consultar status:

```bash
bun run i18n:batch cancel --plan HASH_DO_LOTE --history DIGEST_ATUAL \
  --operator NOME_RESPONSAVEL --reason 'encerrar parcelas não despachadas'
```

Isso marca apenas parcelas elegíveis como cancelled e conserva a reserva. Não modifica/reconcilia a execução falha, não desbloqueia cobrança desconhecida e não reaproveita orçamento. Uma nova tentativa paga exige nova autorização e reserva acumulada, depois da resolução dos bloqueios. Não alterar manualmente planos, locks, ledger, head ou arquivos pending.

## Status e entrega editorial

Lote: PLANNED, PAUSED, BLOCKED, REVIEW_REQUIRED ou CANCELLED. Artigos: PENDING, BLOCKED, REVIEW_REQUIRED ou CANCELLED. `executionBlock` expõe cobrança desconhecida. O status identifica IDs individuais, diretórios, reserva, cálculo conhecido, confirmação de cobrança e chamadas despachadas.

Cada artigo completo recebe en.mdx, es.mdx, en.review.json, es.review.json e review.json, em i18n/storage/review/<run-individual>/. Todos permanecem draft, translationReview pending, REVIEW_REQUIRED e publishable:false. As melhorias editoriais existentes são reutilizadas. Compilação e schema precedem a entrega atômica do diretório. Arquivos pending após falha de escrita são privados e não publicáveis.

Revisão linguística e científica humana continua obrigatória. Não há comando de publicação, criação de rotas ou alteração de índices. Os rascunhos corrigidos do piloto não são atualizados pela fila. Custos locais são conservadores, não garantia absoluta de fatura do provedor.

## Testes

`bun test scripts/i18n-operations` cobre planejamento determinístico, autorização ausente/inválida, reserva agregada sem dupla contagem, limites de artigo/mês/pool, pausa e retomada, duplicação, falhas HTTP/rede, histórico desconhecido mesmo reconciliado, concorrência, corrupção de plano/checkpoint, cancelamento sem liberação de reserva e geração de drafts/manifestos por idioma. Não há transporte real nos testes.


## Compatibilidade bibliográfica e diagnóstico de planejamento

Correção de 26/10/2026: ART-032 usa o cabeçalho explícito `## Referências Bibliográficas`. O extrator compartilhado agora aceita essa variante e `Referências bibliográficas`, além dos títulos anteriores; entradas bibliográficas continuam bloqueadas e fora do payload de tradução. Nenhum artigo foi modificado. Títulos arbitrários de bibliografia continuam rejeitados.

Falhas de fonte agora preservam códigos sanitizados e identificam o slug: source-bibliography-heading-missing, source-mdx-attribute-unsupported, source-segment-too-large, source-not-found ou source-validation-failed. Códigos financeiros e batch-unknown-billing não são convertidos em erro genérico. A fila primeiro lê/segmenta as fontes; depois avalia as restrições financeiras do lote. Corrigir a compatibilidade não libera execução: checkBatchBudget conserva o bloqueio de despacho histórico sem usage e sem cobrança confirmada, mesmo reconciliado administrativamente. Mudança de código invalida planos anteriores.
