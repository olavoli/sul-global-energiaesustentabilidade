# ART-033 — regularização concluída, publicação bloqueada por teste

24/10/2026. Autorização de publicação preservada. **Estado persistido: approved / review-ready. Não publicado, sem staging, commit, push ou deploy.**

## Procedência consolidada e logomarca

- Hero: geração ChatGPT, edição da mesma imagem em Pippit / Seedream 4.0 para reduzir os pássaros.
- Imagens 1/2: geração ChatGPT; imagem 3: geração Pippit / Seedream 4.0.
- Prompts elaborados com auxílio do ChatGPT; nenhum arquivo externo de terceiros usado como insumo, conforme declaração do responsável.
- Logomarca: criação assistida pelo ChatGPT, com orientação visual do responsável editorial do Sul Global; inserção manual posterior nas imagens em que aparece. Nenhum designer externo foi indicado nas informações recebidas.
- Essa declaração **não comprova registro de marca, exclusividade, proteção autoral ou ausência absoluta de semelhanças**. Não se exigiu registro no INPI como condição automática. Os termos de saída ChatGPT compõem a base de uso declarada da marca; não se atribui sua geração ao Pippit nem aos modelos que geraram as cenas.

## Conclusão das condições de uso

Fontes oficiais consultadas em 24/10/2026:

