# Padrões editoriais

## Decisão e pauta

Recomendação algorítmica não é aprovação. `approve-for-pitch` humano cria no máximo pauta privada com claims não verificados e URLs. Pauta não é artigo; antes de review, continuam obrigatórios pesquisa, autoria, fontes, fact-check, conflitos, mídia licenciada e aprovação editorial.

Este documento define o mínimo operacional para conteúdo real. Ele não transforma pautas, templates ou demonstrações em material publicado.

## Taxonomia de lançamento

Os seis slugs atuais permanecem estáveis para preservar URLs:

| Slug                   | Categoria            | Uso                                                      |
| ---------------------- | -------------------- | -------------------------------------------------------- |
| `energia`              | Energia              | mercados, infraestrutura, operação e regulação setorial  |
| `sustentabilidade`     | Sustentabilidade     | clima, biodiversidade, carbono e impactos ambientais     |
| `ciencia`              | Ciência              | pesquisa, evidência, métodos e fronteiras científicas    |
| `tecnologia`           | Tecnologia           | engenharia, equipamentos, software e inovação aplicada   |
| `desenvolvimento`      | Desenvolvimento      | economia, financiamento, políticas públicas e Sul Global |
| `transicao-energetica` | Transição Energética | mudanças sistêmicas, geopolítica e impactos sociais      |

Política energética e Sul Global são eixos transversais, não novas categorias nesta fase. Use tags para ANEEL, ONS, MME, regiões, fontes e tecnologias. Uma nova categoria exige volume recorrente, responsabilidade editorial, diferença inequívoca e plano de migração de URL. Não criar hierarquia profunda.

Tags usam minúsculas, espaços simples e forma canônica em português. O validador rejeita equivalentes conhecidos como `solar` em favor de `energia solar`. Antes de criar tag, pesquise equivalentes e avalie se ela será reutilizada. A lista inicial canônica vive em `src/content/taxonomy.ts`; tags específicas adicionais são permitidas se não forem sinônimos e seguirem a normalização.

## Tipos editoriais

- `news`: fato recente, data do acontecimento, fonte verificável, linguagem objetiva e separação entre confirmado e projetado.
- `explainer`: pergunta central, definição, contexto, exemplos, referências técnicas/institucionais e vocação evergreen.
- `analysis`: tese explícita, fatos separados de interpretação, fontes, riscos, hipóteses e limites.
- `guide`: objetivo educacional, estrutura, pré-requisitos, referências e `reviewedAt` antes de publicar.
- `interview`: entrevistado, contexto, data, edição transparente e autorização confirmada.
- `opinion`: autoria evidente, marcação de opinião e `opinionDisclosure` com vínculos ou declaração de ausência de conflito.

## Fontes

Cada fonte estruturada registra título, URL, organização ou autor, data de publicação opcional, data de verificação, tipo e nota opcional. Tipos: `official`, `academic`, `regulatory`, `company`, `news`, `data`, `interview` e `other`.

O domínio não comprova confiabilidade. Verifique autoria, versão, data, método, contexto e relação com a afirmação. `news`, `explainer` e `analysis` reais publicados exigem ao menos uma fonte estruturada. Fonte demo nunca sustenta conteúdo real. Não inventar fonte, citação, fala, dado ou verificação.

## Workflow no Git

```text
draft → review → approved → published
                   ↘ scheduled → published
published → correction-needed → review → approved → published
published → archived
```

Somente `published`, com data não futura, entra no repositório público. Aprovação é metadata explícita; não há aprovação automática. `approved`, `scheduled`, `archived` e `correction-needed` ficam fora da distribuição. O Git preserva autoria técnica das mudanças, mas a revisão humana precisa ser registrada no processo de revisão. Não há usuários, CMS ou painel administrativo.

## Pré-publicação

Conteúdo real publicado exige aprovação, mídia com licença conhecida e os requisitos do tipo. Patrocínio exige `sponsorName`. Uso substancial de IA exige disclosure. Execute `bun run content:validate`; erros bloqueiam e warnings devem ser lidos, não ocultados.

## Atualizações e correções

`updatedAt` exige `updateNote` ou entrada em `corrections`. Atualização acrescenta contexto sem necessariamente corrigir erro. Correção registra tipo, data, motivo e descrição pública curta. Não incluir deliberação interna sensível. Erro relevante usa `correction-needed` enquanto aguarda revisão e não é apagado silenciosamente.

## Templates e criação

Templates ficam em `content/templates/` e nunca entram no índice. Crie um draft com:

```bash
bun run content:new -- --type news --title "Título provisório" --slug titulo-provisorio --author <autor-verificado> --category energia --date YYYY-MM-DD --tag "energia solar"
```

O comando rejeita sobrescrita, slug inválido, autor/categoria inexistentes e qualquer status inicial diferente de `draft`. Depois, substitua todos os textos provisórios por material apurado; o comando não inventa fontes nem publica.

## Demos

Os 12 artigos atuais permanecem `isDemo: true`, com capas de licença desconhecida. Desenvolvimento pode mostrá-los com aviso. Produção, sitemap e RSS os bloqueiam. Antes do lançamento, confirme a contagem no resumo de `content:validate` e remova ou arquive deliberadamente os demos em uma Sprint própria.

Conteúdo real pode coexistir com demos, mas a home de produção usa somente material real publicável e aceita estado vazio honesto. Autores possuem `demo`, `pending`, `verified` ou `inactive`; somente `verified` permite conteúdo real sair de draft. `pending` pode assinar scaffold/draft, credenciais são opcionais e mudanças de status nunca alteram `isDemo`.

O gate para review exige pesquisa `ready-for-writing`, artigo `review-ready`, fontes confirmadas, fact-checks concluídos, conflitos avaliados e imagem licenciada. Onboarding e briefing permanecem privados e fora da distribuição.
