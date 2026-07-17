# Ambiente de staging

## Estado

O repositório está preparado para staging, mas nenhum worker, banco D1, binding,
segredo, domínio ou deploy remoto foi criado ou validado. A validação executável
usa o emulador D1 e fixtures sanitizadas. Produção permanece intocada.

## Arquitetura

O build Nitro usa preset `cloudflare-module`, entrypoint
`.output/server/index.mjs`, assets em `.output/public` e o binding público
`ASSETS`. O template `cloudflare/wrangler.staging.template.jsonc` adiciona o
binding privado `NEWSROOM_DB`; seu `database_id` é um placeholder deliberado.
O arquivo gerado com ID real vive em `.wrangler/`, ignorado pelo Git.

Staging exige `VITE_APP_ENV=staging`, URL HTTPS explícita,
`NEWSROOM_ENVIRONMENT=staging` e `NEWSROOM_STORAGE_DRIVER=d1`. O banco, a URL e
os segredos devem ser distintos dos de produção. Indexação, agenda, coleta,
tradução, orquestração, notificações, anúncios, analytics e publicação ficam
bloqueados.

## Comandos locais seguros

```bash
bun run staging:check
bun run staging:validate
bun run staging:smoke:local
bun run staging:provision
bun run staging:migrate
bun run staging:migrate -- --apply
bun run staging:seed
bun run staging:seed -- --apply
bun run staging:recovery:test
bun run staging:rollback:plan
```

`staging:check` reutiliza a validação determinística de configuração.
`staging:smoke:local` executa o smoke do worker já compilado, sem abrir porta e
sem acessar a rede.

`--apply` nos comandos acima afeta somente um emulador novo em memória. O plano
de provisionamento apenas imprime instruções; não chama a Cloudflare.

## Provisionamento futuro autorizado

1. Executar `staging:provision` e revisar cada comando.
2. Criar exclusivamente `sul-global-newsroom-staging`.
3. Registrar o ID retornado fora do Git.
4. Gerar `.wrangler/staging.generated.json` com `staging:config`.
5. Cadastrar `NEWSROOM_ADMIN_SECRET` como secret do ambiente protegido.
6. revisar status e aplicar migrations somente em staging;
7. executar seed sanitizado somente após confirmação;
8. implantar manualmente o worker de staging;
9. executar `staging:smoke` com variáveis protegidas.

Nenhuma etapa concede autorização para produção.

## Lacunas conhecidas

- conta, ID do D1, URL e secret não foram fornecidos;
- migrations e D1 foram validados somente pelo contrato/emulador;
- o runtime remoto, a Central e o smoke remoto não foram testados;
- rollback de worker depende do histórico de versões da conta Cloudflare;
- autenticação permanece single-secret, sem identidade multiusuário.
