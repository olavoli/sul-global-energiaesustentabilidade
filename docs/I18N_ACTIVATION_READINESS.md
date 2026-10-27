# Preparação de ativação — 2026-10-27

Operações externas permanecem DESATIVADAS. Nenhum commit/push ou alteração remota nesta preparação.

## Estado remoto observado

Branch feat/i18n-pt-en-es sincronizada com origin; HEAD 3846b84b9b360f915afa97c0a578c8f4ce55d44c, sete commits à frente de main. PR #13 draft, quality e visual aprovados apenas para esse HEAD, sem cobrir mudanças locais.
Repositório público; allow_auto_merge=false. Nenhum Actions Secret/Variable/environment encontrado. main sem proteção clássica e nenhum ruleset retornado. Portanto o gate obrigatório de CI antes de merge ainda não é garantido remotamente.

## Estado privado preparado

.i18n-private-state/operations contém cópia local de ledger.json, head e review necessário. bootstrap-manifest.json contém SHA-256. Diretório ignorado pelo Git público e permissões privadas. Originais preservados. Não há repositório remoto criado, Git inicializado ou transferência. Não anexar este diretório a PR, Actions artifacts, logs ou ao repositório público.

Para ativar: criar repositório PRIVADO exclusivo com branch main inicializada, validar privacidade por API; importar apenas operations/ da cópia preparada e seu manifesto, com credencial restrita ao repositório privado. Revisar novamente integridade com loadBook e os hashes antes do commit privado. Não gerar novo Genesis. Não colocar credenciais em arquivos ou URLs. O executor verifica privacidade e origin antes de restaurar o estado.

## Configuração externa necessária

Variables do repositório público: I18N_STATE_REPOSITORY=owner/repo-privado; I18N_AUTOMATION_ENABLED=false; I18N_AUTOMATIC_DEPLOY_ENABLED=false. Somente depois da integração/CI e bootstrap seguro, ativar a primeira. Manter deploy desligado até autorização de ativação de produção.

Environment i18n-automation, secrets: I18N_STATE_TOKEN (Contents read/write somente estado privado; metadata read), I18N_CONTENT_TOKEN (Contents/Pull requests read/write no portal; deve disparar CI), I18N_CONTINUOUS_AUTHORIZATION (JSON real validado pelo schema, âncora do histórico, prazo, responsável, exposição externa inclusive experimentos e evidência de controle financeiro), I18N_CF_ACCOUNT_ID e I18N_CF_API_TOKEN (Workers AI Write na conta correta e consultas de verificação). Não usar o token pessoal atual automaticamente como credencial permanente.

Environment i18n-production: I18N_PRODUCTION_CF_ACCOUNT_ID e I18N_PRODUCTION_CF_API_TOKEN, permissões mínimas para consultar versão/configuração e deploy do Worker oficial. Nenhuma migração ou permissão de alterar DNS é requerida. Ambientes sem aprovação humana por execução, porém limitados à branch main e com administração restrita.

Configurar proteção/ruleset de main com quality e visual obrigatórios, proibição de force-push e bypass para o principal de automação. Habilitar allow auto-merge. O bot cria PR, aguarda checks e solicita merge; não executa merge imediato ou bypass. Confirmar permissões de Actions/PR da organização/conta.

Autorização financeira deve manter reservas desconhecidas, inclusive passivos externos ao ledger operacional. Não preencher exposição externa com zero por omissão. Limite local depende de preços e limites de tokens documentados; não é teto absoluto de faturamento Cloudflare ou custos GitHub. Validar controles de gasto na conta antes da ativação.

## Estratégia de integração — ainda não executada

Conjunto EXATO de arquivos candidatos: docs/I18N_INTEGRATION_FILES.txt. Inclui dependências locais ainda não versionadas do pipeline experimental, operacional e batch; não apenas os dois workflows. Documentação histórica permanece identificada como histórica. Exclui todo content/, i18n/storage/, .i18n-private-state/, test-results/, artifacts/, .wrangler/, credenciais e outputs.

Não fazer push direto para main. Revisar cada caminho do manifesto e scan de segredos antes do staging explícito; preferir branch codex/i18n-continuous-activation criada sobre a branch atual, preservando os sete commits publicados sem rebase/amend. PR de integração deve apontar a dependência do PR #13; não integrar pela main antiga nem duplicar alterações fora do escopo. Executar CI sobre o commit efetivo. Somente depois integrar pela política de PR e provisionar estado privado/Secrets. Nenhuma dessas operações foi executada aqui.

## Acionamento

Planejamento offline: bun run i18n:auto. Futuro workflow agendado a cada seis horas, minuto 41 UTC, ou workflow_dispatch, gated por flags. --apply é pago e não foi executado. Publicação/deploy continuam desligados nesta entrega.

## Sanitização para integração

Fixture histórica original preservada integralmente em armazenamento privado ignorado. A fixture pública contém somente identificadores e métricas inventados, datas de teste e cobrança não confirmada. Os testes vinculam âncoras sintéticas apenas no processo de teste; os hashes de integridade de produção não foram alterados; o nome privado de execução foi substituído por descoberta de arquivo único verificado pelo mesmo hash. Relatórios financeiros históricos foram excluídos do inventário público e mantidos localmente/privadamente. A documentação operacional pública omite identificadores e valores de execuções reais.

A revisão dos refs Git alcançáveis e da branch do PR não encontrou a fixture original ou diretórios financeiros privados publicados; não foi identificada necessidade de reescrever histórico. Essa inspeção não afirma acesso a caches ou cópias externas fora do repositório.

Integração autorizada na própria feat/i18n-pt-en-es/PR #13, sem criar branch alternativa ou modificar main. Workflows novos continuam gated por variables ausentes/desativadas. Nenhuma ativação remota faz parte desta integração.
