# Persistência da newsroom

## Decisão

A camada operacional usa contratos TypeScript independentes de fornecedor. O
driver local preserva os arquivos existentes; o driver de produção usa
Cloudflare D1 por binding server-side `NEWSROOM_DB`. Nenhum banco, conta,
binding remoto ou credencial foi criado nesta Sprint.

D1 foi escolhido porque o estado da newsroom exige compare-and-set,
transações, índices, paginação e coordenação consistente. KV isolado não oferece
essas garantias para decisões humanas, locks e filas. R2 seria adequado para
objetos grandes, mas acrescentaria outro recurso remoto; no MVP, relatórios,
exports e briefings ficam como objetos privados versionados no mesmo contrato,
com hash, Content-Type, tamanho e data. O contrato permite separar esses objetos
em R2 no futuro sem alterar domínio, CLI ou Central.

## Fronteiras

- `scripts/newsroom/storage/contracts.ts`: documentos versionados, auditoria,
  sessões, rate limit, locks e objetos privados.
- `LocalFileStorageAdapter`: desenvolvimento, dados legados, escrita atômica,
  backup e detecção de corrupção.
- `D1StorageAdapter`: produção serverless, queries parametrizadas, CAS,
  transações e timeout.
- `MemoryStorageAdapter` e `D1EmulatorStorageAdapter`: testes isolados e
  determinísticos.
- `scripts/newsroom/storage/runtime.ts`: seleção explícita do driver e bloqueio
  de filesystem local em produção.

MDX, autores, pesquisa e configuração versionada continuam no Git. Somente o
estado operacional mutável passa pela abstração.

## Modelo de dados

`newsroom_documents` armazena agregados estruturados por chave, JSON validado,
versão e timestamp. Tabelas próprias guardam migrations, auditoria append-only,
sessões, rate limits e locks com fencing token. Objetos privados são documentos
com corpo, hash SHA-256, tipo, tamanho e data.

Os agregados preservam IDs, histórico, atores, timestamps, vínculos, riscos e
decisões humanas. Texto integral de matéria, segredos, cookies, tokens e imagens
externas não pertencem ao storage.

## Ambientes

| Ambiente    | Driver permitido               | Regra                                   |
| ----------- | ------------------------------ | --------------------------------------- |
| development | `local`                        | padrão local explícito ou implícito     |
| test        | `local`, `memory`, emulador D1 | isolado, sem rede                       |
| preview     | explícito                      | sem fallback silencioso                 |
| production  | `d1`                           | binding obrigatório; `local` é recusado |

O portal público continua baseado no repositório editorial gerado e não depende
da disponibilidade da newsroom.

## Operação local

```bash
bun run storage:health
bun run storage:migrate:status
bun run storage:export
bun run storage:verify
bun run newsroom:daily -- --process-existing --storage local
```

Comandos mutáveis são dry-run por padrão e exigem `--apply`. O CLI local não
recebe binding D1 e, portanto, não executa migration remota.

## Limitações

- nenhum recurso remoto foi provisionado ou validado contra uma conta real;
- relatórios maiores ainda compartilham o backend estruturado;
- filtros da Central continuam limitados aos agregados atuais;
- retenção e limpeza remotas dependem de autorização operacional futura;
- ativar produção exige migration aplicada, binding privado e teste de
  recuperação aprovado.
