# O que é potência — revisão dos rascunhos EN / ES

## Escopo e estado

Revisão assistida por IA, não aprovação editorial humana. As cópias corrigidas estão em `content/translations/en/o-que-e-potencia.mdx` e `content/translations/es/o-que-e-potencia.mdx`, como draft / writing / translationReview pending. Nenhuma data, identidade de revisor humano, aprovação ou publicação foi inventada. Os artefatos originais, manifestos e registros financeiros permanecem privados e inalterados. Nenhuma inferência foi repetida.

O PR #14 ainda está aberto, MERGEABLE / CLEAN, quality e visual aprovados no commit 02a4f77. Não foi integrado: falta a decisão de merge, não há bloqueio técnico reportado. Esta revisão parte da main e não incorpora nem depende do código free-only desse PR.

## Disposição individual dos 19 avisos originais

IDs referem-se aos segmentos da tentativa original, não aos offsets depois da formatação. Cada linha corresponde a um aviso do manifesto, inclusive os repetidos por local.

| #   | Idioma / aviso / segmento                      | Original ou evidência                                                                          | Correção / disposição                                                                                                                    |
| --- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | EN connector-possibly-omitted s30              | PT: “No segundo,”; EN passava diretamente à segunda equação                                    | Restaurado “In the second case,”. Omissão objetiva corrigida.                                                                            |
| 2   | EN grammar-suspect-en s49                      | “The magnitude continues to represent the same idea”                                           | “The physical quantity still represents the same idea”. Grandeza física, sem alterar definição.                                          |
| 3   | EN grammar-suspect-en s54                      | “A more powerful equipment”                                                                    | “A more powerful device”. Corrigido uso de substantivo incontável.                                                                       |
| 4   | EN grammar-suspect-en s61                      | “Why no machine is 100% efficient?”                                                            | “Why is no machine 100% efficient?”. Corrigida interrogativa no link do corpo.                                                           |
| 5   | EN negation-modality-mineral-caveat s61        | PT “nenhuma”; EN “no machine”                                                                  | Negação preservada; alerta heurístico não prova divergência. Interrogativa corrigida na linha 4.                                         |
| 6   | EN negation-modality-mineral-caveat s64        | “Podemos resumir assim:” / “We can summarize it like this:”                                    | Equivalência preservada. Falso positivo: a heurística não reconhece “Podemos” como modalidade PT. Sem corte de “can”.                    |
| 7   | EN negation-modality-mineral-caveat s68        | PT “em quanto tempo essa energia pode ser transferida”; EN “how long it takes to transfer ...” | “over what time interval that energy can be transferred or transformed”. Restabelecida modalidade explícita, mantendo a negação inicial. |
| 8   | EN grammar-suspect-en s77                      | Mesma pergunta mal formada na lista final                                                      | Mesma correção da interrogativa, neste segundo local.                                                                                    |
| 9   | EN negation-modality-mineral-caveat s77        | “nenhuma máquina” / “no machine”                                                               | Negação equivalente; falso positivo, com correção gramatical da linha 8.                                                                 |
| 10  | EN internal-link-portuguese-target             | /artigo/por-que-nenhuma-maquina-e-100-eficiente                                                | URL real preservada; rótulo indica “in Portuguese” nos dois links. Aviso informativo permanece.                                          |
| 11  | EN internal-link-portuguese-target             | /artigo/o-que-e-energia                                                                        | URL real preservada; rótulo indica “in Portuguese”. Aviso informativo permanece.                                                         |
| 12  | EN protected-formula-decimal-locale-review s31 | 0,5 h na equação do segundo aparelho                                                           | Localização editorial pontual para 0.5 h. Valor e equação equivalentes; não se alterou o protetor do pipeline.                           |
| 13  | EN protected-formula-decimal-locale-review s42 | 1 kWh = 3,6 MJ                                                                                 | Localização pontual para 3.6 MJ. Equivalência numérica testada.                                                                          |
| 14  | ES grammar-suspect-es s8                       | “¿Qué es potencia?”                                                                            | “¿Qué es la potencia?”. Artigo definido no subtítulo de seção.                                                                           |
| 15  | ES connector-possibly-omitted s30              | Ausência de “No segundo,” antes da segunda equação                                             | Restaurado “En el segundo caso,”.                                                                                                        |
| 16  | ES grammar-suspect-es meta:title               | “¿Qué es potencia y ...?”                                                                      | “¿Qué es la potencia y ...?”.                                                                                                            |
| 17  | ES grammar-suspect-es meta:seoTitle            | “¿Qué es potencia? ...”                                                                        | “¿Qué es la potencia? ...”.                                                                                                              |
| 18  | ES internal-link-portuguese-target             | /artigo/por-que-nenhuma-maquina-e-100-eficiente                                                | Destino preservado e idioma indicado: “en portugués”. Aviso informativo permanece.                                                       |
| 19  | ES internal-link-portuguese-target             | /artigo/o-que-e-energia                                                                        | Destino preservado e idioma indicado: “en portugués”. Aviso informativo permanece.                                                       |

## Outras correções objetivas

