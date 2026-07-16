# Backup e recuperação da newsroom

## Backup

```bash
bun run storage:backup
bun run storage:backup -- --apply
bun run storage:verify
```

O dry-run informa contagens e checksum. Com `--apply`, o driver local grava um
objeto privado em `exports/`. O snapshot contém manifesto, checksums,
documentos estruturados, auditoria e objetos privados; não inclui segredo
administrativo, cookie, token, mídia externa ou texto integral de matéria.

Decisões humanas e auditoria têm prioridade de retenção. A retenção mínima
operacional deve cobrir a janela de rollback e uma restauração validada; prazo
definitivo depende de política aprovada.

## Restauração

```bash
bun run storage:restore
bun run storage:restore -- --apply
```

Sem `--apply`, nenhuma escrita ocorre. O restore valida schema e checksums,
recusa divergências e importa apenas ausências. Uma restauração nunca deve ser
executada sobre mutações ativas.

Procedimento:

1. bloquear execução mutável e registrar o incidente;
2. selecionar snapshot e conferir hash fora do ambiente afetado;
3. executar restore em ambiente isolado;
4. validar contagens, relações, decisões, auditoria, locks e objetos;
5. executar testes de contrato e smoke;
6. promover somente após revisão humana;
7. manter o estado anterior disponível para rollback.

## Falhas e rollback

Migration inválida ou destrutiva é bloqueada antes da aplicação. Importação com
conflito não escreve documentos. Transações locais restauram snapshots em
falha; D1 usa batch transacional. Se a recuperação falhar, mantenha a Central
indisponível para mutações, preserve evidências e volte ao último snapshot
verificado. Nunca resolva conflito de decisão humana por last-write-wins.

Nenhum backup remoto ou teste de produção foi executado nesta Sprint.
