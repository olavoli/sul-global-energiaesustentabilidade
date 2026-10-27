# Tradução contínua — pronta para validação de ativação, externamente desativada

## Política atual e limites de afirmação

A instrução editorial de 26/10/2026 autoriza implementar tradução e publicação técnica automáticas, sem aprovação por artigo/lote. Isso substitui o gate humano EXCLUSIVO das fases anteriores somente para edições com atestação automática válida. Atestação técnica não é revisão humana nem comprovação científica. Nenhum reviewer ou reviewedAt humano é inventado. O português, os drafts manuais existentes e os rascunhos corrigidos do piloto são preservados.

Estado desta entrega: implementação e testes locais com mocks. Não houve inferência real, validação de credenciais reais, alteração do ledger real, publicação, commit, push, merge ou deploy. Workflows dependem de flags de repositório ausentes/desativadas por padrão. O arquivo config/i18n-automation.example.json é deliberadamente inválido para execução e enabled:false. Não é uma autorização real.

## O que é reutilizado

Mesmos input/payload, Llama 3.3 70B fp8-fast, fronteiras ASCII, assemble, schema, compilador MDX, validações de números/unidades/links/referências e executeReserved do tradutor operacional. Mesmos ledger/head, reservas em nanoUSD e locks. Não há pipeline alternativo, OpenAI, novo banco ou scheduler no Ubuntu. A fila supervisionada continua disponível com sua política estrita batch-unknown-billing; não foi removida.

## Descoberta, validação e decisão

- Varre content/articles, seleciona publicados PT não demonstrativos, compara sourceRevision com EN/ES existentes.
- Traduções publicadas atuais são ignoradas. Alteração da fonte agenda novo trabalho; uma edição automática desatualizada sai do índice público até ser substituída. Edições/drafts geridos manualmente não são sobrescritos: PROTECTED.
- Processa até três artigos novos por ciclo, sequencialmente. Falhas/quarentenas sem novas inferências não consomem as três vagas, evitando bloquear os artigos seguintes.
- Reparos locais estritos para conectores e padrões gramaticais comprovados do piloto. Não reconstrói dados científicos nem altera URLs. Preserva fórmulas da fonte. Não promete correção linguística completa.
- MDX, bibliografia, atribuição/licenças, metadados, esqueleto, números e unidades conhecidos precisam passar. Checagens adicionais detectam GWh/TWh, pares W/J e segundos/minutos. Avisos semânticos não resolvidos entram em quarentena; somente falsos positivos explícitos e restritos do piloto são reconhecidos.
- Depois de compiladas as duas edições, cria status published com translationReview.status automatic, policyId, runId, modelo, versão do validador, codeRevision, sourceRevision, targetRevision, horário e lista de verificações. Datas são decisões técnicas, não datas de revisão humana.
- O gerador revalida targetRevision, fonte, referências e atribuições. O filtro público aceita aprovação humana identificada OU atestação técnica válida. Pending continua excluído. Disclosure informa que não houve certificação científica/revisão humana.
- O alias do provedor identifica Llama 3.3 70B fp8-fast; não se inventa uma versão de pesos que a API não disponibiliza.

## Autorização contínua e orçamento

Autorização protegida global, separada de credenciais e de planos de artigo. Deve conter responsável real, expiração, modelo, preços, limites, âncora de um digest já existente no ledger e política retain-and-cover-worst-case. A âncora impede inicialização com histórico vazio ou truncado. Mudanças da política criam outro evento automatic-authorize; eventos antigos nunca são editados.

Mantém USD10/mês UTC, USD8 regular e USD2 contingência, além do limite anterior de USD0,15 por artigo em todas as tentativas/versões/meses. Artigos longos ou atualizações que não caibam nesse limite ficam bloqueados, não recebem orçamento novo automaticamente. Máximo de duas tentativas por fonte. Retry pago só para falha recuperável com uso integralmente informado; segunda tentativa usa contingência. Timeout/rede incerta não é repetido automaticamente.

Cada chamada automática reserva pelo teto conservador de 24.000 tokens de entrada e 2.500 de saída, não pela média observada. O modelo recebe o limite de saída existente. Todos os limites são conferidos antes da reserva e os despachos ficam ligados à autorização válida. As reservas são retidas; consumo calculado e fatura confirmada continuam separados.

Para cada run, exposição = máximo(reserva integral, consumo calculado, cobrança confirmada, chamadas sem usage × teto conservador por chamada). Exposição desconhecida de meses anteriores é carregada e reduz a margem do mês atual. Reservas externas/experimentos não presentes no livro operacional devem entrar em externalMonthlyReserveNanoUSD; não são presumidas como zero. Para segurança, essa parcela também reduz o pool regular.

Essa política permite novos trabalhos cobertos sem apagar o desconhecido, sem declarar cobrança confirmada e sem reconciliar automaticamente o histórico. A fila batch estrita mantém o bloqueio antigo. A autorização e cada reserva registram a base da cobertura no ledger. Uma cobrança fora do teto, checkpoint inválido ou falha de autenticação interrompe o ciclo. Outros erros de conteúdo isolam o artigo.

