# ART-032 — homologação local final

## Parecer: NÃO APTO à publicação imediata pelo fluxo oficial

O conteúdo revisado passou em `content:review` (zero erros e avisos). Não foi identificado novo bloqueio científico nesta rodada. O impedimento concreto de preparação é o briefing de pesquisa ausente: a simulação `content:status <slug> review`, sem `--apply`, retorna **Pesquisa ainda não permite review: briefing ausente.** O artigo permanece `draft`, estágio `writing`. Transpor a matriz já concluída para o briefing oficial, sem inventar verificações humanas, é a menor próxima ação; depois validar o gate e seguir as transições oficiais. Não é necessário refazer a pesquisa nem reescrever o artigo.

## Procedência e licença

O responsável editorial confirmou expressamente que a Hero foi gerada com ChatGPT e sem incorporar ativos de terceiros que exijam licença separada. A confirmação foi registrada em `imagens.json`. O schema aceita texto não vazio no campo; foi aplicado exatamente o conteúdo aprovado, com URL simples:

`Saída do ChatGPT (OpenAI), uso conforme Termos de Uso da OpenAI: https://openai.com/policies/row-terms-of-use/`

Trata-se de registro de procedência e condições contratuais, não de licença Creative Commons. A seção Content dos Termos distingue a titularidade do Output, na relação com OpenAI e conforme a legislação aplicável, da responsabilidade do usuário pelos direitos dos insumos. Não se atribui autorização de terceiros. As outras quatro imagens, seus créditos e a Nota de Transparência integral foram preservados.

## Verificações

- 15 referências estruturadas e citações sequenciais, sem fontes órfãs, cobertas pelos testes de ART-032; referências e matriz contêm localização da evidência e classificação dos resultados.
- Título, descrição, slug, canonical, categoria Energia, autoria cadastrada e cinco tags mantidos. O draft permanece excluído do acervo público e da elegibilidade de tags/sitemap.
- Cinco imagens carregadas e originais preservados, com variantes responsivas, textos alternativos e créditos.
- `content:generate` e `content:validate`: zero erros, 27 avisos preexistentes de outros conteúdos; nenhum novo aviso do ART-032.
- `content:review`: zero erros e avisos.
- `content:publish-check`: dois bloqueios intencionais nesta etapa: estado ainda não approved/scheduled elegível e ambiente oficial/URL pública não configurados. Esse comando não substitui a validação de transição que detectou o briefing ausente.
- 232 testes de conteúdo aprovados, zero falhas; 22 testes focados aprovados em execução anterior desta rodada. Typecheck, lint focado, build e `git diff --check` aprovados.
- A checagem HTTP HEAD dos 15 links está registrada em `links-homologacao.json`: 11 retornaram 200, dois 403 e dois não retornaram resposta HTTP no prazo. Recusas a HEAD, timeout e bloqueios de acesso não equivalem a inexistência documental. A matriz registra a evidência científica efetivamente consultada; esta sondagem não certifica disponibilidade permanente dos quatro endereços inconclusivos.

## Conferência visual

Prévia isolada com os componentes editoriais e CSS local de build, servida em memória ao Edge/Playwright: 1440 e 390 px. Não foi exposta rota pública de rascunho. Todas as cinco imagens carregaram; não houve erro de página, corte de imagens, sobreposição nem rolagem horizontal do documento. Nota integral e referências aparecem uma única vez. A tabela utiliza sua área de rolagem horizontal no celular (356 px disponíveis, 640 px internos). Palavras longas quebram em colunas estreitas. Os textos pequenos dos infográficos exigem ampliação no celular; os dados principais também constam no texto. As equações são representadas pelo componente textual atual, sem transbordamento. Capturas `qa-*` e métricas `qa-visual.json` são material local, fora do pacote proposto.

## Pacote e procedimento propostos — não executados

O inventário `arquivos-previstos-publicacao.json` lista seletivamente o pacote atual. Acrescentar o briefing oficial apenas quando corretamente preparado e validado; congelar novamente o inventário antes do staging. Excluir `artifacts/`, `.wrangler/`, secrets, capturas, prévias, geradores locais e todas as alterações de newsletter/Kit/storage/admin não relacionadas. Não usar staging da pasta inteira.

Após preparar o briefing pelo modelo existente, validar `research:status`, promover o estágio editorial corretamente e obter autorização final:

```powershell
# Substituir <slug> pelo slug integral do ART-032; comandos indicativos.
bun run content:review <slug>
bun run content:status <slug> review --apply
bun run content:status <slug> approved --apply
# Configurar o ambiente oficial conforme docs/DEPLOYMENT.md, sem alterar secrets.
bun run content:publish-check <slug>
bun run content:status <slug> published --apply
bun run content:generate
bun run content:validate
bun run typecheck
bun run lint
bun run test
bun run build
git diff --check
# Rever o inventário atualizado e fazer git add -- para cada caminho autorizado.
git diff --cached --check
git diff --cached --name-status
git commit -m "feat(content): publish ART-032 agrivoltaics"
git push origin main
# Acompanhar e exigir aprovação do CI oficial antes do deploy.
$env:VITE_APP_ENV='production'
$env:VITE_PUBLIC_SITE_URL='https://sulglobalenergia.com.br'
$env:VITE_ALLOW_DEMO_CONTENT='false'
bun run build
# Disponibilizar PRODUCTION_D1_DATABASE_ID por meio protegido, sem imprimir o valor.
bun run production:config
bun run production:check
bun run production:dry-run
bunx wrangler deploy --config .wrangler/production.generated.json --keep-vars
$env:PRODUCTION_BASE_URL='https://sulglobalenergia.com.br'
$env:PRODUCTION_TARGET_CONFIRMATION='PRODUCTION-READ-ONLY'
bun run smoke:production
```

As transições não devem ser executadas enquanto o gate de pesquisa não permitir. A autorização desta rodada não inclui qualquer comando de staging, publicação ou deploy. Nenhum foi executado; o status draft foi preservado.