1. [OpenAI Terms of Use](https://openai.com/policies/row-terms-of-use/), vigência 01/01/2026, Content: atribuição ao usuário dos direitos da OpenAI sobre a saída, nos limites legais; responsabilidade pelos insumos. Aplicável como base contratual das imagens 1/2, geração inicial da Hero e logomarca declarada.
2. [Pippit Terms of Service](https://www.pippit.ai/clause/terms-of-service), atualização 15/04/2026, seções 9/10: distingue conteúdo do usuário, materiais da plataforma e serviços de terceiros. Não é garantia de exclusividade ou de inexistência de direitos alheios.
3. [Pippit — Text to Design](https://www.pippit.ai/tools/text-to-design), sem data de versão contratual exibida: identifica Seedream 4.0 no recurso, edição e exportação; FAQ *Can I use Pippit AI-generated design for commercial purposes?* responde afirmativamente, condicionando aos termos e aos direitos sobre imagens/marcas. É orientação oficial específica, não licença Creative Commons.
4. [Pippit — Book Cover Maker](https://www.pippit.ai/create/book-cover-maker), FAQ de uso comercial, também identifica Seedream 4.0 e condiciona o uso aos direitos sobre imagens/design. Corroboração da orientação comercial; não se afirma que o ART-033 foi produzido no recurso de capas de livros.
5. [Creator Terms](https://www.pippit.ai/clause/creator-agreement), atualização 22/01/2026, consultados por remissão da FAQ. Regem participação como Creator da plataforma e conteúdo nela disponibilizado. **Não se atribuiu ao responsável adesão a programa Creator ou autorização sobre materiais da biblioteca**; nenhuma dessas atividades foi declarada. Não se estenderam permissões de templates a materiais inexistentes neste artigo.

**Conclusão documental delimitada:** com identificação do recurso/modelo, declarações sobre os insumos, origem da marca e orientação oficial de uso comercial, existe base para registrar uso editorial/comercial condicionado aos termos, sem afirmar garantia jurídica absoluta. Não foi encontrada proibição específica desse uso declarado das saídas. Os metadados de licença foram atualizados com descrições e URLs dessas condições, sem CC fictícia, exclusividade ou registro marcário presumido. Nenhuma imagem foi modificada. A anterior exigência de identificar o modelo está resolvida; os bloqueios documentais das imagens não devem continuar sendo apresentados como pendentes.

## Briefing e fluxo oficial

Criado `content/research/terras-raras-os-17-elementos-que-movem-a-tecnologia-parte-1.yml`, no schema existente. Identifica expressamente reconstrução retrospectiva; inclui pergunta, escopo, público, estrutura, fontes, dados necessários, imagens, autoria e riscos. Não inventa pesquisa prévia ou revisão humana integral.

As pendências sobre 21 Mt e reconciliação ANM/USGS foram mantidas em `factChecks: pending`, não convertidas em confirmadas. A decisão expressa de publicação com essas limitações foi registrada na estrutura existente `residualRiskApproval`, escopo exclusivo do ART-033, responsável `olavo-oliveira`, data 24/10/2026 e justificativa. Não se alteraram regras globais. `conflictsOfInterestEvaluated` representa a avaliação documental delimitada registrada em `editorialRisks`, não declaração de inexistência de relações comerciais.

`research:validate` retorna exit 1 porque a pesquisa não está integralmente concluída; **o próprio avaliador oficial indica readyForReview com decisão documentada**. Não se registra pesquisa integralmente validada para escrita. A CLI oficial utiliza esse mecanismo e permitiu, sem alteração do código:

```text
draft (draftStage ajustado para review-ready) → review → approved
approvedAt: 2026-10-24
```

Persistência verificada no MDX. Não executada a transição approved → published.

## Verificações e bloqueio técnico real

| Verificação | Resultado |
| --- | --- |
| Git | main sincronizada com origin/main após fetch, contagem 0/0; mudanças anteriores preservadas |
| Typecheck | Aprovado |
| Lint | Aprovado: `bun run lint --ignore-pattern .wrangler/** --ignore-pattern artifacts/**`, sem excluir fontes/testes |
| Content generation | 46 registros, 27 avisos preexistentes, zero erros |
| Publish-check oficial | Aprovado, zero erros/avisos, com VITE_APP_ENV=production, VITE_PUBLIC_SITE_URL=https://sulglobalenergia.com.br, VITE_ALLOW_DEMO_CONTENT=false |
| Suíte completa inicial | 906 passam, 2 falham: lista desatualizada de referencesInBody e teste Kit/workerd |
| Correção diretamente relacionada | Em `src/components/navigation/science-menu.test.ts`, uma linha acrescenta ART-033 à lista esperada; preservadas as assertions de 22 referências do ART-031 e comportamento do template |
| Diagnóstico isolado Kit/workerd | Passou; nenhuma mudança no Kit, timeout, mocks ou configuração |
| Suíte completa após correção | **907 passam, 1 falha**: `cliente real funciona no workerd com fetch nativo e injetado, sem saída externa`, timeout **30000,66 ms** |
| Build de produção / dry-run / deploy | Não executados nesta tentativa após a falha da suíte; não se apresenta build preview anterior como build de produção aprovado |

**Bloqueio atual:** `src/lib/newsletter/kit-client.workerd.test.ts` não conclui dentro dos 30 s na suíte completa, embora passe isoladamente. A causa interna do timeout ainda não foi determinada; concorrência/recursos locais são hipóteses, não conclusão. Há mudanças Kit anteriores no workspace; não foram incluídas nem atribuídas ao ART-033. Não se aumentou o timeout nem se enfraqueceu o teste. A publicação exige resolver essa falha ou comprovar a aprovação da suíte em ambiente oficial limpo, sem ignorar o teste.

## Escopo e estado real

Preservados texto revisado, 21 Mt, quatro imagens, 14 referências, cinco pontos, destaque, autoria e Nota de Transparência. Limitações científicas seguem internas. Alterações desta tentativa: documentação e inventário visual, licença da capa/draftStage/estados/datas via fluxo oficial, briefing, índices gerados, testes ART-033 adaptados para verificar draft/publicado e uma expectativa de teste compartilhado afetada pelo novo artigo. Nenhuma alteração em componentes, Kit, banco ou configuração de produção.

Não há commit ou deployment desta tentativa; URL pública do artigo ainda não confirmada. Não se iniciou CI remoto porque não houve push. Próxima ação: resolver a falha de suíte indicada, então concluir build/validações, commit seletivo, CI e deploy oficial já autorizados, sem nova auditoria científica.
