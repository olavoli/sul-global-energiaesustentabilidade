# Especificação de Infográfico Editorial

## Briefing mínimo

- Identificador e título.
- Tema e objetivo pedagógico.
- Público e conhecimento presumido.
- Destino, largura de exibição e contexto de leitura.
- Formato e proporção.
- Conteúdo obrigatório e conteúdo proibido.
- Fontes científicas e status de revisão.
- Formatos de entrega.

## Arquitetura narrativa

Toda peça deve ter:

1. uma entrada visual dominante;
2. um fenômeno, sistema ou comparação central;
3. uma ordem de leitura reconhecível sem depender de numeração;
4. uma conclusão visual, saída ou consequência;
5. legenda, fonte e qualificadores necessários.

## Rigor científico

- Distinguir representação literal, esquema e simplificação.
- Preservar direção, causalidade, proporção relevante e estados físicos.
- Usar símbolos, fórmulas e unidades consistentes.
- Não sugerir eficiência, escala ou certeza não demonstradas.
- Identificar recortes conceituais e elementos omitidos quando isso afetar a interpretação.

## Composição

- Preferir uma cena contínua ou sistema espacial coerente.
- Reservar margem editorial e áreas de respiro.
- Evitar caixas independentes conectadas por setas.
- Evitar sobreposição de texto com trajetórias, texturas ou contornos.
- Não repetir no texto aquilo que já está evidente no desenho.
- Limitar níveis tipográficos e códigos cromáticos.

## Acessibilidade

- Contraste compatível com leitura digital e impressão.
- Informação nunca codificada somente por cor.
- Texto alternativo descrevendo mensagem e relações, não cada ornamento.
- Tipografia legível no tamanho real de publicação.
- Ordem semântica e título descritivo em SVG.

## Produção e exportação

- Preservar a matriz aprovada, vetorial ou raster, e produzir derivados sem recomposição que altere a mensagem.
- Não ampliar artificialmente arquivos raster.
- Gerar WebP ou AVIF quando o pipeline suportar, mantendo fallback e fonte editorial quando necessário.
- SVG com `viewBox`, título, descrição e grupos identificáveis.
- Sem imagens externas, fontes remotas ou dependências frágeis.
- Verificar recorte, transparência, perfil de cor e densidade.
- Conferir visualmente cada formato exportado.
- Em telas pequenas, não reduzir peças com texto incorporado até a ilegibilidade; adotar recorte editorial, ampliação ou exploração panorâmica acessível quando necessário.

## Entrega

O relatório deve registrar:

- conceito visual adotado;
- simplificações científicas;
- dimensões e tamanhos;
- formatos exportados;
- validações executadas;
- riscos e pontos que exigem revisão humana.
