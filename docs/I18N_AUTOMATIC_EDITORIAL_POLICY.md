# Política editorial de traduções automáticas

## Decisão e fronteiras

A instrução do responsável nesta conversa autoriza a modalidade `automatic-ai-assisted` para traduções EN/ES de originais PT-BR já aprovados e publicados. O registro é uma autorização editorial por política para o acervo, não um parecer de revisor humano. O cadastro não inventa uma identidade civil, uma data de revisão humana ou uma versão de pesos não exposta pelo provedor.

`content/translation-policies/automatic-v1.json` registra essa modalidade. Sua seleção explícita substitui a exigência humana **somente para a tradução atestada por esta política**. O schema/fluxo dos artigos originais não muda. Uma tradução no caminho manual `pending` continua bloqueada; não basta trocar seu status. O controlador contínuo antigo e suas autorizações financeiras permanecem separados e desligados.

## Gates e significado

1. Fonte não demonstrativa, publicada, com aprovação registrada; hashes da fonte e das edições atuais.
2. Reutilização do MDX, fórmulas, números, pares quantidade/unidade, esqueleto, referências, fontes estruturadas, autoria, categoria, tags, ativos e licenças. Não são criadas novas fontes nem alterados os originais.
3. Evidência de significado assistida por IA: um par literal por segmento e por campo textual de metadados, sem IDs duplicados, ausentes ou inventados. A evidência registra `equivalent`, `uncertain` ou `contradiction` e justificativa. Ausência, ambiguidade, evidência vencida e erros linguísticos suspeitos encaminham para revisão; contradições e divergências críticas bloqueiam o artigo. Os demais artigos continuam avaliados.
4. Avisos de negação/modalidade só são resolvidos por evidência explícita para o mesmo ID e os mesmos trechos. Não há lista de slugs privilegiados nem supressão genérica de avisos. Links PT exigem identificação no texto visível. Texto raster PT e interface parcialmente localizada são limitações aceitas por política.
5. Compilação MDX e publish-check existentes; atestação `operations-editorial-policy-v1` com policyId, runId do plano editorial, sourceRevision, targetRevision, codeRevision, meaningRevision e horário. runId editorial não é apresentado como ID financeiro ou nova inferência.
6. Gerador/CI relê política e evidência e revalida as edições antes de gerar índices. Com esta política selecionada no repositório, recusa downgrade para a atestação técnica legada sem significado. Uma mudança exige novo plano; fonte alterada, parecer divergente ou par incompleto não entra no conjunto público automático.

**Limitação real:** validação de estrutura e pareamento não prova a veracidade de uma avaliação semântica. Uma IA pode classificar incorretamente uma tradução. Não existe garantia absoluta de detectar todos os erros científicos ou linguísticos. A avaliação assistida precisa existir de fato: o código não gera `equivalent` por copiar IDs ou porque o MDX compilou. Evidência ausente não vira PASS. Para futuros artigos, `meaning.ts` e `meaning-execution.ts` produzem evidência por lotes de dez pares, usando o mesmo endpoint/parser Cloudflare, orçamento, quota e ledger. O produtor só aceita free-only, verifica margem para todo o trabalho restante EN+ES e reserva conservadoramente cada lote, registra cada despacho/uso e executa no máximo um lote novo por invocação. Retomadas reutilizam checkpoints completos; chamada incerta bloqueia, sem retry automático. Pode ser invocado sequencialmente pelo agendador, sem aprovação humana por artigo. Só o conjunto integral, consistente e sem ambiguidades vira evidência elegível; falhas não viram aprovação. Esta entrega não executa chamadas ocultas, nem ativa o produtor remoto ou scheduler. Não se afirma que toda a operação contínua já esteja ativada.

## Aplicação ao piloto existente

As evidências EN/ES de `o-que-e-potencia` registram a comparação assistida por IA dos textos atuais com o PT: elevadores com mesma carga/altura e ressalva de eficiência, potência média, W/J/s, exemplos de 1 kWh, conversões, potência versus eficiência e conclusões. Incluem imagens/metadados localizados. Não são revisão humana. Os três falsos positivos e quatro destinos PT já aceitos estão preservados; as duas ocorrências do mesmo link não foram confundidas com fontes adicionais.

O fluxo gera candidatos publicados apenas no diretório ignorado `test-results/i18n-editorial-policy/<hash>/`. Isso demonstra compilação, validação e atestação, sem disponibilizar drafts no portal. Os MDX do PR #15 continuam draft/pending nesta rodada. Materialização e rollback foram testados somente em diretórios temporários.

## Comandos reutilizáveis (sem inferência)

```bash
# Avaliar os arquivos existentes, sem escrever no conteúdo ou no ledger:
bun run i18n:editorial --articles o-que-e-potencia
# Mesmo mecanismo para vários artigos:
bun run i18n:editorial --articles primeiro-artigo,segundo-artigo
# Descobrir fontes públicas e classificar entradas faltantes como pendentes:
bun run i18n:editorial --discover
# Demonstração isolada de candidatos + relatório:
bun run i18n:editorial --articles o-que-e-potencia --demonstrate
```

