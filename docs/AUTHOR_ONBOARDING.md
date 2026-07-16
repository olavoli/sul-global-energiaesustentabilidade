# Onboarding e verificação de autoria

O onboarding coleta apenas informações necessárias ao crédito editorial. Não solicite endereço, documento, telefone, nascimento ou qualquer dado pessoal sensível.

## Fluxo seguro

1. Crie o arquivo privado com `bun run author:new -- <slug>`.
2. A própria pessoa fornece nome público, bio curta, áreas de interesse e conflitos. Cargo, organização, credenciais e links são opcionais.
3. Registre `publicationAuthorized: true` e `truthConfirmed: true` somente após confirmação humana. Credenciais preenchidas também exigem `credentialsConfirmed: true`.
4. Execute `bun run author:validate -- <slug>`. O comando apenas relata e nunca verifica o autor.
5. Faça o dry-run: `bun run author:status -- <slug> verified --verified-at YYYY-MM-DD --verified-by <identificador>`.
6. Após revisar o resumo, repita com `--apply`. O comando cria ou promove o perfil público sem reescrever a biografia fornecida.
7. Substitua o marcador do artigo pelo slug verificado e revise o diff.

`author:list` mostra slug, nome público, estado, demo, data de verificação e quantidade de artigos.

## Público e interno

O perfil público em `content/authors.json` contém `displayName`, bios, função/vínculo opcionais, expertise, credenciais confirmadas, links, disclosure e metadados simples de verificação. O arquivo em `content/author-onboarding/` contém também as confirmações internas de autorização e veracidade; ele não é importado pela aplicação.

Estados: `pending`, `verified`, `inactive` e `demo`. `pending` pode assinar draft, mas não revisão ou publicação. `verified` exige `verifiedAt`. Credenciais são opcionais e sua ausência não bloqueia a autoria. Demo nunca assina conteúdo real.

Não copie biografias, currículos ou links de terceiros. Se a informação não foi fornecida e autorizada, deixe-a ausente e mantenha o autor pendente.

## Primeiro autor real

Olavo Oliveira foi validado pelo schema e promovido em 2026-07-15 com `verifiedBy: founder-authorization`. O perfil não possui imagem, função ou vínculo atual inferido. Biografias, credenciais, áreas, linhas de pesquisa, missão, links e disclosure reproduzem somente a autorização recebida. O piloto usa seu slug, mas continua draft e não constitui publicação.
