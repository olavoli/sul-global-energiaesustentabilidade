# Radar Científico

O Radar Científico descobre metadados de novas publicações sobre energia e
sustentabilidade e os mantém na área privada da Central Editorial para decisão
humana.

## Limites da fundação

- consulta somente as APIs oficiais do OpenAlex e Crossref;
- não baixa PDFs ou artigos;
- não usa IA;
- não resume nem traduz;
- não cria notícia ou artigo;
- não publica conteúdo;
- não executa em produção;
- não possui agenda automática nesta fundação.

O pipeline executável prepara a futura automação, mas sua ativação periódica
depende de revisão humana, orçamento de API e uma sprint posterior.

## Fluxo

1. consulta limitada ao OpenAlex;
2. rejeição de registros sem DOI;
3. validação do DOI no Crossref;
4. normalização de metadados;
5. deduplicação pelo DOI canônico;
6. classificação por taxonomia determinística;
7. ranking explicável;
8. persistência privada pelo adapter editorial;
9. revisão na seção **Radar Científico** da Central Editorial.

O abstract é armazenado somente quando fornecido pelas APIs. O sistema não
produz resumo próprio.

## Configuração local

`OPENALEX_API_KEY` é obrigatória e deve ser fornecida somente como variável
privada do processo. `SCIENTIFIC_RADAR_CONTACT_EMAIL` é opcional e identifica
requisições no polite pool do Crossref. Nenhum desses valores deve ser
versionado ou informado por argumento de linha de comando.

Uma descoberta local, explicitamente autorizada, pode ser iniciada com:

```powershell
bun run research:radar -- --apply --from 2026-07-01 --limit 25
```

Sem `--apply`, o comando falha antes de consultar ou persistir dados. O comando
também falha fechado quando `NEWSROOM_ENVIRONMENT=production`.

## Taxonomia

Solar, Eólica, Nuclear, Hidrogênio Verde, Baterias, Armazenamento, Carbono,
Smart Grid, Mobilidade, IA aplicada à energia, Políticas Públicas e Mercado.

## Pontuação

A nota de 0 a 100 registra separadamente:

- recência: até 25;
- citações: até 20;
- journal validado: até 15;
- Open Access: até 10;
- relevância temática: até 20;
- relação com categorias editoriais existentes: até 10.

O score não determina publicação. Ele apenas ordena a fila privada.

## Ações supervisionadas

- **Ignorar:** registra a decisão e mantém o histórico.
- **Monitorar:** marca o item para acompanhamento.
- **Criar Dossiê:** cria somente um envelope privado vazio, sem texto gerado.
- **Solicitar Tradução:** registra a solicitação; nenhuma tradução é executada.

Todas as ações exigem sessão administrativa, CSRF, ator, nota, lock e auditoria
append-only já fornecidos pela Central Editorial.
