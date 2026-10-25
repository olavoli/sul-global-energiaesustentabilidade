# Tradução e decisão multilíngue: protótipo offline

Data do estudo: 2026-10-25. Branch: `feat/i18n-pt-en-es`; base de implementação: `0ff176e76b63a358afdceb10aa1766ebbe85b7c5`. Estado: **somente simulação; publicação automática desativada**.

## 1. Arquitetura auditada e integração

| Mecanismo existente                                               | Preservação / integração proposta                                                                                                                    |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `content/articles/*.mdx`, frontmatter JSON/YAML e componentes MDX | Nenhum artigo real é escrito. AST identifica folhas textuais; sintaxe, referências, URLs, fontes de imagens e créditos permanecem bloqueados.        |
| `src/content/schema.ts` e `translation-schema.ts`                 | Mantidos. Fixtures traduzidas são validadas pelo parser real, com `draft`, `isDemo: true`, `translationReview.pending`, sem reviewer.                |
| `sourceRevision`                                                  | Hash SHA-256 da fonte normalizada LF; revisão e cache vinculados à revisão exata.                                                                    |
| `scripts/generate-translations.ts`                                | Continua exigindo revisão humana e correspondência de fontes, autoria e bibliografia; simulação não entra em `content/translations`.                 |
| Briefings / `research-operations.ts`                              | Pendências científicas permanecem pendentes. Aceitação editorial do original não se transforma em comprovação nem aprovação da tradução.             |
| `editorial-operations.ts`                                         | Estados draft → review → approved → published, gates e verificação pós-gravação intactos. Protótipo não importa nem chama transições.                |
| Índices, sitemap, RSS, canonical, hreflang                        | Nenhuma alteração: traduções reais continuam draft e fora dos índices públicos.                                                                      |
| CI `quality` e Playwright `visual`                                | Simulação adicional offline, artefatos por 14 dias; permissões `contents: read`; sem secrets, workflow privilegiado ou deploy.                       |
| `production-config.ts`                                            | Inspeção apenas: config/check consultam configuração protegida e Worker; dry-run usa `--keep-vars --dry-run`. Nada disso foi executado nesta tarefa. |

Fluxo implementado: AST MDX → segmentos → `TranslationProvider` → remontagem → validação determinística → contrato `SemanticVerifier` independente → decisão → relatório isolado. Provedor executável: dicionário de fixtures. **Não há adaptador de inferência externo nem alegação de revisão por IA executada.** O contrato aceita evidências com citações literais, hashes, origem, provedor, modelo e sete dimensões. Resultados fixture só podem exercitar PASS em conteúdo sintético. Modelo ausente, cobertura incompleta ou evidência inválida exigem revisão.

O cache é endereçado por fonte, idioma, provedor, modelo e versão do prompt; usa checksum, escrita exclusiva e lock. Não é assinatura contra um atacante que possa reescrever payload e checksum. O CI produz seu próprio cache em diretório não confiável apenas como otimização. Não é possível reutilizar um parecer sem revalidar. Decisões persistidas impedem retry do mesmo par fonte/alvo de limpar REVIEW_REQUIRED/BLOCK. O laboratório é serial; paralelismo de decisões não é suportado e precisa de armazenamento transacional antes de uso operacional.

Arquivos gerados ficam exclusivamente em `test-results/i18n-simulation/`, ignorados pelo Git. O comando não aceita caminho arbitrário, ID de artigo ou opção de publicação. `wouldPublish` é sempre false, inclusive em PASS.

## 2. Provedores, custos e limites

Fontes oficiais consultadas em 2026-10-25; preços em USD, não garantias comerciais. Nenhuma chamada paga foi executada.

| Opção                              | Integração / disponibilidade                                                    | Qualidade e limitações                                                                                           | Estimativa para 2 traduções + 2 revisões                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Codex assistido na edição          | Produz mudanças revisáveis em PR; não equivale a serviço de publicação autônoma | Bom acesso ao contexto editorial, mas requer avaliação específica PT/EN/ES; custo e limites variam por plano/uso | Sem custo fixo por artigo observável nesta sessão; medir créditos/uso do plano                   |
| Workers AI, Llama 3.3 70B fp8-fast | Binding ou REST; modelo/contexto específico; não configurado aqui               | Contexto de 24.000 tokens; texto longo exige segmentação; qualidade científica não medida                        | US$ 0,030734, supondo 28.000 tokens de entrada e 10.000 de saída às tarifas de 0,293/M e 2,253/M |
| API externa OpenAI, GPT-5.4 mini   | API separada, modelo versionado e limites por conta; não configurada aqui       | Contexto 400.000, saída máxima 128.000; capacidade declarada não certifica tradução científica                   | US$ 0,066 com a mesma hipótese, a 0,75/M entrada e 4,50/M saída                                  |

Hipótese explícita: traduções 2 × (5.000 entrada + 4.000 saída); revisões 2 × (9.000 entrada + 1.000 saída). Total 28.000/10.000. Modelos diferentes na revisão exigem recomputar o custo misto; não usar esta estimativa como orçamento garantido. Sem descontos de cache, franquia, ferramentas, retries, impostos, CI, armazenamento ou trabalho humano. Consumo real da API: não aplicável, nenhuma inferência externa; custo total desta tarefa não mensurado. Provedor/revisor precisam ser independentes; usar um único modelo em ambas as funções invalida o parecer neste protótipo.

