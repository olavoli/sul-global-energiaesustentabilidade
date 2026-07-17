# Smoke tests de staging

## Execução local

Depois de `bun run build`, execute:

```bash
bun run staging:smoke:local
```

Esse comando carrega o worker compilado diretamente, sem abrir porta, acessar a
internet ou exigir credenciais.

## Execução

Configure `STAGING_BASE_URL` fora do Git e confirme o alvo com
`STAGING_TARGET_CONFIRMATION=STAGING-ONLY`. Para testar login e health, forneça
`STAGING_ADMIN_SECRET` como variável protegida. O segredo não integra argumentos
nem logs e o cookie existe somente em memória durante a execução.

```bash
bun run staging:smoke
```

O runner recusa HTTP, localhost e a origem informada em `PRODUCTION_BASE_URL`.
Ele verifica home, Olavo, invisibilidade do draft, robots, sitemap, RSS, páginas
legais, bloqueio anônimo, headers noindex e ausência de 500. Com secret, também
verifica login, dashboard, health privado, persistência do cookie e logout.

Sem URL autorizada, o comando falha antes de acessar a rede. Sem secret, somente
o percurso público/anônimo é executado. Não salvar cookies ou respostas privadas
como artifact.
