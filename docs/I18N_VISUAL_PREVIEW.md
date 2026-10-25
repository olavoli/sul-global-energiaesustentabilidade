# ART-033 — prévia local e automação visual

## Abrir no Chrome do Windows

Servidor exclusivo do laboratório no clone Linux de release. Não é o servidor público nem uma rota nova do portal:

- Índice: http://localhost:8093/
- PT: http://localhost:8093/artigo/terras-raras-os-17-elementos-que-movem-a-tecnologia-parte-1
- EN: http://localhost:8093/en/article/rare-earths-17-elements-technology-brazil-part-1
- ES: http://localhost:8093/es/articulo/tierras-raras-17-elementos-tecnologia-brasil-parte-1

O seletor no cabeçalho percorre as três edições **somente neste laboratório**. O aviso informa que EN/ES não foram publicados/aprovados. A data de publicação dos drafts não é inventada: a byline identifica o rascunho como não publicado. O servidor só escuta loopback, restringe Host, aplica no-store e noindex/nofollow/noarchive. Arquivos protegidos são negados pelo servidor de desenvolvimento. Não compartilhar por túnel, abrir firewall ou servir este laboratório em produção.

No Ubuntu:

```sh
cd /home/imagine_sol_sus/projetos/sul-global-art033-release
bun run content:generate
bun run preview:i18n
```

Manter o terminal aberto; Ctrl+C encerra. Se necessário, colocar os diretórios Linux de Node/Bun no PATH antes dos comandos. A porta é estrita: se ocupada, identificar o processo, sem matar servidores alheios. Acesso Windows localhost foi conferido por HTTP com Accept text/html: 200 e X-Robots-Tag noindex.

## Limites e segurança da prévia

`preview-server.ts` usa uma configuração Vite separada, sem carregar o roteador de produção ou adicionar file routes. O entrypoint de revisão reutiliza ArticleDetailView, MDX, imagens, cabeçalho, menu móvel e rodapé reais. Uma injeção de navegação de apresentação fornece equivalentes locais sem alterar os filtros públicos. Metadados de origem continuam draft/pending; nenhuma representação é marcada como published para renderizar.

`previewOnly` desativa publicidade, TTS, comentários e newsletter apenas neste laboratório, evitando tráfego/efeitos reais. Os componentes desses serviços não são alterados. Outras páginas institucionais/categorias não são simuladas: seus links são preservados, mas fora das três edições o laboratório mostra seu índice explicativo. Não confundir isso com testes de status HTTP das rotas reais, cobertos pelos smoke tests de produção/preview.

A prévia é montada no cliente: não substitui testes de SSR/hidratação do portal. Usa o CSS real e as fontes de fallback locais; não solicita as fontes remotas Google do shell público. Assim, capturas aprovadas aqui cobrem este harness, não identidade pixel a pixel com produção. O teste bloqueia qualquer requisição externa e falha se houver tentativa; anúncios não são carregados nem clicados.

## Automação

Dependência de desenvolvimento Playwright, com Chromium fixado pelo lockfile. Resoluções: 1440×900, 768×1024, 390×844 e 360×800, para PT/EN/ES (12 casos).

```sh
node node_modules/playwright/cli.js install --with-deps chromium --only-shell
bun run test:visual
bun run report:visual
```

A instalação de bibliotecas do SO exige privilégios no Ubuntu; não inserir senhas em scripts. O relatório HTML fica em playwright-report e screenshots/traces em test-results/visual, ambos ignorados pelo Git. O CI executa um job visual independente e publica ambos como artefato `art033-visual-report` por 14 dias, inclusive em falhas. Nenhum teste é considerado aprovado se o navegador falhar ao iniciar.

Cobertura mecânica: quatro imagens decodificadas, uma Nota de Transparência, idioma do artigo, largura do documento, caixas de títulos/figuras/corpo/rodapé, sobreposição entre controles principais do cabeçalho, foco e Enter no seletor nativo, menu dentro do viewport, links equivalentes e navegação PT/EN/ES, erros de console/pageerror e ausência de requests externos/iframes. Captura completa e captura do seletor são anexadas ao relatório. Verificações geométricas direcionadas não detectam todo tipo possível de recorte/sobreposição; a inspeção humana continua necessária.

## Referências visuais: aprovação pendente

Nenhuma baseline aprovada ou identidade/data de revisor é criada nesta execução. Sem `tests/visual/baselines/approval.json`, os testes executam as verificações e geram **candidatas NÃO APROVADAS**, com anotação `baseline-pending`. Isso não equivale a aprovação visual nem comparação de regressão aprovada.

Após a aprovação expressa do responsável, uma tarefa posterior pode copiar as 12 capturas aprovadas para `tests/visual/baselines/<projeto>/<idioma>.png`, e registrar approval.json com approvedBy, approvedAt reais e scope `ART-033 PT EN ES four viewports`. Só então o teste ativa `toHaveScreenshot`, exigindo todas as referências presentes. `updateSnapshots: none` impede criação/atualização automática de referências em execução normal/CI. Não executar --update-snapshots para aprovar imagens silenciosamente. Novas diferenças exigem revisão explícita.