Privacidade: material ainda não publicado requer minimização e aprovação de envio. A API OpenAI não usa dados para treinamento por padrão; retenção de monitoramento e de estado depende do recurso e de controles contratados. Workers AI descreve inferência padrão sem retenção além da necessidade operacional, sujeita a exceções; logs próprios e terceiros exigem análise separada. Não declarar retenção zero universal. Codex também precisa de avaliação conforme plano e controles efetivos. Nenhuma chave foi solicitada, copiada ou criada.

Fontes: [Workers AI preços](https://developers.cloudflare.com/workers-ai/platform/pricing/), [modelo Llama](https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/), [dados Workers AI](https://developers.cloudflare.com/workers-ai/platform/data-usage/), [GPT-5.4 mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini), [dados da API](https://developers.openai.com/api/docs/guides/your-data), [custos Codex](https://learn.chatgpt.com/docs/pricing). São avaliações documentais, não benchmarks nem confirmação de disponibilidade na conta Sul Global.

## 3. Ameaças e falhas

- Prompt injection em artigo, fonte ou tradução: componentes e código não são instruções; modelo futuro sem ferramentas, rede ou credenciais de publicação. Parser rejeita expressões/imports/componentes não permitidos.
- Alteração de número, unidade, fórmula, referência ou recurso: BLOCK. Comparação por segmento, pares quantidade/unidade, datas ISO e estrutura bloqueada. A preservação não prova a verdade do original.
- Mesmo modelo repetir seu erro: revisão independente, evidência literal e cobertura por dimensão; IDs diferentes não provam independência operacional, que deve ser garantida pelo adaptador confiável.
- Falta de modelo, ferramenta, teste, evidência ou formato suportado: não promover; REVIEW_REQUIRED ou falha técnica interrompe o comando.
- Cache adulterado, concorrência ou leitura inválida: erro explícito; nada é publicado. Checksum detecta corrupção, não fornece autorização.
- Mudança maliciosa de política em PR: este CI não tem capacidade de publicar. Futura política deve ser lida de revisão protegida e aprovada, nunca do conteúdo do PR candidato; proteção efetiva da branch não foi reconfigurada nem certificada aqui.
- Falso negativo semântico, compensação de números no mesmo parágrafo, homônimos de unidades e mudanças em gráficos rasterizados: riscos residuais; impedir ativação até avaliação humana de corpus e verificador real.

## 4. Regras de risco científico

PASS significa apenas que os testes do cenário sintético conhecido passaram. Não é autorização, aprovação editorial ou certeza científica. BLOCK indica divergência objetiva/contradição. REVIEW_REQUIRED cobre dúvida, ressalva documental, indisponibilidade e fora de escopo. Nenhum score de confiança libera conteúdo.

Verificações determinísticas cobrem números, percentuais/operadores, unidades conhecidas, pares quantidade/unidade, datas ISO, chamadas, bibliografia integral, links, fontes e atribuições de imagens, sintaxe/componentes e sinais de negação/modalidade/ressalva/terminologia mineral. Meses por extenso, unidades não mapeadas, álgebra equivalente e equivalência linguística aberta não são certificados por esses comparadores. Dependem do verificador independente e, sem ele, de revisão humana. Metadados das fixtures são sintéticos: adaptação de todos os campos editoriais reais é trabalho de integração futura, não tradução real validada nesta entrega.

ART-033: ler original, traduções existentes e briefing sem alterá-los. 21 Mt permanece decisão autoral com pendência documental; ANM/registros administrativos não equivalem automaticamente a produção, e recursos não são reservas. Há exclusão explícita por ID e por tipo de risco. Nenhuma ressalva interna é inserida no artigo público, nem removida do registro. Referências do artigo real não são reabertas ou modificadas. A revisão semântica de fixtures não é aprovação das traduções reais.

## 5. Política e autorização

Política executável `simulation-v1`: `enabled: false`, `simulationOnly: true`, `authorizedBy: null`, escopo sintético ciência/explainer, exclusões explícitas. Nenhuma identidade ou data de aprovação foi inventada.

Antes de qualquer ativação, exigir política protegida contendo versão/hash, identificação real do autorizador e sua decisão verificável, data efetiva, validade, revogação, categorias/tipos permitidos, exclusões, modelos/prompts aprovados, orçamento e critérios. Proposta futura: evidência `automationAssessment` separada de `translationReview`, com hashes, política, execução e resultados. **Não implementada no schema atual**: não preencher reviewer humano com robô; qualquer mudança do gate humano exige decisão editorial e implementação própria revisada.

Futuro executor de publicação separado, protegido por ambiente GitHub e permissões mínimas, valida atestação vinculada ao commit/fonte/alvo/política confiável, CI completo, briefing e direitos. PR de conteúdo nunca recebe credenciais nem muda a política efetiva. Revogação deve impedir execução pendente. Alteração de fonte invalida a avaliação. Branch protection, permissões e autorização reais precisam de validação antes do piloto.

## 6. Testes adversariais

Casos PT→EN/ES: número alterado, chamada removida, negação invertida, estimativa tornada fato, referência fabricada e ressalva omitida. Cobertura adicional: recursos/reservas, condições, causalidade, unidades, fórmula, imagem, crédito, link, MDX executável, evidência semântica inventada, hashes obsoletos, revisor igual ao gerador, cobertura incompleta, cache corrompido/ocupado e decisões persistentes. Contradições semânticas são **fixtures fixas** de comparação bilíngue, não resultados de modelo independente executado.

O teste real do ART-033 verifica a existência do registro documental pendente e o estado draft/pending das traduções. O motor não permite PASS para artigos reais neste estágio. Não simula comprovação de 21 Mt.

## 7. Reprodução e resultado da simulação

```sh
bun test scripts/i18n-simulation/pipeline.test.ts
bun run i18n:simulate
# Repetição reutiliza os dois payloads de tradução; reexecuta verificações e decisões.
bun run i18n:simulate
```

Esperado: 16 cenários, 2 PASS sintéticos, 2 REVIEW_REQUIRED por modelo ausente, 12 BLOCK adversariais; ART-033 separado: REVIEW_REQUIRED. Cada cenário armazena MDX sintético draft/isDemo, comparação por segmento, evidências, proveniência, estimativa e decisão em `report.json`. Nenhum arquivo entra nos geradores ou rotas. Em modo operacional futuro somente PASS seria elegível ao exame de autorização, nunca suficiente sozinho. Nesta execução todas as decisões têm `wouldPublish: false`.

O relatório registra custo estimado e chamadas de fixture separadamente de consumo real. Não fornece HAR, tokens ou dados de sessões. Artefatos contêm texto público/sintético; documentos confidenciais não devem ser enviados a artifacts de CI sem política de retenção apropriada.

## 8. Pendências para ativação real

Adaptadores autorizados e limitados de inferência, tratamento de falhas/quota/contexto, verificador independente real, tradução/validação dos metadados, detecção conservadora de formatos desconhecidos, evidência por afirmação, armazenamento transacional de decisões, auditoria de política protegida, revisão de privacidade/custo e cobertura de gráficos. A infraestrutura atual de aprovação humana continua obrigatória. Não há endpoint, job ou credencial de publicação automática.

## 9. Rollback e desligamento

Agora basta não executar a simulação; produção não mudou. Para futuro piloto: kill switch externo confiável, revogar autorização e cancelar filas; congelar versões pendentes; preservar evidências; retirar somente tradução afetada pelo fluxo oficial sem apagar original; reconstruir índices/sitemap/RSS e verificar canonical/hreflang; deploy somente pelo procedimento oficial e CI. Reverter código via novo commit, nunca reescrever história.

## 10. Piloto e métricas

Recomendação: **viável avançar em shadow mode; não ativar publicação automática agora**. Exigir corpus humano adjudicado PT/EN/ES por domínio, concordância e falsos negativos por classe de gravidade; nenhum erro científico crítico aceito no conjunto de liberação; limiares e tamanho amostral aprovados previamente. Medir latência p50/p95, tokens/custo por idioma/etapa/cache, indisponibilidade, BLOCK/REVIEW por motivo, falsos positivos/negativos, mudanças de fonte, intervenções e tempo de rollback. Não inferir segurança estatística de 16 fixtures. Primeiro piloto assistido, limite de volume/custo e revisão humana de toda saída. ART-033 permanece fora de qualquer escopo automático.

## Evidências desta execução

| Verificação local Linux                        | Resultado                                                                                             |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Testes focados                                 | 28 aprovados, 0 falhas                                                                                |
| Suíte completa `bun test`                      | 907 aprovados, 0 falhas, 100 arquivos; 70,99 s                                                        |
| `bun run typecheck`                            | Aprovado                                                                                              |
| `bun run lint --ignore-pattern '.wrangler/**'` | Aprovado; exclui apenas outputs locais ignorados do Wrangler. O CI usa lint normal em checkout limpo. |
| `bun run build`                                | Aprovado; avisos existentes de chunks/configuração Vite preservados                                   |
| `bun run content:validate`                     | 0 erros; 27 avisos preexistentes                                                                      |
| `bun run smoke:i18n`                           | 11 respostas SSR locais verificadas; traduções draft retornam 404                                     |
| Simulação e repetição com cache                | 16 cenários: 2 PASS sintéticos, 2 REVIEW_REQUIRED, 12 BLOCK; nenhuma inferência externa               |
| ART-033                                        | REVIEW_REQUIRED; original e traduções reais sem alterações                                            |

Nenhuma interface visual foi alterada. As capturas e a revisão humana continuam sob o processo já existente; a suite Playwright permanece no CI. A simulação foi executada sem ler configurações protegidas nem consultar serviços de produção. O primeiro comando de lint teve expansão indevida de glob pelo shell; foi corrigida a passagem literal do argumento, sem mudar configuração ou regras. O resultado aprovado acima é da execução corrigida.
