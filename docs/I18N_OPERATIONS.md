> Atualização de política: a automação contínua com atestação técnica distinta de revisão humana está documentada em [I18N_CONTINUOUS_AUTOMATION.md](I18N_CONTINUOUS_AUTOMATION.md). As restrições de fase abaixo permanecem como histórico; nenhuma operação externa foi ativada.

# Tradução operacional Cloudflare — revisão editorial obrigatória

## Escopo e arquitetura

CLI local independente: `bun run i18n:operations`. Usa somente Cloudflare Workers AI, sem OpenAI, agendamento, banco ou publicação automática. Fonte deve ser artigo português publicado e não demonstrativo. Não modifica artigos nem índices. O planejamento é offline, não requer credenciais e não grava livro financeiro.

Reutiliza `i18n-simulation/pipeline` (extração, montagem e validação), `i18n-real-pilot/sample` (lotes), preços e estimativa do budget existente, e utilitários puros de `i18n-cloudflare-experiment/experiment` (payload v6, parser JSON v2, fronteiras). Não instancia o controlador experimental nem lê ou modifica suas campanhas. Não há segundo extrator MDX. Mudanças futuras nos módulos compartilhados invalidam os hashes de autorização operacional.

Cada folha mantém o ID original. Prefixos/sufixos ASCII são retidos localmente e somente o núcleo é enviado. Nenhum espaço interno ou Unicode é normalizado. Equações detectadas e folhas dentro de MathExpression são copiadas literalmente; atributos estruturais, imagens, links e bibliografia são preservados pelo esqueleto original. Componentes não suportados pelo extrator existente bloqueiam a execução, em vez de receber tratamento permissivo.

Metadados traduzidos: title, subtitle, excerpt, seoTitle, seoDescription, cover.alt, cover.caption e disclosures textuais existentes. Autoria, fontes, licenças, categorias e demais metadados são copiados. Slugs permanecem identificadores estáveis com canonical próprio por idioma. Datas de publicação/aprovação são removidas, status draft, draftStage writing, translationReview pending.

## Comandos

Na raiz do clone Linux:

```bash
bun run i18n:operations --article o-que-e-potencia
bun run i18n:operations --status
```

O plano inclui planHash, revisão da fonte e código, mês UTC, histórico, lotes, reserva em nanoUSD/USD, orçamento e eventual bloqueio. Inspecione esse resultado antes de autorizar. O hash muda com código, fonte, política, preços, histórico ou mês. O token de aprovação é a autorização do plano inteiro, não uma chave de API.

**Execução paga futura, somente com autorização financeira explícita do responsável:** configure `I18N_OPERATIONS_CF_ACCOUNT_ID` e `I18N_OPERATIONS_CF_API_TOKEN` por mecanismo local seguro, sem gravar no Git. Execute separadamente:

```bash
I18N_OPERATIONS_ALLOW_PAID=1 bun run i18n:operations --article o-que-e-potencia --execute --authorize-plan HASH_EXATO_DO_PLANO
```

Apenas credenciais não autorizam chamadas. Nem planejamento nem status ligam a rede. Não há retry automático ou retomada de chamadas. Contingência exige plano próprio `--pool contingency` e execução com `--authorize-contingency 'motivo e autorização editorial/financeira'`, além do hash e da autorização paga. O teto por artigo continua válido.

## Política financeira e persistência

USD10 por mês UTC: regular USD8, contingência USD2. USD0,15 por artigo completo EN+ES, acumulando tentativas, versões e meses. Valores em nanoUSD inteiros; reservas arredondadas para cima. Reserva conservadora do conjunto inteiro antes da primeira chamada. O custo estimado usa as tarifas locais já configuradas, não promessa de preço ou cobrança atual do provedor. Confirmar tarifas e limites de cobrança no provedor antes da primeira execução real. Tokens são estimados por bytes+512, saída máxima2500 por chamada, entrada máxima12000. Requisição sequencial, 90s, sem redirects e resposta limitada a2MiB.

Livro privado `i18n/storage/ledger.json`, checkpoint `head` e lock global exclusivo. Eventos SHA-256 encadeados com timestamp, plano, despacho por ID, uso e resultado. Escrita com arquivo exclusivo, fsync e rename. Falha entre gravação e checkpoint bloqueia por divergência: exige investigação manual; não apagar pendências ou locks para retentar. Tentativa duplicada não é enviada. O lock abrange execução e reconciliação.

Reserva, consumo calculado por tokens, neurons reportados e cobrança confirmada são valores separados. Registrar uso antes de validar traduções. Timeout/HTTP/resposta ilegível pode ter consumo desconhecido; não é consumo zero e a reserva integral permanece. Custo cobrado não é inferido dos tokens. O valor retido é sempre o maior entre reserva, cálculo e cobrança confirmada, nunca liberado automaticamente. Reconciliação operacional permite nova tentativa, mas não devolve orçamento. Sucesso também conserva reservas. Uma fatura recebida posteriormente é registrada por evento de cobrança separado, sem reescrever a reconciliação: `bun run i18n:operations --confirm-billing RUN_ID --history DIGEST_ATUAL --operator RESPONSAVEL --reason 'Fatura recebida' --confirmed-usd VALOR --evidence REFERENCIA_DOCUMENTAL`. Confirmações duplicadas são bloqueadas. O status distingue consumo calculado conhecido de despachos cujo consumo não foi informado (`usageComplete`, `unaccountedDispatches`).