- ES: `quilovatio` / `quilovatio-hora` → `kilovatio` / `kilovatio-hora` em texto, pontos-chave, alt, resumo e descrição SEO; símbolos kW e kWh não mudam. Concordância “por sí sola” para potencia. Perguntas com artigos definidos, “Sin tener en cuenta las diferencias de eficiencia” e “factura de electricidad”.
- EN: alt da Hero usa “different power levels”, mantendo a mesma carga, altura e os tempos 10/30 s.
- Ambas: `aiDisclosureMode: detailed` ativa o mecanismo já existente, exibindo integralmente a procedência Cloudflare Workers AI / Meta Llama 3.3 70B e a revisão humana pendente. Antes, a nota gerada estava no campo, mas o template mostrava apenas o resumo padrão. Não há nova licença ou declaração de revisão humana.
- Autoria, categoria, tags padronizadas, quatro fontes estruturadas, títulos bibliográficos originais, URLs e licenças preservados. As notas das fontes permanecem em PT para preservar a identidade dos registros exigida pelo gerador. O componente compartilhado SourceList também exibe essas notas e seus rótulos em português; esta limitação de interface está registrada, não é uma tradução integral desse componente. Não se modificou o componente nem o contrato de fontes para acomodar apenas este artigo.
- Texto dentro das imagens raster permanece em português; não se editaram imagens. A adequação visual ao leitor EN/ES deve ser aceita editorialmente, sem apresentar o raster como traduzido.

## Integridade científica e decisões pendentes

Potência média P = ΔE / Δt; W = J/s; E = P × t; 1 kW × 1 h e 2 kW × 0,5 h continuam produzindo 1 kWh. Uma hora continua sendo 3.600 segundos / 3,600 seconds; 1 kWh = 3,6 MJ / 3.6 MJ. Potência não é energia nem eficiência; maior potência por si só não implica maior consumo ou eficiência. Não houve nova apuração científica, alteração da tese ou modificação do português.

Correções lexicais, gramaticais, da omissão e da apresentação foram aplicadas por assistente com base no original. Nenhum falso positivo foi apagado dos manifestos. Os dois avisos de links por idioma continuam verdadeiros e explicitamente sinalizados ao leitor. Permanecem para decisão humana: aprovação integral da qualidade linguística e visual, aceitação dos links/imagens em PT e eventual publicação. Não há falha estrutural conhecida; isto não é certificação científica nem aprovação editorial automática.

## Prévia isolada

```sh
cd /home/imagine_sol_sus/projetos/sul-global-art033-release
I18N_PREVIEW_ORIGINAL=o-que-e-potencia I18N_PREVIEW_PORT=8094 bun run preview:i18n
```

- EN: http://localhost:8094/en/article/o-que-e-potencia
- ES: http://localhost:8094/es/articulo/o-que-e-potencia
- Comparação PT: http://localhost:8094/artigo/o-que-e-potencia

O harness existente é reutilizado, selecionando o original por variável local; o padrão ART-033 permanece. Não há rota pública nova nem flexibilização de filtros. O seletor só oferece as três edições correspondentes. Loopback, noindex/nofollow/noarchive, no-store e bloqueio de serviços externos preservados; diretórios financeiros privados foram explicitamente negados pelo servidor Vite. Não compartilhar por túnel.

A prévia reutiliza componentes MDX, cabeçalho e rodapé reais. Navegação externa ao trio não simula conteúdo traduzido: abre o índice do laboratório. Não confundir a prévia com aprovação de rotas públicas ou SSR.

## Validação

- 13 testes focados aprovados; schema de ambas as edições, compilação MDX e renderização com componentes editoriais reais aprovados.
- Typecheck aprovado no clone de release.
- Candidato limpo equivalente ao CI: 1.075 testes, zero falhas, 7.152 assertions (34,64 s); lint geral sem exclusão de fontes, content:validate e build de produção aprovados. Os 27 avisos preexistentes de demos/rascunhos PT permanecem, sem erros editoriais novos.
- Transparência de execução: a primeira suíte foi disparada com VITE_APP_ENV=production, causando falhas de ambiente. Um teste batch também tentou ler o ledger local já atualizado pelo PR #14 com o schema antigo da main. Por isso foi usada cópia limpa do candidato, sem estado privado, e com contexto Git para o teste git check-ignore. Não se alteraram newsletter, Kit, testes financeiros, histórico ou limites. O resultado aprovado acima corresponde à suíte completa nessa cópia, sem exclusões de testes.
- Smoke SSR local do build de produção: as duas rotas traduzidas devolvem 404, sem canonical de draft; sitemap e RSS EN/ES devolvem 200 sem estas traduções.
- Prévia loopback ativa na porta 8094: três URLs 200, noindex/nofollow/noarchive, no-store; acesso do Windows via localhost confirmado HTTP 200; módulos reais EN/ES processados. Acesso aos caminhos do ledger e do manifesto privado recusado com 403.
- SHA-256: original PT, dois artefatos originais, seus manifestos e ledger/head idênticos ao início. Nenhuma inferência, custo novo, reconciliação, aprovação ou publicação.
- Limitação visual: o Chromium Linux não inicializa por ausência de libnspr4.so. Não foram instaladas dependências nem declarada aprovação visual. O laboratório está acessível no Chrome do Windows para a revisão humana, ainda pendente. Não há baseline visual aprovada por humano.

O catálogo, menu, biografia e blocos de fontes compartilhados conservam partes em português conforme a arquitetura já adotada. A aceitação dessa experiência, dos textos raster e dos links para PT continua sendo decisão editorial. Não há promessa de interface inteira traduzida.