Após CI aprovado e integração controlada, o executor pode materializar os membros READY do plano inteiro, sem nova autorização editorial por artigo:

```bash
bun run i18n:editorial --articles o-que-e-potencia --install --confirm-plan HASH_ATUAL
bun run content:generate
bun run content:validate
# Executar publish-check EN/ES no contexto oficial e todos os checks antes de merge/deploy.
```

`--confirm-plan` é uma proteção contra execução de um snapshot diferente, não um pedido de revisão humana/financeira por artigo. O runner pode fornecer o hash do plano que acabou de validar. A CLI não faz commit, merge, inferência ou deploy. Os membros BLOCK/REVIEW_REQUIRED não são instalados; o relatório mantém seus motivos e a classificação PARTIAL_READY permite prosseguir somente com os READY. Sem nenhum elegível, o comando retorna código não zero.

## Idempotência, rastreabilidade e rollback

Um lock exclusivo protege a materialização. O plano é recalculado, incluindo política, código, fonte, edições e evidências. Payload adulterado ou fonte alterada falha fechado. Um journal privado com hash das cópias anteriores é persistido antes de substituir arquivos. Duas edições são preparadas antes das renomeações; o gerador exige o par automático com mesmo runId. Instalação já aplicada e idêntica retorna ALREADY_APPLIED. Interrupção com journal prepared exige recuperação explícita, nunca regeneração de tradução ou repetição de chamada.

```bash
bun run i18n:editorial --rollback HASH_DO_PLANO
bun run content:generate
bun run content:validate
```

Rollback local recusa alterações posteriores ou backup adulterado. O índice precisa ser regenerado e o retorno seguir CI/deploy oficial para afetar produção. Não há alegação de transação de filesystem entre múltiplos arquivos nem rollback remoto executado nesta entrega. Não operar simultaneamente com o materializador legado enquanto a integração de ativação não estiver validada.

## Finanças e ativação

Esta política não autoriza gastos. Novas traduções/verificações por provedor continuam restritas ao executor `I18N_EXECUTION_MODE=free-only`, modelo Cloudflare já configurado, cotas locais e bloqueio 429/3036. Sem OpenAI, upgrade ou fallback pago. Nenhum ledger, reserva ou autorização financeira foi alterado. Não foi ligada nenhuma flag remota de tradução, merge ou deploy. Os workflows existentes permanecem inalterados; a nova modalidade deve ser integrada e passar no CI antes de ativação futura.

## Produtor automático de evidência de significado

```bash
# Apenas planeja a etapa ausente e reutiliza evidências existentes; nenhuma chamada:
bun run i18n:editorial --articles primeiro-artigo,segundo-artigo --assess-missing
# FUTURO, não executado nesta entrega; exige confirmação Free válida e credenciais:
I18N_EXECUTION_MODE=free-only bun run i18n:editorial --articles primeiro-artigo,segundo-artigo --assess-missing --execute-free
```

A execução real usa os mesmos `I18N_OPERATIONS_CF_ACCOUNT_ID`, `I18N_OPERATIONS_CF_API_TOKEN` e `I18N_FREE_PLAN_CONFIRMATION_FILE` do executor existente; `I18N_OPERATIONS_ALLOW_PAID` deve estar ausente. A política não inventa nem renova a confirmação de plano. Em CI, o produtor exige callback de persistência durável antes de qualquer HTTP; a CLI isolada falha fechado em vez de usar estado efêmero. A integração hospedada deve usar o wrapper privado já existente. Nenhuma flag/secret foi alterada. Quota sem margem pausa antes do despacho; 429/3036, autenticação e rede incerta seguem os bloqueios existentes. O ledger original não é reiniciado.

A resposta do modelo contém somente ID, decisão e justificativa; as citações exatas são recolocadas localmente a partir da fonte e da tradução. JSON inválido, ID errado, truncamento e dados críticos divergentes não aprovam o artigo. As evidências parciais ficam no estado privado; o arquivo de evidência público só é criado quando completo. Evidência existente divergente nunca é sobrescrita automaticamente. Os testes completos do produtor usam relógio e transporte simulados e são explicitamente fictícios. O modelo revisor é o mesmo alias Llama já configurado; não se afirma independência entre modelos nem garantia de fidelidade.

## Evidências locais desta entrega

- 1.144 testes completos aprovados, incluindo o reforço contra downgrade (incluindo 36 novos casos da política e do produtor), zero falhas.
- Typecheck, validação de conteúdo, build e diff-check aprovados. Lint de todos os arquivos de código rastreados/candidatos aprovado. O lint geral local encontrou somente bundles já gerados em .wrangler/production-dry-run (132 arquivos); nenhum ignore foi alterado e nenhum output foi apagado. O CI em checkout limpo executa o lint geral oficial.
- Piloto existente: READY em EN e ES, 85 pares de significado por idioma (78 segmentos do corpo e sete metadados); compilação e publish-check dos candidatos aprovados, sem reviewer/reviewedAt humano. Materialização, índice e rollback completos demonstrados somente em diretórios temporários.
- Nenhuma inferência real, instalação no content/ real, publicação, deploy ou ativação de workflow. Ledger/head, históricos e artigos/edições reais conferidos por SHA-256 e preservados.
