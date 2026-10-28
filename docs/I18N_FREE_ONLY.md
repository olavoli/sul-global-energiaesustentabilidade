# Tradução controlada no Workers Free

Modo explícito `I18N_EXECUTION_MODE=free-only`, separado do gate pago. O proprietário confirmou visualmente Workers Free. A proteção global de cobrança excedente é o bloqueio do próprio provedor: HTTP 429/código 3036 ao esgotar a franquia. Não há upgrade, OpenAI ou fallback pago. Uma conta Workers Paid não é admissível nesse modo.

## Comandos

```bash
# Planejamento offline: não reserva nem chama modelos.
I18N_EXECUTION_MODE=free-only bun run i18n:operations --article o-que-e-potencia --language en
# Execução controlada: confirmação privada do plano e credenciais no ambiente.
I18N_EXECUTION_MODE=free-only I18N_FREE_PLAN_CONFIRMATION_FILE=/CAMINHO/PRIVADO/confirmation.json bun run i18n:operations --article o-que-e-potencia --language en --execute
# Somente após inglês válido: usar --language es nas mesmas condições.
```

Não definir I18N_OPERATIONS_ALLOW_PAID nem --authorize-plan: isso é conflito no modo gratuito. O modo pago mantém autorização financeira/hash e contingência anteriores. A seleção individual de idioma é exposta pela CLI somente no modo gratuito; o comportamento padrão EN+ES permanece disponível.

A confirmação privada segue freeConfirmationSchema: versão owner-free-plan-v1, hash da conta, plan workers-free, descrição da evidência do proprietário e recordedAt UTC. É vinculada à conta e válida por até 24 horas; não é uma autorização de despesa paga nem substitui o plano do provedor. Não colocar a confirmação ou credenciais no Git público. O modo gratuito recusa prova ausente, vencida, de outra conta ou plano pago.

## Controles preservados

Permanecem limites monetários, reservas históricas, hash chain/head, lock e bloqueio de reconciliação. Uma execução gratuita não registra cobrança zero: mantém reserva e consumo calculado separados da cobrança efetiva. Nenhum registro anterior é reescrito. O sourceRevision e codeRevision são revalidados antes de cada dispatch. O mecanismo de checkpoint privado pode persistir cada evento antes da chamada; nenhuma publicação resulta de um checkpoint.

Franquia documentada: 10.000 Neurons/dia UTC. O limite local usa margem de 1.000 e reserva 1.153 por chamada: teto conservador de 24.000 tokens de entrada × 26.668 Neurons/M + 2.500 de saída × 204.805 Neurons/M, arredondado para cima. O ledger reserva antes do dispatch e não libera após falhas. Concorrência no mesmo estado é excluída pelo lock; a proteção de quota compartilhada entre outros clientes é responsabilidade do provedor Workers Free.

Métricas GraphQL são informativas e opcionais: quando disponíveis, estimativas apenas reduzem margem local. Ausência, atraso, ingestão incompleta ou amostragem permanecem desconhecidos, nunca registrados como consumo zero. Não se exige mais um contador analítico global exato para executar. A margem local não é apresentada como uma reserva transacional de toda a conta.

HTTP 429/código 3036 é free-quota-exhausted: interrompe sem retry, conserva reservas e bloqueia novas chamadas locais dessa conta nesse dia. Outros 429 e erro de modelo que exige plano pago também interrompem, sem upgrade ou fallback. Erros reais de autenticação, estrutura, números ou publicação igualmente não são contornados. A política antiga de snapshot autoritativo segue legível para compatibilidade de replay, mas não é exigida para a estratégia aprovada de bloqueio do provedor.

## Resultados privados e revisão

Respostas traduzidas e usage são guardados em i18n/storage/responses/<run>/ com modo 0600, sem headers/credenciais; somente códigos numéricos seguros de erro são expostos. Drafts compilados e manifestos ficam em i18n/storage/review/<run>/. Inglês é validado e compilado integralmente antes de uma execução espanhola separada. Nunca salvar esses artefatos em content/ ou índice público.

Saída: draft, pending, REVIEW_REQUIRED e publishable false. Publicação, CI editorial de conteúdo, automação contínua e deploy são gates separados e não foram habilitados. O código novo deve ser integrado por PR/CI antes de qualquer operação agendada.

Referências: https://developers.cloudflare.com/workers-ai/platform/pricing/ ; https://developers.cloudflare.com/workers-ai/platform/errors/ ; https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/ .
