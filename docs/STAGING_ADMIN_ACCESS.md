# Acesso administrativo de staging

Este runbook cobre exclusivamente a credencial administrativa da Central
Editorial no Worker `sul-global-staging`. Ele não autoriza alterações, deploys
ou validações em produção.

## Custódia da credencial

- O valor ativo deve existir como secret `NEWSROOM_ADMIN_SECRET` no Cloudflare
  e em um gerenciador de senhas aprovado, acessível somente aos operadores
  autorizados.
- Durante uma rotação, mantenha o valor em texto puro apenas no prompt
  interativo e na memória do operador.
- Nunca registre o valor no repositório, em arquivos `.env`, argumentos de
  linha de comando, logs, artefatos, tickets, mensagens ou documentação.

## Rotação supervisionada

Na raiz do repositório, autentique o Wrangler na conta correta e execute:

```powershell
$env:CLOUDFLARE_AUTH_USE_KEYRING = 'false'
bunx wrangler secret put NEWSROOM_ADMIN_SECRET --name sul-global-staging
```

Digite a nova credencial somente no prompt seguro. A atualização do secret
publica uma nova versão do Worker de staging e invalida as sessões
administrativas anteriores. Aguarde a propagação antes de validar.

## Validação obrigatória

Depois da rotação, confirme em staging:

1. a tela de login responde com `noindex`;
2. uma credencial inválida é rejeitada;
3. a nova credencial autentica e cria o cookie de sessão;
4. o dashboard e todas as seções privadas carregam com a sessão nova;
5. respostas privadas não permitem cache público;
6. o logout exige a proteção CSRF prevista;
7. o logout revoga a sessão e o cookie antigo passa a responder `401`;
8. nenhuma publicação, agenda ou integração externa foi acionada.

Os testes automatizados e o registro da validação remota ficam em
[STAGING_SMOKE_TESTS.md](STAGING_SMOKE_TESTS.md) e
[STAGING_REMOTE_VALIDATION.md](STAGING_REMOTE_VALIDATION.md). Os controles de
sessão e segurança estão em
[EDITORIAL_CONSOLE_SECURITY.md](EDITORIAL_CONSOLE_SECURITY.md).

## Revogação e recuperação

Se houver suspeita de exposição:

1. rotacione imediatamente `NEWSROOM_ADMIN_SECRET` no Worker de staging;
2. valide que sessões emitidas com o segredo anterior foram recusadas;
3. repita a validação obrigatória acima;
4. registre apenas o incidente e o resultado da validação, nunca a credencial.

Se a credencial for perdida, gere uma nova credencial forte, atualize o secret
por meio do prompt interativo e substitua a entrada no gerenciador de senhas.
Não copie secrets ou credenciais da produção.
