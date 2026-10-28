# O que é potência — checklist de decisão editorial EN / ES

Nenhum item abaixo foi marcado em nome de revisor humano. As duas edições permanecem draft / translationReview pending, sem datas de aprovação/publicação. Esta checklist não publica nem altera metadados.

- [ ] Aprovar a redação EN e ES e a fidelidade ao PT, incluindo potência versus energia/eficiência, P = ΔE / Δt, W = J/s, E = P × t, os exemplos 1 kWh e 3,6 MJ / 3.6 MJ. Fontes e dados foram preservados; a checagem técnica não é certificação científica.
- [ ] Conferir as capturas PT/EN/ES em 1440×900, 768×1024, 390×844 e 360×800. Aceitar que títulos de comprimentos diferentes deslocam verticalmente a Hero; o breadcrumb móvel tem reticências intencionais e o H1 completo permanece disponível.
- [ ] Aceitar os textos das duas imagens raster em português. Hero: “Elevador A/B”, “mesma carga”, “mesma altura”, “10º andar”, “térreo”, “mesma energia”, “tempos diferentes”, “potências diferentes”; figura kW/kWh: explicações em PT. Alt, legendas e créditos de apresentação estão em EN/ES; imagens não foram redesenhadas.
- [ ] Aceitar o fallback explícito para os artigos portugueses `/artigo/o-que-e-energia` e `/artigo/por-que-nenhuma-maquina-e-100-eficiente`, identificados como “in Portuguese” / “en portugués”. Não existe destino EN/ES publicado para substituir esses links.
- [ ] Aceitar o escopo atual da interface compartilhada em PT: data no cabeçalho, navegação e categorias (incluindo Ciência/Políticas Públicas), busca/menu/tema e rótulos acessíveis; categoria “Energia” e tags “potência”, “energia”, “eficiência energética”; papel/biografia de Olavo Oliveira; barra “Compartilhar”, “Copiar link”, “Link copiado”; rodapé, categorias, links institucionais e textos “Publicado em português brasileiro” / direitos reservados. Não se afirma tradução integral do portal. A frase do rodapé merece decisão explícita antes de publicar uma edição EN/ES, pois é herdada do shell PT.
- [ ] Aceitar ou solicitar tarefa separada para os blocos bibliográficos: lista MDX localizada e lista estruturada com links, título “Fontes e referências”, “verificada em” e quatro notas de fontes em PT. Dados, títulos bibliográficos originais e licenças são preservados; não se ocultaram seções nem se alterou o contrato de fontes.
- [ ] Conferir a Nota de Transparência integral em cada idioma. Ela identifica Cloudflare Workers AI / Meta Llama 3.3 70B e declara revisão humana pendente. Qualquer mudança futura deve refletir apenas a revisão efetivamente realizada.
- [ ] Registrar a decisão real sobre os sete avisos: EN s61/s64/s77 são falsos positivos documentados de negação/modalidade; EN e ES têm dois avisos de links PT por idioma. Os manifestos e os avisos do tradutor foram preservados.
- [ ] Após decisão favorável, registrar aprovação humana real e autorizar expressamente o fluxo editorial/publicação. Esta entrega não executa essa etapa, merge do PR #15, publicação, inferência, automação contínua ou deploy.

## Evidências e integração

- Histórico preservado: commit f244288 — 1.075 testes e gates editoriais; commit d785695 — quality/visual aprovados, 24 casos visuais (12 ART-033 e 12 potência). Não são apresentados como validação de código posterior.
- Relatório individual dos 19 avisos originais e sete remanescentes: [I18N_POWER_EDITORIAL_REVIEW.md](I18N_POWER_EDITORIAL_REVIEW.md).
- PR #14 integrado por squash na main em ee65f131a71e3a957b2a681116b87dccd909a156, com quality/visual aprovados e sem bypass. Branch do PR #15 atualizada por merge normal, sem conflitos ou reescrita de commits.
- I18N_AUTOMATION_ENABLED=false e I18N_AUTOMATIC_DEPLOY_ENABLED=false. Modo pago não foi habilitado, não houve nova inferência e a conta Cloudflare não foi alterada.
- A revalidação após integração é registrada no PR #15; os checks obrigatórios do GitHub devem corresponder ao novo HEAD.

Revalidação local após merge: 119 testes afetados aprovados, zero falhas; typecheck, lint dos módulos envolvidos e git diff --check aprovados. Não se repetiram inferências nem a suíte visual local; os novos checks obrigatórios rodam em checkout limpo no GitHub.
