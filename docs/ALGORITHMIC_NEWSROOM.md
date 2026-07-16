# Redação algorítmica local

## Central Editorial

A Sprint 17 adiciona uma interface privada para inspecionar e operar os artefatos já existentes. Ela não muda os critérios editoriais, não duplica o domínio e não cria publicação. Toda ação humana continua atribuída e auditável.

## Extensão da Sprint 16

A infraestrutura pode ser encadeada diariamente em dry-run ou apply explicitamente habilitado. Lock, budgets, circuito e checkpoints protegem a operação; relatório e inbox concentram revisão humana. Agenda não equivale a publicação e nenhuma decisão humana é automatizada.

## Orquestrador supervisionado

A camada seguinte avalia clusters com política executável, riscos, bloqueadores e readiness. Ela persiste decisões, nunca pautas automáticas. Ação humana pode monitorar, rejeitar, pedir fontes/tradução ou aprovar para pauta; não existe ação `publish`.

## Extensão da Sprint 14

Sobre a fila existente, a redação agora cria clusters conservadores, claims atribuídos, pacotes de evidência e uma fila de tradução assistida. Relações e scores são explicáveis; fontes institucionais são contadas sem duplicar feeds. O provider externo está desabilitado e a demonstração usa no máximo três traduções fixture.

O piloto aceita fontes reais verificadas, mas o catálogo permanece vazio. Saúde, frescor, cache, mudança, quarentena, métricas e cobertura foram adicionados sem agenda, IA ou publicação.

## Escopo do MVP

A redação algorítmica é uma infraestrutura local e determinística de coleta e triagem. Ela cadastra fontes, lê RSS 2.0, Atom e fixtures locais, normaliza metadados, identifica duplicatas, classifica temas, calcula score explicável e mantém uma fila supervisionada.

Não implementa scraping HTML, tradução, geração de texto, IA remota, agenda, CMS, banco externo ou publicação. Aprovar um item cria somente um briefing operacional fora de `content/articles/`.

## Fluxo

```text
catálogo validado → coletor → normalização → rejeição auditável
                                      ↓
                              deduplicação
                                      ↓
                        classificação + scoring
                                      ↓
                            fila local de revisão
                                      ↓
                         briefing não publicável
```

Os módulos ficam em `scripts/newsroom/`; não são importados pelo aplicativo. Dados operacionais ficam em `newsroom/`, fora de `public/` e do índice editorial gerado.

## Fontes e coletores

`newsroom/sources/catalog.json` é validado por schema. O catálogo inicial está vazio porque nenhum feed externo foi fornecido ou confirmado. Quando não há fonte ativa, `newsroom:collect` usa apenas as fixtures sintéticas locais.

Coletores implementados:

- `RssCollector`, para RSS 2.0;
- `AtomCollector`, para Atom;
- `LocalFixtureCollector`, para testes sem rede.

Fontes inativas ou bloqueadas não são coletadas. Coleta externa exige HTTP(S), timeout, `User-Agent` identificável, XML compatível, resposta limitada, redirects limitados e validação contra localhost, IP privado e resolução DNS privada.

## Normalização e copyright

O pipeline preserva fonte e URL original. Títulos, datas, autores, categorias, espaços, Unicode e parâmetros conhecidos de tracking são normalizados. Parâmetros não reconhecidos permanecem para evitar alteração semântica da URL.

Descrição e snippet têm no máximo 500 caracteres. HTML é removido, e texto integral, cookies, tokens e imagens não são armazenados. Itens inválidos geram motivo de rejeição; não desaparecem silenciosamente.

## Deduplicação

A comparação ocorre em camadas: GUID, URL canônica, hash, similaridade lexical de título e proximidade temporal. O primeiro item permanece como principal; itens e fontes relacionados continuam registrados. A relação distingue duplicata, republicação e possível atualização.

## Classificação e score

A classificação usa um dicionário versionado e pesos por título, categorias, snippet e tópicos da fonte. Múltiplos temas são permitidos; sem evidência, o resultado é `unclassified`.

O score registra dimensões, motivos, penalidades e uma recomendação entre `reject`, `archive`, `monitor`, `review` e `priority`. A recomendação organiza a revisão; nunca autoriza publicação.

## Fila e auditoria

Estados: `collected`, `normalized`, `duplicate`, `rejected`, `scored`, `review`, `approved-for-draft` e `archived`. Toda transição contém origem, destino, data e ator. Escritas usam `--apply`; o padrão é dry-run.

Execuções aplicadas registram JSONL em `newsroom/audit/`. Dry-runs exibem o mesmo resumo auditável sem modificar arquivos. Logs contêm contadores e erros, nunca matéria integral.

## Limites e próximos passos

Antes de ativar uma fonte real, a equipe deve confirmar URL, termos, copyright, método e confiança. Evoluções futuras podem incluir verificação cruzada mais rica, novos adaptadores e agenda supervisionada. Tradução, IA e publicação automática exigem decisão e Sprint próprias.

O piloto aplica esse gate por dossiê. Duas fontes passaram e seis candidatas documentadas não foram ativadas. A primeira execução coletou somente metadados de feeds e manteve os itens em fila local sem aprovação.
