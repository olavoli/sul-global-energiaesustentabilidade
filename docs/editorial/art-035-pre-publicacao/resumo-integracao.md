> Release autorizado em 03/11/2026: CLI percorreu draft → review → approved → published com persistência verificada. Estado publicado ainda local; PR, CI e deploy são gates separados. Ver autorizacao-publicacao.md. Registros de draft abaixo são históricos.

> Atualização documental visual de 03/11/2026: pendência resolvida para o uso declarado; cover.license descreve os termos OpenAI e os limites documentais. Ver condicoes-uso-visual.md. Menções anteriores a licença pendente são históricas. Estado draft/writing preservado.

> Atualização vigente: qualificações D01–D06 aplicadas com autorização em 03/11/2026. Consulte [qualificacoes-D01-D06.md](qualificacoes-D01-D06.md) e a matriz atual. As pendências abaixo descrevem a rodada anterior e não substituem a resolução atual.

# Estado atual — revisão científica pré-publicação

O ART-035 permanece draft/writing. O relatório vigente dos 15 achados é revisao-cientifica-consolidada.md, com tabela e fichas completas; a matriz vigente é matriz-auditoria.json. A matriz preliminar foi preservada em matriz-auditoria-inicial.json.

Classificação: 6 confirmados, 5 parcialmente sustentados, 3 incorretos formais e 1 não verificável. Dez correções de ortografia, pontuação e referências foram aplicadas e registradas em correcoes-aplicadas.json. D01–D06 continuam dependentes de decisão editorial; somente chamadas [1], autoria de [9] e pontuação foram saneadas nesses trechos. Nenhuma conclusão, meta, prazo ou interpretação substantiva foi substituída.

As dez seções, bloco adicional, pontos-chave, destaque, 16 referências/URLs, Hero JPEG e infográficos foram preservados. Nenhuma nova referência bibliográfica foi criada. “Referências Biográficas” foi corrigido para “Referências”, utilizando o layout existente.

Os registros abaixo documentam as etapas anteriores; seus resultados históricos não substituem os resultados desta rodada, registrados ao final e em resultado-revisao-cientifica.md.

---

# ART-035 — Resumo da integração local

Estado persistido: draft / writing. Branch codex/art-035-rascunho, baseada em a2d1fbf. Sem staging, commit, push, transição editorial ou deploy.

Prévia local isolada, com MDX e componentes reais: http://127.0.0.1:8111/artigo/terras-raras-o-brasil-pode-construir-sua-independencia-tecnologica-ate-2040-parte-3 . Servidor loopback, noindex e sem anúncios. Não altera acesso a rascunhos em produção.

## Conteúdo preservado

Word original intacto por SHA-256. Dez seções, bloco adicional após a conclusão, cinco pontos-chave, destaque e 16 referências Vancouver. Nenhuma correção científica aplicada. Título, subtítulo e legendas originais preservados, inclusive erros tipográficos registrados para decisão. Não há tabelas no Word. As três imagens originais foram copiadas integralmente. Após a substituição autorizada, a Hero é entregue diretamente no JPEG anexado; os infográficos mantêm suas variantes WebP. A Hero anterior e suas variantes permanecem arquivadas, sem uso. Hero no topo, imagem 1 na seção 5 e imagem 2 na seção 9. Autoria reutiliza o cadastro Olavo Oliveira, como nas demais partes; categoria transição energética e cinco tags canônicas da série. SEO, alt text e transparência preparados.

## Validações

| Verificação | Resultado |
| --- | --- |
| Suíte completa | 1.192 testes aprovados, zero falhas, 135 arquivos |
| Testes focados após ajustes do teste | 6 aprovados, zero falhas |
| Typecheck | Aprovado |
| Lint | Aprovado; laboratório ignorado .wrangler excluído da varredura |
| content:validate | 0 erros; aviso próprio de licença pending, além dos avisos preexistentes |
| Build de produção local | Aprovado; não implantado |
| smoke:i18n | Aprovado |
| Smoke SSR específico | Rota draft 404; ausente de sitemap, RSS e vitrines EN/ES; variantes presentes no build |
| Chrome 1440×900, 768×1024, 390×844, 360×800 | 3 imagens carregadas, 16 URLs integrais, sem overflow ou erro JavaScript |
| git diff --check | Aprovado |
| Revisão editorial / pesquisa | Não liberada: pendências científicas, licença e decisões editoriais |

Os testes de integração compilam o MDX e conferem o texto de todos os parágrafos substantivos do Word, chamadas Vancouver e primeira aparição 1–16, originais/variantes por hash e exclusão dos índices públicos. Ajustes necessários no código limitaram-se ao novo teste e à inclusão do draft na expectativa existente de bibliografias manuais. Índices regenerados pelo comando oficial; nenhum componente compartilhado foi modificado.

## Pendências para aprovação

Consulte divergencias-e-pendencias.md e matriz-auditoria.json. Prioridades: atribuir metas finais ao roteiro do CGEE em [1], distinguir propostas de instituições/metas vigentes, verificar a janela de 24–36 meses e ajustar citações específicas. Não foi simulada revisão humana ou aceitação residual. A procedência visual foi registrada conforme declaração; cover.license permanece pending até conferência das condições aplicáveis. Avaliação de conflitos de interesse ainda pendente. Os erros tipográficos permanecem no rascunho, com propostas separadas.

## Preservação

57 arquivos anteriores e privados conferidos por SHA-256, incluindo todos os artigos existentes, traduções, ledger/head e quatro documentos locais não relacionados. Repositório Windows não foi utilizado como área de edição. Nenhuma inferência, alteração D1, AdSense ou automação.

Classificação: apto para avaliação editorial e visual local; NÃO APTO para publicação nesta etapa. Publicação depende de autorização expressa posterior.

## Hero substituída por autorização específica

Em 03/11/2026, a Hero passou a utilizar diretamente o JPEG anexado “Hero ´Parte 3  Terras Raras  pesquisadores.jpg”, 1998×1125 px, sem recompressão ou recriação. SHA-256: 5e0cc2c62464c96b324929937bfa0dd653c4509f79e43967d42962fee42d9c29. A procedência atual é ChatGPT + logotipo em PowerPoint; Pippit/Seedream pertence somente à Hero anterior arquivada. Alt, dimensões, briefing, Nota de Transparência e índices refletem a substituição. Condições de licença continuam pending.

Verificações da substituição: quatro testes ART-035, typecheck, lint dos arquivos afetados, content:validate e diff-check aprovados. Chrome em 1440, 390 e 360 px carregou exatamente o JPEG, sem srcset que substitua o original, com composição/logomarca preservadas e sem overflow. Corpo MDX, referências e infográficos permanecem idênticos por hashes. Sem staging, commit, push ou deploy.

## Resultado vigente da rodada científica

Sete testes focados e todos os gates técnicos executados passaram. Classificação, correções e pendências estão em resultado-revisao-cientifica.md e revisao-cientifica-consolidada.md. A suíte completa anterior de 1.192 testes não foi repetida nesta rodada. Os bloqueios editoriais não foram contornados.
