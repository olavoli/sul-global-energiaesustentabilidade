# ART-030 — revisão e integração local de imagens

Estado atual em 2026-10-10. Este registro atualiza a situação das imagens descrita em `integracao-local-v3.md`; aquele documento registra a etapa anterior.

## Arquivos conferidos

Origem: `C:/Users/IMAGINE SOL SUS/Downloads/000000000001 Imagens Sul Global/ART 030/`.

- Hero original: `Hero - orc_fabrica_skyline_alta_densa.png`, 2848 × 1600, 7.667.729 bytes. SHA-256 `2043aa84f4f256650747381082f57edc3a7589306c52be3901be1bf2828f00ba`. Cópia local permanece idêntica, sem recompressão.
- Funcionamento escolhido: `Imagem 1 - Infográfico do Ciclo Rankine Orgânico (ORC).png`, 941 × 1672, 1.949.622 bytes. SHA-256 `f251fc9998778981caaa41124952273c1e9a0cfa7b1113d386e350cfd295428a`. PNG íntegro; aproximadamente 9:16, não proporção matematicamente exata. Copiado integralmente como `art-030-funcionamento.png`, mantendo o estilo industrial 3D.
- Comparativo escolhido: `Imagem 2 - Comparativo Visual_ Rankine Convencional e ORC.png`, 941 × 1672, 2.352.220 bytes. SHA-256 `25c556d0b10203da5f1b7afd34c4ba6786c39ed307ce986ad849f13a8e7b3d69`. PNG íntegro; sem manômetros ou gráfico de saturação. NÃO copiado à mídia pública nem inserido no MDX.

Integridade dos três PNGs conferida por decodificação/verificação com Pillow. Correspondência visual conferida nas imagens anexadas ao pedido; os arquivos correspondentes foram identificados pelos nomes e dimensões no disco.

## Revisão científica

Funcionamento: circuito principal representa evaporador → expansor → condensador → bomba → evaporador. Gerador explicitamente fora do circuito do fluido e mecanicamente ligado ao expansor. Sem faixas numéricas de eficiência ou gráfico termodinâmico. Aceito para integração local como representação conceitual do ciclo básico subcrítico; não como desenho de engenharia. Base: referência estruturada de Quoilin et al. já verificada no artigo.

As expressões alta/baixa pressão são relativas entre os lados do circuito. Temperatura e estado após a expansão dependem do projeto. A forma pictórica do resfriamento não deve ser usada para especificar equipamento ou tubulação real. A legenda explicita essas limitações e os consumos auxiliares. Escolha visual não equivale à aprovação para publicação; permanecem revisão editorial e direitos/proveniência.

Comparativo: embora remova o gráfico inválido, sua tabela descreve turbina a vapor como projetada para água em alta temperatura, sem limitar esse enunciado a um exemplo. A divisão alta versus baixa/média temperatura pode ser lida como requisito exclusivo das tecnologias. A própria tabela HTML do artigo explica que as condições dependem do projeto. A arte também contém tabela que duplica o elemento que deve permanecer em HTML. Não integrar como versão final. Corrigir enunciados e retirar a tabela incorporada, preservando uma comparação pictórica e a qualificação de projeto. Uma legenda não corrige textos dentro do raster.

## Legendas e acessibilidade

Hero mantém: “Ilustração conceitual gerada por IA de recuperação de calor industrial; não representa uma instalação documentada.”

Funcionamento integrado: “Ilustração conceitual gerada por IA do ORC básico subcrítico, sem representar instalação real. Alta e baixa pressão são relativas ao circuito ilustrado; condições de temperatura e estado na saída do expansor dependem do projeto. O resfriamento constitui um circuito separado. A bomba e os demais auxiliares consomem energia.”

Alt do funcionamento: “Esquema conceitual do ORC: evaporador, expansor, condensador e bomba formam o circuito fechado; o gerador é acionado pelo eixo do expansor, fora do circuito do fluido.” O texto HTML do artigo fornece a explicação acessível completa. Figure usa dimensões reais, espaço reservado, object-contain e lazy loading. Não atribuído nome de ferramenta de IA, autor da arte ou licença sem confirmação.

Legenda futura do comparativo, somente após correção: “Ilustração conceitual gerada por IA de duas arquiteturas Rankine; as condições de temperatura, pressão e rendimento dependem do fluido e do projeto. Não representa instalações documentadas.”

## Estado editorial

Há duas imagens locais integradas: hero e funcionamento. A terceira está bloqueada. Texto V3, cinco pontos-chave, tabela, Callout e cinco fontes preservados. Artigo permanece draft, sem aprovação/data de publicação, excluído das consultas públicas, busca, sitemap e RSS pelo mecanismo existente. Licença da hero permanece pending. Nenhuma alteração em produção, componentes globais, artigos anteriores, banco ou artifacts/.
