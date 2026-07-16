# Checklist editorial de lançamento

Não existe quantidade universal de artigos para lançar. O conjunto deve ser suficiente para representar as categorias realmente assumidas pelo portal, sustentar home/navegação sem vazios enganosos e manter qualidade; a decisão quantitativa cabe à liderança editorial após revisar capacidade de atualização.

## Conteúdo e autoria

- [ ] Existe conteúdo real suficiente para a proposta editorial aprovada.
- [ ] Nenhum artigo demo, rascunho ou agendado está visível.
- [ ] Autores, funções, biografias e eventuais vínculos foram autorizados e verificados.
- [ ] Nenhum autor demo, pending ou inactive está associado a conteúdo real publicado.
- [ ] Confirmações internas de onboarding não aparecem no bundle ou perfil público.
- [ ] Títulos, resumos, categorias, tags, datas e tempo de leitura foram conferidos.
- [ ] Tipo editorial (notícia, análise, opinião, guia, entrevista) está correto.
- [ ] Todo conteúdo percorreu `draft → review → approved → published`; nenhum autor aprovou automaticamente seu próprio texto.
- [ ] Notícias, explicações e análises reais possuem fontes estruturadas; guias têm data de revisão; entrevistas têm autorização; opiniões têm disclosure.
- [ ] Afirmações factuais têm fontes verificáveis e datas de verificação quando necessárias.
- [ ] Links internos e externos funcionam e não apontam para placeholders.

## Mídia e transparência

- [ ] Imagens têm licença, origem, crédito, dimensões e alt comprovados.
- [ ] Capa social final foi aprovada e testada.
- [ ] Revisões técnica, editorial e de conflitos de interesse foram registradas.
- [ ] Conteúdo patrocinado identifica financiador e disclosure de forma perceptível.
- [ ] Publicidade, se algum dia ativada, permanece separada da decisão editorial.
- [ ] Uso substancial de IA foi revisado, verificado e divulgado quando pertinente.

## Correções e distribuição

- [ ] Processo de correção define responsável, data e transparência proporcional.
- [ ] Atualizações relevantes usam `updatedAt` e nota ao leitor quando necessário.
- [ ] `correction-needed`, `approved`, `scheduled`, templates e demos estão ausentes da distribuição pública.
- [ ] `bun run content:validate` informa zero erro; todos os warnings foram revisados e registrados.
- [ ] A contagem de demos foi conferida e há decisão explícita de remoção ou arquivamento antes do lançamento.
- [ ] O piloto estrutural permanece invisível até resolver autoria, fontes, mídia e aprovação.
- [ ] Briefings de pesquisa permanecem fora do bundle, sitemap e RSS.
- [ ] `content:publish-check` foi executado para cada artigo em ambiente oficial configurado.
- [ ] RSS inclui apenas conteúdo real aprovado.
- [ ] Canonical, Open Graph e compartilhamento social representam a publicação correta.
- [ ] Home, categorias, autores, busca, sitemap e feed foram revisados editorialmente.