Exemplo de reconciliação **não executado automaticamente**, sem confirmação de cobrança:

```bash
bun run i18n:operations --reconcile RUN_ID --history DIGEST_ATUAL --operator RESPONSAVEL --reason 'Despacho investigado; cobrança ainda não confirmada'
```

Cobrança confirmada exige adicionalmente `--confirmed-usd VALOR --evidence REFERENCIA_DOCUMENTAL`. Não colocar dados pessoais ou segredos na justificativa. Reconciliação duplicada, histórico divergente e valores inválidos são rejeitados.

As reservas pertencem ao mês do despacho; o limite por artigo atravessa meses. Contabilidade mensal não é conciliação automática com a fatura do provedor. Configurar limites de faturamento externos quando disponíveis: controles locais não garantem teto absoluto de cobrança.

Preservar/backupear livro e head juntos. SHA-256 detecta corrupção/inconsistência; não é assinatura contra administrador local que reescreva todo o histórico. A perda de ambos os arquivos não é detectável por um sistema puramente local: nunca reinicializar o diretório para recuperar orçamento. Histórico experimental permanece separado, não migra nem reduz reservas anteriores do experimento.

## Rascunhos e fluxo editorial

Após todas as respostas, os dois idiomas passam por validação determinística, schema e compilador MDX real com remarkFrontmatter/remarkEditorialSlots. Só então são escritos juntos em `i18n/storage/review/<planHash>/en.mdx`, `es.mdx` e `review.json`. Manifesto REVIEW_REQUIRED e publishable:false. Diretório ignorado pelo Git, fora de content/translations e de quaisquer rotas públicas. Falha não entrega um conjunto final; arquivos `.pending` são privados e não devem ser importados.

O manifesto registra fronteiras e achados de revisão. Os testes determinísticos não certificam fluência, idioma ou fidelidade semântica. Revisão humana é obrigatória, inclusive ressalvas científicas. Após aprovação humana, a equipe pode integrar os rascunhos ao diretório editorial `content/translations/<locale>/` e seguir os gates já existentes, com revisor/data verdadeiros, sem automatizar a aprovação. Esta CLI não fornece comando de publicação nem registra aprovação científica.

## Validação offline

```bash
bun run i18n:operations:test
bun test scripts/i18n-operations scripts/i18n-cloudflare-experiment scripts/i18n-real-pilot scripts/i18n-simulation
bun run typecheck
bun run lint --ignore-pattern '.wrangler/**'
git diff --check
```

Fixtures linguísticas são explicitamente simuladas e reutilizadas apenas para teste estrutural; não são traduções editoriais aprovadas. Nenhuma inferência real foi autorizada nesta implementação. Não há comprovação da qualidade do modelo em lotes reagrupados até uma futura execução autorizada.

Adicionar comandos ao package.json altera a revisão calculada pelo controlador experimental existente; aprovações antigas poderão ficar obsoletas como proteção esperada. Nenhum registro experimental deve ser modificado para contornar essa proteção.

## Diagnóstico de falhas — correção de 26/10/2026

A tentativa existente foi encontrada com `reserve`, `dispatch(en:0)` e `failed`, sem `usage`. O código antigo gravou apenas `execution-or-validation-failed` e suprimiu a exceção no CLI. A causa específica não pode ser recuperada desse registro. A ausência de uso não confirma ausência de cobrança. A falha é compatível com HTTP/autenticação remota, rede/timeout, leitura/JSON/schema da resposta, ou falha local antes de persistir uso. Falhas de tradução/MDX normais ocorrem depois do registro de uso e são menos compatíveis com esse histórico. Não se atribui causalidade específica sem evidência adicional. Os eventos antigos não foram reescritos.

`dispatch` significa intenção persistida antes do transporte; não comprova recebimento pelo provedor. Os novos diagnósticos registram somente `code`, `stage`, `dispatch`, `billingStatus`, status HTTP, código de sistema permitido e ID de segmento quando aplicável. Não persistem mensagens brutas, stack, headers, tokens, account IDs ou corpo do provedor. O CLI emite o mesmo objeto sanitizado. Valores desconhecidos não são convertidos em cobrança zero.

Códigos: `credentials-required`, `invalid-credentials`, `provider-auth-rejected` (401/403), `provider-http-error`, `provider-network-error`, `provider-timeout`, `provider-json-invalid`, `provider-envelope-invalid`, `provider-rejected`, `provider-empty-response`, `provider-response-size-limit`, `mdx-validation-failed`, `translation-validation-failed`, `deterministic-divergence`, `local-filesystem-error`. Códigos determinísticos já existentes são preservados quando pertencem à lista segura. O registro de falha relê e valida o checkpoint antes de acrescentar eventos; se a gravação do diagnóstico falhar, o erro primário continua disponível no CLI com `failureRecordCode`. Não se força correção do checkpoint.

