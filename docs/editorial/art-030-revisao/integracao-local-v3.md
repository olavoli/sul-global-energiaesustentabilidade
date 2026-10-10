# ART-030 — integração local V3

Preparação em 2026-10-10. Não autorizada publicação, commit, push ou deploy.

## Texto canônico e conversão

O arquivo externo `ART-030_consolidado_revisado_v3.md` foi copiado sem alterações para `art-030-canonico-v3.md`. SHA-256: `1fae8d1ddc42a128d7c8a2701455d3eacfe2a8aa6fb4b10a363643393531aff5`.

Criado `content/articles/a-maquina-que-transforma-calor-desperdicado-em-eletricidade.mdx`. Título e subtítulo foram movidos ao frontmatter; os cinco itens para KeyPoints; a tabela para EditorialTable com cabeçalhos semânticos; o destaque para Callout. Os parágrafos V3 permanecem preservados. As referências numeradas foram convertidas para cinco fontes estruturadas na mesma ordem, com citações vinculadas às URLs correspondentes. Não há segunda bibliografia manual.

Autoria local segue o autor existente `olavo-oliveira`; categoria proposta `energia`, tipo `explainer`. Metadados continuam sujeitos à revisão. `createdAt: 2026-10-10` registra a preparação local, não publicação. Não há `publishedAt` ou `approvedAt`. Não foi presumida nova verificação das fontes: `verifiedAt` mantém 2026-10-09, data documentada na revisão.

## Bloqueio editorial existente

`status: draft`, `draftStage: writing`, `featured: false`, licença da hero `pending`. O gerador oficial inclui o rascunho no registro interno e nos loaders. O repositório público filtra status publicado: não há exposição do ART-030 nas listagens, busca, página por slug, sitemap ou RSS. Nenhum componente global foi modificado para implementar esse comportamento.

A rota pública do rascunho deve continuar indisponível; não mudar para published apenas para visualizar. A composição MDX é verificada por renderização estática nos testes locais. Não foi criado endpoint de preview que contorne o bloqueio.

## Hero e revisão de legendas

Hero copiada sem conversão, recorte ou alteração para `public/images/articles/a-maquina-que-transforma-calor-desperdicado-em-eletricidade/art-030-hero.png`. Dimensões: 2848 × 1600. SHA-256: `2043aa84f4f256650747381082f57edc3a7589306c52be3901be1bf2828f00ba`.

Legenda local: “Ilustração conceitual gerada por IA de recuperação de calor industrial; não representa uma instalação documentada.” Ferramenta e direitos não foram atribuídos sem comprovação; não há aiProvenance verificada.

Infográfico 1 não foi copiado ao diretório público nem inserido no MDX. Seu resumo inclui o gerador no circuito; o bloco de cinco tópicos duplica conteúdo HTML; a faixa de eficiência 10–20% não possui condições e fonte específicas. Também requer revisão da distinção gráfica entre circuito de resfriamento e fluido de trabalho. Legenda proposta para uma futura arte corrigida: “Esquema conceitual do ORC básico subcrítico: evaporador, expansor, condensador e bomba formam o circuito do fluido; o gerador é acoplado mecanicamente ao expansor.” Esta legenda não aprova nem corrige o raster atual.

Infográfico 2 não foi copiado ou inserido. Mantém temperatura e pressão como características gerais e o gráfico R245fa além do ponto crítico. Legenda proposta para uma futura arte corrigida: “Comparação conceitual entre ciclo Rankine a vapor e ORC. Temperatura, pressão e rendimento dependem do fluido e das condições de projeto.” Esta legenda não torna os números e curvas atuais aceitáveis.

As especificações anteriores continuam sendo a referência técnica para corrigir as artes. O artigo conserva tabela, pontos-chave e destaque em HTML/MDX.

## Validações executadas

- Oito testes específicos do ART-030 passaram: exclusão pública, estrutura 5/1/1, parágrafos e células V3 preservados, citações/fontes, cópia da hero e hash do canônico.
- Suíte completa: 805 testes, zero falhas, 87 arquivos.
- Typecheck, build e lint do teste e dos índices TypeScript gerados: aprovados.
- Geração oficial e content:validate: 43 artigos, zero erros. A nova advertência de imagem/licença pendente do ART-030 é esperada e permanece registrada.
- Smoke local: 21 endpoints públicos e fluxo administrativo simulado aprovados. A exclusão específica do ART-030 de listagens, busca, consulta por slug, sitemap e RSS foi validada nos testes do repositório em ambos os modos de conteúdo demonstrativo.
- git diff --check: aprovado. Nenhum teste foi executado contra produção ou Kit.

Somente os índices internos gerados passaram a ter diferença em arquivos previamente rastreados; os demais arquivos desta integração são novos. Artigos já existentes e componentes globais permaneceram inalterados. artifacts/ não foi acessado ou modificado.

## Pendências antes da publicação

Revisão do MDX e metadados; duas artes tecnicamente corrigidas; proveniência e direitos da hero confirmados; revisão visual móvel das artes finais; autorização explícita para publicação. O pacote atual é rascunho, não conteúdo pronto para produção. As alegações arquivadas continuam fora do artigo.
