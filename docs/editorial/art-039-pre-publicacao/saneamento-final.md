# ART-039 — Saneamento científico final

Data editorial: 22 de novembro de 2026, America/Sao_Paulo. Autorização: mensagem “ART-039 | Saneamento científico final”, nesta conversa. Publicação condicionada à aprovação de todos os controles.

## Correções aplicadas

Foram alterados somente cinco parágrafos científicos, conforme diff antes/depois em correcoes-cientificas.json. Os demais parágrafos foram comparados após reverter apenas os números de citação. Cinco pontos-chave, destaque, três trechos em itálico, Nota de Transparência e quatro PNGs permanecem idênticos.

- WEG: fornecimento BESS em Furnas/Itumbiara distinguido do capex próprio anunciado para equipamentos em SC; fonte corporativa de 30/09/2025 vinculada ao investimento.

- Epagri/Cepa: período dos dados 2025 mantido e ano editorial corrigido para abril/2026; referência ligada à afirmação agropecuária que sustenta.

- Criogenia: separação de N₂ por criogenia, PSA/VPSA ou membranas diferenciada da liquefação de H₂ e do armazenamento/refrigeração da amônia; cargas energéticas próprias não confundidas com o exemplo elétrico da eletrólise.

- Água: mínimo químico aproximado de 9 L/kg distinguido de demanda operacional e de captação. Médias IRENA/Bluerisk de 17,5 L/kg PEM e 22,3 L/kg alcalina apresentadas com fronteiras e sem valor universal de projeto. PDF de 44 MB lido localmente, figura S1 e contexto inspecionados; não foi necessária infraestrutura nova.

- UFSC: página institucional específica da inauguração de 25/08/2023 consultada; fato de julho/2025 corroborado diretamente pela Fapesc. A página original da Reitoria permanece indisponível no acesso direto; foi preservada, e não se afirma verificação plena dela. Escopo de pesquisa descrito apenas nos limites das fontes.

- Terminologia de 52 kWh/kg precisada para consumo elétrico específico ilustrativo; cálculos e arte intactos. Ementa do Decreto 13.096 precisada para regulamentação. Cabeçalho bibliográfico corrigido.

## Bibliografia e integridade

As 19 fontes originais foram reexaminadas e mantidas, com recuperação equivalente da página UFSC indisponível. Quatro fontes primárias foram acrescidas para WEG, operações da amônia, água e corroboração Fapesc. Total final: 23 referências, todas citadas na sequência de primeira ocorrência. O mapa de numeração está em correcoes-cientificas.json; a avaliação fonte a fonte e as limitações estão em revisao-referencias-final.json e links-saneamento-final.json.

O manuscrito original tem 3.475 palavras. A versão saneada tem 3760 palavras no texto editorial, títulos e bibliografia, excluídos atributos de imagens e metadados; a diferença decorre das correções e fontes necessárias. Os originais não foram reprocessados nem substituídos.

## Gates e testes

Briefing privado validado: ready-for-writing, perguntas abertas zero. Transições oficiais draft/review-ready → review → approved → published executadas após os gates. A autorização humana é a desta conversa; não se inventou revisor independente.

Datas editoriais registradas no calendário local, 22/11/2026 (America/Sao_Paulo), que corresponde à data UTC seguinte durante esta execução. Normalização dos campos de data sem contornar transições ou gates.

Publish-check no ambiente oficial: zero erros e zero avisos para ART-039. Geração global: zero erros; 27 avisos preexistentes de outros artigos/demos. TypeScript, lint de todo o código-fonte (excluídos apenas artefatos .wrangler) e build de produção aprovados.

353 testes relevantes aprovados em 55 arquivos, 6.205 verificações. A primeira execução usou variáveis do build de produção e produziu duas diferenças de ambiente (admin/CSP); repetida no ambiente padrão do CI, passou sem mudanças de código ou redução de proteções. Instabilidades Windows de runtime/i18n já registradas nos releases anteriores não são ocultadas; a suíte integral Linux e ambos os checks obrigatórios devem passar no novo commit.

Prévia e CI: completar evidências da versão final antes da integração. Nenhum teste, timeout, dependência, regra de segurança, segredo ou binding foi alterado.

## Isolamento e publicação

ART-037 e ART-038 não foram alterados. Continuidade da trilogia por links explícitos do ART-039 às partes anteriores e recomendações existentes do portal, sem reescrever artigos publicados.

EN/ES: somente cartões de resumo com destino ao português. Nenhuma tradução completa ou URL inexistente foi criada; nenhuma chamada ao Workers AI.

O release será publicado somente após quality e visual aprovados no SHA final, merge permitido, build do commit integrado, production:check, production:dry-run e deploy oficial com --keep-vars. Preservar versão anterior para rollback. Sem migrações, serviços pagos, redes sociais ou alteração do Worker social.
