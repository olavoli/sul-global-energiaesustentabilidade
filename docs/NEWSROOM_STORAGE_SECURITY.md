# Segurança da persistência da newsroom

## Controles

- D1 usa statements parametrizados; valores não são interpolados em SQL.
- Chaves locais aceitam somente caracteres previstos e recusam `..`.
- Rotas validam IDs, sessão, ator e CSRF antes de mutações.
- Sessões usam token opaco; apenas o hash identificado pelo segredo fica no
  storage server-side.
- Logout revoga a sessão e expira o cookie.
- Rate limit usa identificador derivado, janela e expiração duráveis.
- Ações concorrentes adquirem lock por entidade; documentos aceitam
  `expectedVersion`.
- O lock global registra owner, run, heartbeat, expiração e fencing token.
- Produção recusa driver local ou binding D1 ausente.
- Auditoria é append-only na aplicação e guarda somente resumos.
- Relatórios, briefings, exports e backups são objetos privados.

## Dados proibidos

Não persistir segredo administrativo, senha, cookie, token, corpo integral de
matéria, HTML arbitrário, imagem externa ou PII desnecessária. Logs e auditoria
não recebem corpo de requisição nem conteúdo editorial integral.

## Ameaças auditadas

SQL injection é mitigada por binding de parâmetros. Path traversal é bloqueado
na chave local. IDOR é reduzido pela autenticação do namespace e validação de
IDs. Session fixation é mitigada por novo token aleatório no login; replay é
limitado por expiração, revogação, CSRF e sessão server-side. Conflitos retornam
mensagem 409 sanitizada. Timeout ou backend ausente falham fechados para a
Central, sem derrubar as páginas públicas.

## Binding e menor privilégio

`NEWSROOM_DB` é binding server-side e nunca deve usar prefixo `VITE_`. O
ambiente futuro deve conceder à aplicação somente acesso ao banco da newsroom.
Conta, database ID, token e segredo não são versionados. Preview e produção
exigem configuração explícita.

## Limitações

A autenticação continua single-secret e não oferece identidade individual
forte. Não há rotação automática de segredo, identidade federada nem fornecedor
de observabilidade. Retenção definitiva, alertas e teste de penetração ainda
dependem de decisão e autorização próprias.

## Isolamento de staging

Staging exige URL, D1 e segredo distintos e nunca aceita `local`. O ID do banco
é materializado apenas em `.wrangler/`. Health é autenticado, retorna somente
driver/versão/estado sanitizados e não revela ID, token, cookie ou segredo.
Esses controles foram validados remotamente; logs de diagnóstico não registram
corpo administrativo nem conteúdo editorial.
