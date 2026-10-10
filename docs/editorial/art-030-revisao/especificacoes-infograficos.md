# ART-030 — especificações definitivas dos infográficos

Briefing técnico para produção e revisão; NÃO são artes finais. Dois arquivos separados. Não usar as artes anteriores como bases científicas nem publicar a montagem de referência.

## Requisitos comuns

- Prancheta: 1440 × 2560 px, proporção exata 9:16; RGB/sRGB; fundo claro e alto contraste. Master editável com textos e setas separados; exportação PNG sem perda para revisão. Variantes para web somente depois da aprovação visual, sem ampliar uma imagem de resolução menor.
- Margem segura de 80 px; textos essenciais com pelo menos 72 px, títulos com pelo menos 96 px. Conferir efetivamente a leitura ao reduzir para 360 px de largura; se faltar espaço, reduzir conteúdo e reorganizar, sem diminuir os textos essenciais. Quebras naturais e unidades não separadas do número.
- Diagrama conceitual, sem marcas, instalações identificáveis, manômetros decorativos com números, fotografias sintéticas rotuladas como reais, curvas ou dados de engenharia inventados.
- Usar setas, rótulos e padrões distintos, não apenas cor. Fluxo do fluido: linha contínua com setas; calor: setas próprias; eixo mecânico: linha tracejada identificada; eletricidade: símbolo e seta próprios.
- Não inserir tabela comparativa, cinco pontos-chave, destaque “O Paradoxo da Eficiência” ou exemplo de 150 kW dentro das imagens. Esses conteúdos pertencem ao HTML/MDX.
- Rodapé obrigatório: “Esquema conceitual. Condições de operação dependem do projeto.” Crédito de IA e autoria somente após confirmação factual; identificar geração por IA na legenda quando aplicável.
- Sem requisitos de proporção física entre componentes. Preservar fontes dos textos científicos no registro editorial e na legenda/descrição, sem fonte minúscula ilegível no raster.

## Infográfico 1 — Como funciona o ORC

### Layout e textos aprovados para composição

Título: “Como funciona o ORC”. Subtítulo: “O fluido circula; o gerador recebe trabalho pelo eixo.”

Na área superior: “Fonte de calor” ligada por seta de transferência térmica ao evaporador. Não ligar diretamente gases ou água geotérmica ao circuito do fluido de trabalho. Não colocar temperaturas.

Circuito central fechado, com quatro componentes e ordem inequívoca:

1. “Evaporador” — “Recebe calor e vaporiza o fluido.”
2. “Expansor” — “A expansão produz trabalho mecânico.”
3. “Condensador” — “Rejeita calor e retorna o fluido ao estado líquido.”
4. “Bomba” — “Eleva a pressão do líquido.”

Setas do circuito: bomba → evaporador → expansor → condensador → bomba. Identificar trechos como “Líquido”, “Vapor” e “Após a expansão”, sem sugerir que toda saída do expansor tenha o mesmo estado em qualquer projeto. O esquema é do ORC básico subcrítico; não pretende representar todas as variantes.

Ao lado do expansor: “Gerador”, ligado APENAS por “Eixo mecânico”. Saída elétrica do gerador: “Eletricidade”. Nenhuma tubulação passa pelo gerador.

Do condensador sai uma seta de calor para “Resfriamento: ar ou circuito de água”. Representar o resfriamento separado do fluido de trabalho; não conectar a água do condensador à bomba do ORC. A bomba deve receber um indicador discreto “Consome energia”, sem valor numérico.

Texto alternativo previsto: “Circuito ORC com evaporador, expansor, condensador e bomba; o expansor aciona um gerador por eixo, e o condensador transfere calor ao resfriamento.”

Legenda prevista: “Esquema conceitual do ORC básico subcrítico. O gerador é acoplado ao expansor e não faz parte do circuito do fluido.”

Base científica: registro R2 da revisão, componentes e tecnologias de expansão; conferir cada seta contra a sequência do artigo.

## Infográfico 2 — Ciclo a vapor e ORC

### Layout e textos aprovados para composição

Título: “Ciclo a vapor e ORC”. Subtítulo: “A arquitetura é semelhante; o fluido e o projeto mudam.”

Preferir dois esquemas empilhados, evitando duas colunas com texto estreito no celular. Não transformar a imagem em cópia da tabela HTML.

Painel superior: “Ciclo Rankine a vapor” e “Fluido de trabalho: água”. Mostrar aquecimento → expansão → condensação → bombeamento; gerador por ligação mecânica externa.

Painel inferior: “Ciclo Rankine Orgânico” e “Fluido de trabalho: orgânico, selecionado para o projeto”. Mostrar a mesma arquitetura e a mesma separação entre fluido e gerador.

Fechamento visual comum, sem lista de cinco pontos: “Fonte térmica + fluido + resfriamento definem as condições de operação.”

Não apresentar ORC como universalmente mais frio, de menor pressão, mais compacto, mais barato ou sem umidade. Não indicar água como exigindo temperatura mínima de 350 °C. Não incluir valores de pressão, temperatura ou eficiência.

Não incluir o gráfico fornecido de pressão de vaporização: não há dados rastreáveis e a curva R245fa excede seu ponto crítico. Um eventual gráfico futuro constituiria outro trabalho, com fluido identificado, dados e modelo verificáveis, domínio físico e revisão específica; não faz parte deste briefing.

Texto alternativo previsto: “Dois circuitos Rankine mostram a mesma sequência básica; um utiliza água e o outro fluido orgânico selecionado, com gerador externo ao percurso do fluido.”

Legenda prevista: “Comparação conceitual de arquiteturas. Temperatura, pressão e rendimento dependem do fluido e das condições de projeto.”

Base científica: registro R2 para comparação e seleção; R3 documenta a rejeição do gráfico anterior.

## Hero preservada

Original externo: `C:/Users/IMAGINE SOL SUS/Downloads/000000000001 Imagens Sul Global/ART 030/Hero - orc_fabrica_skyline_alta_densa.png`, 2848 × 1600 px, 7.667.729 bytes. Nesta etapa não foi copiado, convertido, recortado ou alterado. Não utilizar como fotografia de instalação comprovada.

Legenda proposta: “Ilustração conceitual gerada por IA de recuperação de calor industrial; não representa uma instalação documentada.” Confirmar proveniência e direitos antes de aprovar crédito. Variantes futuras devem preservar o original, enquadramento e conteúdo.

## Aprovação das artes

Revisão técnica de circuitos, setas, rótulos e separação de sistemas; inspeção integral e em 360/390 px; contraste e ausência de texto ilegível; proporção 9:16 e arquivo íntegro; nenhuma curva/número fictício; sem repetição dos elementos HTML. Qualquer divergência exige corrigir a arte antes de autorizar integração. A legibilidade real só poderá ser confirmada depois de produzir as imagens.