O limite é verificável para inferências feitas por este controlador, sob preços/limites declarados e uso exclusivo/contabilizado das credenciais. Não é garantia absoluta da fatura da Cloudflare ou de uso por outras aplicações. Antes de ativar, documentar preços atuais, controles do provedor e exposição externa. CI, armazenamento GitHub, impostos e outros serviços não são apresentados como incluídos nos USD10 de inferência.

## Persistência e retomada sem duplicar cobranças

GitHub Actions é o agendador. Um repositório GitHub PRIVADO separado armazena operations/ com cópia integral do histórico validado, head e artefatos operacionais. Não usar cache, artifact com expiração ou armazenamento público como livro financeiro. Bootstrap exige importar o histórico existente e validar seu digest; nunca criar Genesis novo para recuperar orçamento.

Antes de qualquer inferência, persistir reserve e dispatch em commit remoto privado confirmado. Cada append faz fsync, atualiza ledger/head e aguarda push sem force; o ACK verifica a revisão remota. Falha de persistência impede o HTTP seguinte. Verifica-se também que origin corresponde ao repositório cuja privacidade foi verificada. Concorrência do workflow e lock local protegem o ciclo; push divergente falha fechado. Não há cópia de tokens para esse repositório.

Crash após dispatch sem usage: manter reserva e quarentena da fonte, sem repetir. Runs completos podem ser reutilizados para materialização/publicação sem nova inferência. Arquivos .auto-pending idênticos são recuperáveis; conteúdo pendente divergente é bloqueado. Um erro na publicação não converte a tradução em nova chamada paga. Edições são validadas antes da instalação; o CI impede publicar um conjunto parcial.

## Acionamento e publicação futura

```bash
# Local, offline, sem credenciais nem escrita financeira:
bun run i18n:auto

# Exclusivamente após ativação validada, em runner limpo com estado privado:
bun run i18n:auto --apply
```

O modo mutável exige I18N_AUTOMATION_ENABLED=true, I18N_AUTO_ALLOW_PAID=1, autorização protegida válida, estado privado ancorado, credenciais verificadas e modelo acessível por consulta sem inferência. Apenas definir uma variável não é suficiente. Usar token Cloudflare com Workers AI Write, conta correta e acesso às consultas de verificação; token ativo não garante qualidade nem êxito da inferência.

Workflow i18n-continuous.yml: a cada seis horas ou workflow_dispatch, somente se vars.I18N_AUTOMATION_ENABLED=='true'. Checkout de main confiável, nunca código de PR com segredos. Instala lockfile congelado, restaura estado privado, executa ciclo, typecheck/lint/testes/build e cria PR de conteúdo. O PR solicita merge automático do tipo merge, respeitando os checks e proteções. Não há aprovação humana por edição. Se permissões/regras não permitirem o merge automático, falha sem contornar a proteção.

Workflow i18n-production.yml: desativado enquanto I18N_AUTOMATIC_DEPLOY_ENABLED não for true. Só aceita CI aprovado de push em main, com marcador [i18n-auto] e diff restrito a traduções/índice gerado. Checkout do SHA aprovado, build, production:config, production:check, production:dry-run e deploy oficial com --keep-vars; depois smoke:production. Sem migrações ou alterações de DNS. Fonte portuguesa, newsletter, anúncios e banco não são modificados.

## Configuração externa ainda necessária — não realizada nesta tarefa

1. Revisar e integrar esta implementação à branch confiável com CI aprovado; não ativar código não integrado.
2. Preparar repositório privado de estado, importar o ledger/head/artefatos existentes e validar a âncora. O runner rejeita estado local preexistente para não sobrescrever trabalhos.
3. Documentar os controles de gasto e uso exclusivo, custos externos e preços; preencher autorização real a partir do exemplo, mantendo-a em secret/protected file, não no Git.
4. Configurar I18N_STATE_REPOSITORY e secrets I18N_STATE_TOKEN, I18N_CONTENT_TOKEN, I18N_CONTINUOUS_AUTHORIZATION, I18N_CF_ACCOUNT_ID, I18N_CF_API_TOKEN. Separar credenciais de produção I18N_PRODUCTION_CF_API_TOKEN/ACCOUNT_ID. Nenhuma foi criada ou exposta aqui.
5. Configurar principal GitHub de automação, permissões mínimas, auto-merge do repositório e checks obrigatórios; não usar bypass de checks ou force-push. Confirmar que o token de conteúdo permite disparar CI dos PRs.
6. Validar ambientes i18n-automation/i18n-production e o destino oficial sul-global-production; só então ligar flags. Não houve alteração remota nesta entrega.

## Simulações

Testes cobrem descoberta, fonte alterada, publicação em diretório temporário, índice público, atestação adulterada, retomada sem inferência adicional, retry limitado com contingência, isolamento de falhas, histórico desconhecido preservado, carregamento entre meses, exposição externa, falha de ACK antes do HTTP, credenciais/modelo mockados e flags dos workflows. Nenhuma simulação é apresentada como qualidade linguística, fatura real ou deploy observado.

Verificação final local: 1.069 testes completos aprovados antes dos dois últimos reforços; regressão focada executada após eles. Cobrança não confirmada de qualquer chamada despachada permanece coberta entre meses mesmo com usage recebido. Deploy automático também recusa commit que não corresponde ao topo atual de main.
