# Migração da persistência da newsroom

## Escopo

A migração copia somente estado operacional. Conteúdo MDX, autores, schemas,
políticas, fixtures e configuração versionada permanecem no repositório.

O snapshot inclui catálogo e runtime de fontes, fila, quarentena, circuitos,
clusters, claims, evidências, traduções, decisões, pautas, inbox, runs,
auditoria e objetos privados. IDs e histórico são preservados.

## Migrations de schema

As migrations ficam versionadas em
`scripts/newsroom/storage/migrations.ts` e no SQL de referência
`0001_newsroom_core.sql`. A ordem é crescente, a tabela
`newsroom_migrations` registra aplicações e operações destrutivas são
recusadas pela validação.

```bash
bun run storage:migrate:status
bun run storage:migrate
bun run storage:migrate:validate
```

Sem `--apply`, o comando apenas descreve o plano. Nesta Sprint nenhum binding
remoto é aceito pelo CLI local e nenhuma migration de produção foi executada.

## Importação reiniciável

```bash
bun run storage:import
bun run storage:import -- --apply
```

O primeiro comando valida manifesto e checksums sem escrita. O apply cria
somente registros ausentes. Conteúdo diferente sob a mesma chave ou objeto gera
conflito explícito; não há sobrescrita silenciosa. Auditoria é importada por ID
e objetos por chave/hash, tornando a repetição idempotente.

## Sequência futura autorizada

1. congelar mutações da newsroom;
2. gerar export local e verificar checksums;
3. criar backup independente aprovado;
4. aplicar migrations no ambiente-alvo autorizado;
5. executar import dry-run;
6. revisar contagens e conflitos;
7. executar import com `--apply`;
8. validar health, locks, decisões, auditoria e objetos;
9. liberar mutações;
10. preservar o export até o fim da janela de rollback.

Falha em qualquer etapa mantém o driver anterior como autoridade. Não apagar
arquivos locais antes da validação humana do ambiente durável.

## Fluxo de staging

`bun run staging:migrate` descreve o plano e `--apply` registra a migration
somente no emulador efêmero. A aplicação remota deve usar o banco nominal de
staging, após status, backup e autorização no environment protegido. Produção
não é alvo do script ou workflow.