Retomada: **não reenviar `en:0` automaticamente**. Primeiro `bun run i18n:operations --status`; consultar os registros/faturamento do provedor por procedimento autorizado para tentar esclarecer o despacho. Se a cobrança continuar desconhecida, a reconciliação operacional explícita deve registrar essa incerteza, sem `--confirmed-usd`, preservando a reserva inteira. Somente depois gerar novo plano e obter nova autorização para o hash atual. A revisão do código mudou, portanto o hash antigo não serve. A nova tentativa acumula reservas no mesmo limite de USD0,15 por artigo; reconciliação não libera orçamento. Nenhuma reconciliação ou inferência foi executada nesta correção.

## Auditoria final offline — 26/10/2026

Um plano anterior foi reproduzido antes da correção. Identificadores e valores reais permanecem exclusivamente no registro privado; reservas desconhecidas não foram liberadas nem reconciliadas novamente.

Defeito comprovado corrigido: os avisos editoriais por folha eram acumulados em reviewFindings, mas o retorno do draft continha apenas os achados estruturais globais. Agora ambos chegam ao manifesto, com IDs originais. Isso invalida o plano acima por alteração da revisão de código.

Testes offline verificam contrato HTTP, JSON string/objeto, respostas inválidas, todas as sete propriedades de metadados solicitadas, reconstrução EN/ES, compilação MDX real, referências, equações, falhas, checkpoints e duplicação. Rascunhos simulados permanecem em diretórios temporários; o ledger operacional não é utilizado para executar mocks.

Endpoint/modelo e JSON Mode confrontados com https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/ e https://developers.cloudflare.com/workers-ai/features/json-mode/ . Nenhuma consulta autenticada, verificação de credenciais remotas ou inferência real foi feita. Compatibilidade de contrato e sucesso simulado não garantem disponibilidade, fluência ou resposta completa do modelo real. Revisão humana continua obrigatória.

## Melhorias editoriais e primeiro piloto revisado — 26/10/2026

Cópias de uma execução de revisão privada em `i18n/storage/editorial-review/<run>/revision-001/`. Os artefatos originais, manifesto original e financeiro permanecem intactos. O manifesto novo documenta trechos antes/depois; revisão humana permanece pending. Não há aprovação científica automática.

`editorial.ts` localiza apenas decimais inequívocos de prosa presentes na fonte (uma ou duas casas decimais); não toca fórmulas, URLs, identificadores ou separadores ambíguos. As duas fórmulas inglesas deste piloto receberam mudanças pontuais explicitamente autorizadas (0,5→0.5 e 3,6→3.6) somente nas cópias de revisão; o pipeline mantém fórmulas literais e avisa quando exigem localização manual. Espaços internos e Unicode continuam preservados.

Conectores do primeiro/segundo exemplo e padrões gramaticais específicos do piloto geram avisos, nunca reescrita automática. Esses padrões não são detector linguístico completo. Rótulos References/Referencias e atribuição padrão SGES são localizados, preservando entidades, fontes e licenças. A comparação operacional normaliza apenas whitespace ASCII externo e equivalências explícitas desses rótulos; não normaliza estrutura interna. O controlador experimental permanece inalterado.

A saída registra aiAssistance substantial e nota localizada sobre tradução via Cloudflare Workers AI, sem nome/data inventados de revisor. As fontes bibliográficas e respectivos títulos são mantidos. Links para /artigo/ continuam iguais e recebem aviso editorial de destino português.

As melhorias não alteram o payload enviado ao provedor, o agrupamento ou os limites; portanto não mudam a reserva conservadora do mesmo artigo. Mudam a revisão do código e invalidam planos/autorização anteriores: recalcular planejamento antes de qualquer futura execução autorizada. Não houve inferência ou alteração financeira nesta revisão. A fila está apenas desenhada em `docs/I18N_BATCH_QUEUE_DESIGN.md`.

## Fila operacional v1

Comando `bun run i18n:batch`, descrito em docs/I18N_BATCH_QUEUE_DESIGN.md. Compartilha executeReserved com a CLI individual e o mesmo ledger. Acrescenta eventos compatíveis batch-reserve/batch-start/batch-cancel, sem reescrever eventos antigos. Planos anteriores são invalidados pela alteração da revisão do código. Parcelas de lote são reservadas atomicamente antes do HTTP, sem somar duas vezes o total. Não há aprovação individual adicional por artigo dentro de um lote autorizado.

A retomada só continua parcelas sem dispatch; artigos completos são ignorados. Chamadas despachadas em artigos incompletos não são repetidas. A fila bloqueia histórico com cobrança desconhecida mesmo administrativamente reconciliado. Cancelamento operacional mantém reservas e não reconcilia falhas. O executor agora gera en.review.json e es.review.json além do manifesto agregado, somente para futuras execuções; artefatos existentes não foram modificados.
