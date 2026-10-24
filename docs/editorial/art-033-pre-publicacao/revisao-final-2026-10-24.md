# ART-033 — revisão final local, 24/10/2026

**Estado: draft / writing. Não publicado.** Aplicação limitada às decisões autorizadas; sem staging, commit, push ou deploy.

## Alterações aplicadas e evidências

| ANTES | DEPOIS |
| --- | --- |
| Journal of Hazardous Materials, v. 485, 2025. | Journal of Hazardous Materials, v. 500, 2025. |
| Minerals Engineering, v. 215, 2024. | Minerals Engineering, v. 216, 2024. |
| Science of The Total Environment, v. 912, 2024. | Science of The Total Environment, v. 908, 2024. |
| https://www.energy.gov/sites/default/files/2023-05/2023-critical-materials-assessment.pdf | https://www.energy.gov/sites/default/files/2023-07/doe-critical-material-assessment_07312023.pdf |
| em 2024, a China respondeu por ~60% da mineração, mas dominou 91% do refino e 94% da fabricação de ímãs permanentes sinterizados [1]. | em 2024, para as terras raras magnéticas (neodímio, praseodímio, disprósio e térbio), a China respondeu por ~60% da mineração e 91% do refino; na fabricação de ímãs permanentes sinterizados, sua participação atingiu 94% [1]. |
| Lítio, níquel, cobalto e grafite são essenciais para armazenamento eletroquímico. | Lítio, níquel, cobalto e grafite participam de diferentes cadeias de baterias, conforme a química utilizada. |
| algumas baterias antigas (Ni-MH) | algumas baterias de níquel-hidreto metálico (Ni-MH) |
| O neodímio (Nd) e o praseodímio (Pr) formam a base da liga, enquanto disprósio (Dy) e térbio (Tb) são adicionados para melhorar o desempenho térmico e a coercividade. | A fase magnética característica é baseada em neodímio, ferro e boro; o praseodímio (Pr) pode substituir parte do neodímio (Nd), enquanto disprósio (Dy) e térbio (Tb) podem ser adicionados conforme as exigências de desempenho e temperatura, para melhorar a coercividade e o desempenho térmico. |
| a reciclagem ainda enfrenta barreiras de escala e logística, não substituindo imediatamente a produção primária diante do crescimento da demanda. | a reciclagem ainda enfrenta barreiras de escala e logística, não substituindo imediatamente a produção primária diante do crescimento da demanda [13]. |

## Referências e rastreabilidade

- Preservados os 14 registros, autores, títulos e DOI. Nos itens 9–11, somente os volumes foram corrigidos. Não foram acrescentados números de artigo ou outros metadados não autorizados.
- Duan, antiga referência 13, sustenta a afirmação existente sobre barreiras de reciclagem: PDF integral, p. 80, seção 5. Chamada inserida sem reproduzir os números antigos de sua revisão. Fonte: https://ace.ewapub.com/article/view/11867.pdf.
- Edição definitiva DOE verificada na capa e prefácio do PDF de julho de 2023, 267 folhas. Substituído apenas o link, conservando título/autoria/ano: https://www.energy.gov/sites/default/files/2023-07/doe-critical-material-assessment_07312023.pdf.
- Mapeamento antigo → novo: **5→6, 6→5, 13→12, 12→13**. Primeiras chamadas e lista final sequenciais 1–14; notas dos registros estruturados acompanham o mapeamento.
- Evidências restantes e limites de acesso estão na matriz. DOI ou resposta HTTP não equivalem a comprovação integral do conteúdo; não se declarou conclusão de todas as verificações bibliográficas.

## Preservação e pendências

Autor Olavo Oliveira, nota aprovada integral, cinco pontos-chave, destaque, dez seções, SEO, tags e quatro imagens preservados. **21 Mt** permanecem no texto, alt e imagem por decisão expressa; a sustentação documental continua pendente internamente, sem inserir alternativa no artigo.

O infográfico dos elementos mantém a frase que generaliza a necessidade de Nd/Pr/Dy/Tb, enquanto o corpo distingue aditivos dependentes de desempenho. Não foi redesenhado. A comparação ANM/USGS e sua explicação metodológica permanecem cientificamente não reconciliadas; C02/C03 não foram aplicadas sem autorização específica. Condições de uso das quatro imagens continuam pendentes; origem declarada não equivale a licença comprovada. Metadados adicionais propostos para referências 2/7/8 não foram alterados nesta rodada.

## Validações

- **25 testes focados aprovados, zero falhas** (ART-033, tags e SEO): correspondência de cada parágrafo do Word com somente as substituições autorizadas; nota integral; 14 referências/citações sequenciais; originais de imagens byte a byte; exclusão de draft das rotas públicas, sitemap e RSS.
- **Typecheck aprovado**.
- **Build preview aprovado**, cliente e servidor, sem deploy.
- **content:validate aprovado**: 46 registros, 28 avisos, zero erros.
- **publish-check bloqueado corretamente**: licença pendente, status draft e ambiente oficial não configurado; autoria e schema aprovados. Não contornado.
- **Lint geral aprovado, exit code 0:** `bun run lint --ignore-pattern .wrangler/** --ignore-pattern artifacts/**`. A primeira execução sem exclusões não concluiu e foi interrompida. A execução concluída excluiu apenas saídas/experimentos locais em `.wrangler/**` e `artifacts/**`, sem mudar a configuração nem excluir código-fonte/testes do projeto. Não se registra a primeira execução como aprovada.
- **git diff --check aprovado**.
- Prévia isolada atualizada: http://127.0.0.1:8088/. MDX e componentes reais, desktop 1440 px e celular 390 px: 14 referências, nota única integral, autoria correta e ausência de overflow horizontal (375 px de rolagem para viewport 390 px). Não houve liberação da rota pública nem validação completa da hidratação do template público.

## Arquivos desta rodada

MDX ART-033; índices gerados `articles.ts`/`loaders.ts`; teste `art-033.test.tsx`; matriz e relatório de pendências; este consolidado; registro JSON antes/depois e script de aplicação. O gerador original foi protegido contra sobrescrita posterior da revisão aprovada. Prévia temporária somente em `.wrangler`, fora do inventário de publicação. Outros artigos e alterações locais anteriores preservados. Imagens não regeneradas.

**Prontidão:** rascunho revisado para aprovação visual/editorial, sem declaração de liberação para publicação. Pendências documentais e inconsistências residuais explicitadas acima.
