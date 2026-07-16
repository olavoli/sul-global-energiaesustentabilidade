# RelatÃ³rio diÃ¡rio da newsroom

Cada execuÃ§Ã£o produz uma visÃ£o JSON e Markdown com fontes verificadas, saÃºde, itens, duplicatas, quarentena, clusters, decisÃµes, revisÃµes, traduÃ§Ãµes, riscos, bloqueadores, cobertura, lacunas, falhas e aÃ§Ãµes recomendadas.

O relatÃ³rio contÃ©m somente contadores, resumo e IDs internos. NÃ£o armazena matÃ©ria, snippet integral, token, cookie, dado sensÃ­vel, opiniÃ£o ou conclusÃ£o factual. Em apply local, vive em `newsroom/reports/`; dry-run imprime sem persistir. No GitHub Actions, a saÃ­da Ã© artifact efÃªmero, nÃ£o commit.

Use `bun run newsroom:report` para gerar uma leitura sem coleta. O relatÃ³rio orienta revisÃ£o humana; nÃ£o Ã© pauta nem autoriza publicaÃ§Ã£o.
