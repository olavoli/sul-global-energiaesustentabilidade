# ART-030 — proveniência e base documental das imagens

Registro local em 10/10/2026. Este documento atualiza a pendência da auditoria anterior; não autoriza publicação.

## Confirmação editorial

O responsável editorial confirmou diretamente nesta conversa que a hero, a Imagem 1 e a Imagem 2 foram geradas no ChatGPT especificamente para o ART-030. A confirmação constitui evidência editorial declarada, não verificação por assinatura criptográfica. Não se presume modelo interno, plano da conta, data exata de geração ou licença de terceiros.

| Arte integrada | Material recebido | Ferramenta confirmada | SHA-256 |
| --- | --- | --- | --- |
| `art-030-hero.png` | `Hero - orc_fabrica_skyline_alta_densa.png` | ChatGPT/OpenAI | `2043aa84f4f256650747381082f57edc3a7589306c52be3901be1bf2828f00ba` |
| `art-030-funcionamento.png` | `Imagem 1 - Infográfico do Ciclo Rankine Orgânico (ORC).png` | ChatGPT/OpenAI | `f251fc9998778981caaa41124952273c1e9a0cfa7b1113d386e350cfd295428a` |
| `art-030-comparativo.png` | `Imagem 2 - Rankine Convencional vs ORC_ Comparação Industrial.png` | ChatGPT/OpenAI | `8087b00769c7f61299cff1e030573b63ee67a919450d5cecf037b3f78867166f` |

As três versões permanecem idênticas às integradas anteriormente. A hero original não foi recomprimida. As artes são ilustrações didáticas, sem atribuição a instalações, fotógrafos ou empresas reais.

## Documentação oficial consultada

Consulta em 10/10/2026:

1. [OpenAI Terms of Use](https://openai.com/policies/terms-of-use/), vigência exibida: 01/01/2026. Seções “Content” e “Using our Services”: entre usuário e OpenAI, o output pertence ao usuário na medida permitida pela lei; a OpenAI cede seus direitos, se existentes. O usuário continua responsável por inputs e uso, revisão e direitos de terceiros; outputs podem não ser exclusivos. Não há concessão de licença Creative Commons nem garantia de proteção autoral. O uso editorial aqui registrado é uma aplicação dessa base contratual, não uma licença pública de redistribuição.
2. [OpenAI Services Agreement](https://openai.com/policies/services-agreement/), vigência exibida: 01/01/2026, seções 4.1–4.4. Para ChatGPT Business/Enterprise, a titularidade contratual do output é do cliente, sujeita à lei, e continuam as responsabilidades pelo input e uso. Não se afirma qual modalidade de conta foi utilizada; essa cláusula complementa a base para contas empresariais.
3. [Sharing & publication policy](https://openai.com/policies/sharing-publication-policy/), atualização exibida: 14/11/2022. Recomenda revisão humana, responsabilidade editorial e identificação clara da participação da IA. A Nota de Transparência existente mantém essa informação em linguagem acessível; não foram criados avisos individuais nas legendas.

## Decisão de metadados

O modelo existente aceita descrição textual em `cover.license`. Com a confirmação editorial e a base contratual acima, `pending` foi substituído por:

> Output gerado no ChatGPT para o ART-030; uso editorial conforme os termos da OpenAI, na medida permitida pela lei aplicável

Esse campo documenta a base de uso; não declara domínio público, exclusividade, copyright garantido ou licença CC. `aiImageTools: ["ChatGPT/OpenAI"]` registra a ferramenta no nível do artigo. A proveniência individual fica na tabela acima. Não foi preenchido `aiProvenance` nos componentes de imagem, pois o renderer existente produziria crédito individual automático e exigiria ano de geração não confirmado.

A Nota de Transparência agora contém somente:

> Este artigo contou com auxílio de inteligência artificial na revisão e organização do texto. As imagens são ilustrações didáticas geradas por IA.

## Estado e pendências

- Pendência editorial de origem/base de uso das três artes: resolvida com a declaração do responsável e a documentação oficial, com os limites acima.
- Dados não informados (plano da conta, data/modelo de geração e conversas originais) não foram inventados. Podem ser arquivados futuramente para ampliar a rastreabilidade; não impedem este registro local.
- Permanecem as recomendações visuais anteriores: legibilidade dos textos rasterizados no celular e peso dos PNGs, sem alteração das artes nesta etapa.
- Aprovação final e procedimento de publicação continuam necessários. O artigo permanece `draft`, sem aprovação/data de publicação e excluído das consultas públicas, busca, sitemap e RSS.
- Texto científico V3, cinco pontos-chave, tabela, Callout, cinco fontes, legendas e arquivos de imagem não foram alterados.

## Validações

- Testes pertinentes: 29 aprovados, 0 falhas, 311 expectativas em quatro arquivos (ART-030, slots editoriais, transparência e SEO).
- Typecheck e lint do teste ART-030/índices gerados: aprovados.
- Build: aprovado; 43 artigos, 26 avisos editoriais preexistentes e 0 erros. O aviso de licença pendente do ART-030 deixou de ocorrer.
- `git diff --check`: aprovado.

O teste específico fixa a nova base de uso, a ferramenta declarada, a Nota de Transparência exata, a integridade das imagens e a exclusão pública do rascunho. Os índices foram regenerados pelos comandos oficiais; imagens e manuscrito canônico não foram modificados. Sem commit, push, deploy ou alteração de produção. `artifacts/` permaneceu intocado.
