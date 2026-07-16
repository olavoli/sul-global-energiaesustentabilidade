# Tradução assistida da redação

## Uso na decisão

Tradução `queued`, `review-required`, `failed` ou `rejected` não pode sustentar decisão factual e gera bloqueio/ação necessária. O orquestrador não executa provider nem aprova tradução.

## Limites

A tradução atua somente sobre títulos ou snippets de até 500 caracteres já armazenados. O original é imutável. Não há tradução de matéria integral, automática em massa ou destinada diretamente à publicação.

## Providers

- `fixture`: três traduções locais, estáveis e versionadas para demonstração;
- `passthrough`: marca conteúdo já em português como `not-required`;
- `external-placeholder`: contrato explicitamente desabilitado, sem API, SDK, chave ou chamada de rede.

Nenhuma dependência ou serviço externo foi adicionado. Um provider futuro deverá ser autorizado, configurado fora do código e manter o mesmo contrato, logs mínimos e revisão humana.

## Estados e revisão

`queued`, `not-required`, `translated`, `review-required`, `approved`, `rejected` e `failed` formam a fila privada. Execução de fixture termina em `review-required`. Aprovação, rejeição e retry exigem ator e notas; ações mutáveis exigem `--apply`. Aprovação de tradução não aprova pauta, draft ou publicação.

O glossário `newsroom/glossary.pt-BR.json` é mínimo, técnico e versionado. Toda decisão registra provider, versão, tentativas, timestamps e histórico.