Para sua única revisão inicial: abrir o índice, escolher PT/EN/ES no seletor e usar as quatro dimensões no modo responsivo do Chrome, zoom 100%. Conferir títulos longos, navegação por teclado, imagens/legendas, bibliografia e transparência até o rodapé. Registrar as resoluções e eventuais problemas observados; não é preciso alterar metadados editoriais para navegar.

## Estado local inicial

O Chromium foi baixado, mas sua primeira execução falhou antes de abrir página por ausência de libnspr4.so (há outras bibliotecas do SO listadas pelo install-deps --dry-run). `sudo -n true` exige autenticação interativa. Não se contornou esse requisito: a execução local é bloqueada até instalação administrativa dessas dependências. A prévia HTML continua acessível pelo navegador Windows. Resultados efetivos do runner CI devem ser consultados no PR; falha local não é declarada sucesso.

Documentação oficial: https://playwright.dev/docs/ci e https://playwright.dev/docs/test-snapshots .

Gates locais: typecheck e lint aprovados; suíte completa sem servidor concorrente: 879 aprovados, zero falhas (13,98 s). Na execução anterior, com o servidor ativo, houve 878 aprovados e timeout de 30 s no teste workerd de Kit. Não se alteraram Kit, timeouts, testes ou configuração de workers; contenção de recursos é hipótese, não causa comprovada. O CI executa novamente a suíte em runner limpo.

### Diagnóstico complementar do navegador local

A ausência de sudo não foi contornada com privilégios: foram baixados pacotes oficiais e extraídas bibliotecas **somente em diretório temporário**, sem executar instaladores ou alterar pacotes/configuração do SO. Foram usados libnspr4, libnss3, libasound2t64 e fontes Liberation/FreeFont. O Chromium iniciou com LD_LIBRARY_PATH e FONTCONFIG_FILE definidos apenas para o processo de teste. A instalação administrativa padrão continua sendo o procedimento permanente documentado acima; o cache temporário não entra no commit.

Nesta sessão, é possível repetir a execução temporária assim (enquanto os arquivos /tmp existirem):

```sh
LD_LIBRARY_PATH="$(cat /tmp/sul-global-browser-library-path)" \
FONTCONFIG_FILE="$(cat /tmp/sul-global-browser-font-config)" \
bun run test:visual
```

O primeiro CI com navegador teve 10 casos aprovados e uma falha de medida de largura em EN/360 px, antes do último caso. A investigação reproduziu uma leitura de scrollWidth 390 com todos os retângulos dentro de 360 após a rolagem de imagens; outras leituras assentadas retornaram 360. O teste passou a medir após dois paints, depois de decodificar imagens e retornar ao topo, e anexa geometria + captura completa se houver overflow. A condição de largura, os timeouts e os limites de tolerância não foram ampliados. O resultado final da nova execução é registrado no PR; as capturas continuam candidatas.

A espera por paint não resolveu a falha. O diagnóstico com scroll containers identificou o quarto ponto-chave EN: a expressão refinamento/separação/manufatura em inglês ocupava scrollWidth 329 px numa coluna de 262 px; documento total 390 px num viewport 360. A correção usa a regra existente de quebra de palavras nos pontos-chave EN/ES, sem modificar seu texto nem esconder overflow; PT mantém a regra anterior. O teste também aguarda explicitamente pontos-chave e referências, além das imagens, antes de medir/capturar, para não aprovar uma renderização ainda incompleta.

Resultado local após a correção: 12 testes Playwright aprovados (1,8 min), nas quatro resoluções e três idiomas, com teclado/toque, sem erros de console ou requisições externas. Capturas são candidatas, sem aprovação humana ou comparação com baseline ainda.

Relatório local nesta sessão: http://localhost:9323/ (iniciado com `bun run report:visual --host 127.0.0.1 --port 9323`). Prévia e relatório responderam HTTP 200 a consultas feitas pelo Windows. A prévia não exibe recomendações de outros artigos; os dados publicados, o algoritmo de relacionados e os serviços do portal não são alterados. Gates após a correção: 12 testes editoriais focados, typecheck, build e smoke multilíngue aprovados.

A execução CI posterior teve quality aprovado, mas o servidor isolado não respondeu à readiness em 120 s, antes de qualquer teste do navegador. O helper foi ajustado para Node Linux 24 explícito (Vite), com logs de início/prontidão e Node 24 no job visual. O limite de 120 s não foi aumentado. Essa alteração é restrita ao laboratório; não muda runtime/configuração de produção. A causa da inicialização intermitente sob Bun não foi afirmada como comprovada.

Incidente de escopo: um teste de inicialização direta herdou o cwd Windows e o Vite atualizou seu cache ignorado node_modules/.vite (25/10/2026, 04:52 UTC). O processo foi interrompido; nenhum comando de geração/edição de conteúdo foi executado ali e nenhum cache/arquivo preexistente foi apagado. O helper agora resolve root e aliases a partir de import.meta.url, não de process.cwd(). A inicialização a partir de /tmp foi validada com Node Linux 24, health 200 e entrypoint do clone Linux 200. Esse incidente é registrado, sem declarar que o repositório Windows ficou totalmente intocado.
