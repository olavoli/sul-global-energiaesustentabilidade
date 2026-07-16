# Fluxo de pauta estruturada

A Central lista pautas e pode criá-las somente a partir de decisão humana `approved-for-pitch`. Nenhuma tela cria MDX ou artigo.

O pipeline diário não executa `approve-for-pitch` nem `pitch:create`. A inbox pode recomendar revisão, mas somente a ação humana separada e persistida habilita uma pauta estrutural.

Uma pauta só pode nascer de decisão persistida com ação humana `approve-for-pitch`, ator e nota, sem bloqueadores. Aprovação para pauta não é aprovação de artigo.

A pauta guarda título provisório, pergunta central, público, relevância candidata, claims não verificados, URLs primárias/secundárias, incertezas, fact-checks, tradução, mídia, risco jurídico, riscos editoriais e seções genéricas. `knownFacts` começa vazio: claim não vira fato. Nenhum snippet é transformado em texto jornalístico e nenhum MDX é criado.

Atualizações exigem ator e motivo, acrescentam histórico e nunca removem silenciosamente notas ou riscos. Nova fonte, tradução, mudança de cluster, contradição ou reavaliação exigem nova revisão humana antes de mudança de status.
