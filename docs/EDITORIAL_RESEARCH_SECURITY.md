# Segurança do Workspace de Pesquisa

O Workspace está sob o namespace administrativo existente: autenticação por sessão privada, CSRF em mutações, rate limit, lock, concorrência otimista, respostas `no-store` e auditoria sanitizada. Notas e checklists usam chaves `research-workspace/*` do storage privado, ignorado pelo Git e excluído do bundle público.

Não são registrados em auditoria corpos de notas, excerpts, abstracts, cookies, sessões ou secrets. A UI não expõe ações de coleta, geração, tradução, criação de MDX, publicação ou deploy. O módulo não chama OpenAlex, Crossref ou Wiley e não aceita operação em staging ou produção por CLI própria.

Testes devem usar o adapter em memória ou diretórios temporários e caminhos portáveis. Dados operacionais locais não são fixtures e não podem ser versionados.
