# PROJECT_RULES.md — Sul Global (versão detalhada)

O resumo executivo vive na raiz do repositório em `/PROJECT_RULES.md`. Este
arquivo detalha cada regra, explica **por quê** ela existe, e é a referência
que Lovable, Cursor e revisores humanos consultam em caso de dúvida.

## 1. Código

### 1.1 TypeScript estrito, sempre
- `strict: true` no `tsconfig.json`.
- **Nunca `any`.** Se o tipo é desconhecido, `unknown` + narrowing.
- Preferir tipos derivados (`z.infer<typeof schema>`) a tipos escritos à mão.
- Sem `@ts-ignore` sem comentário justificando.

### 1.2 Tamanho e responsabilidade
- Arquivo `.ts`/`.tsx`: **máximo 300 linhas**.
- Componente React: **máximo 200 linhas**.
- Se ultrapassar, quebrar em subcomponentes ou hooks.
- Um componente = uma responsabilidade. Se o nome tem "And", separar.

### 1.3 Duplicação
- Regra dos três: se o mesmo trecho apareceu três vezes, extrair para
  `src/lib/` ou `src/hooks/`.
- Nunca copiar-e-colar componente para variar levemente. Usar props/variants.

### 1.4 Dependências
- Nenhuma dependência entra sem justificativa **escrita** no PR.
- Perguntas antes de aprovar: resolve problema real? existe alternativa
  nativa? peso em kb? mantida ativamente? funciona em Edge/Worker?
- Proibidas por default: `moment`, `lodash` completo, `jQuery`, qualquer UI
  kit pesado, qualquer lib de animação pesada.

### 1.5 Documentação
- Todo componente exportado publicamente tem JSDoc curto com propósito e um
  exemplo mínimo de uso.
- Toda função utilitária pública tem JSDoc com input, output, e um exemplo.

## 2. Design (invariantes)

- **Nunca alterar cores** sem autorização explícita do dono do projeto.
- **Nunca trocar fontes** sem autorização.
- **Nunca remover componentes** existentes sem autorização.
- **Nunca hardcodar** classes de cor (`text-white`, `bg-black`, `bg-[#...]`).
  Só tokens semânticos.
- Toda mudança visual deve ser refletida em `docs/DESIGN_SYSTEM.md` antes ou
  no mesmo PR.

## 3. Performance

- **Lazy loading** em toda imagem abaixo da dobra.
- **`srcset` + `sizes`** em toda imagem de conteúdo.
- Não importar bibliotecas inteiras — sempre importação nomeada.
- Não usar `useEffect + fetch` para render inicial. Loader de rota com
  `ensureQueryData`.
- Não bloquear render com fonte custom sem `font-display: swap`.

## 4. Acessibilidade

- Contraste **AA** mínimo. AAA em corpo sempre que possível.
- Todo controle interativo é alcançável via teclado e tem foco visível.
- Um `<h1>` por rota. Hierarquia de headings contínua.
- Todo `<img>` de conteúdo tem `alt`. Decorativo usa `alt=""`.
- Formulários têm `<label>` associado. Erros são `aria-live`.

## 5. SEO

- Cada rota define seu `head()` com `title` (< 60 chars) e `description`
  (< 160 chars).
- `og:title`, `og:description`, `twitter:card` obrigatórios em rotas
  compartilháveis.
- `og:image` **só em leaf routes**, nunca no `__root.tsx`.
- `sitemap.xml` e feed RSS gerados automaticamente.
- Canonical em toda rota.
- JSON-LD `Article` em cada `/artigo/$slug`.

## 6. Git e commits

- Um PR = uma mudança lógica. Commits pequenos e descritivos.
- Formato: `tipo(escopo): descrição curta` (ex.: `feat(header): logo com
  wordmark serif`).
- PR precisa: descrição, screenshots (se visual), checklist de a11y/SEO.
- Nunca fazer merge com testes/build quebrados.

## 7. Trabalho com IA (Lovable / Cursor)

- **Sempre** ler `PROJECT_RULES.md` + documento do domínio antes de alterar.
- Nunca pedir "o site inteiro" em um único prompt.
- Nunca inventar funcionalidade não descrita nos documentos.
- Nunca gerar código sem plano aprovado.
- Em dúvida, perguntar.
- Respostas concisas — nada de encher tela com contexto redundante.

## 8. Segurança

- Nenhum secret em código. `.env` para local, secrets do Lovable para
  produção.
- Chaves publicáveis (Supabase anon) podem ir no client. Service role
  **nunca**.
- Formulários públicos (newsletter, contato) validados no servidor com Zod.
- RLS habilitado em toda tabela pública do Supabase.

## 9. Conteúdo editorial (resumo — detalhe em CONTENT_MODEL.md)

- Todo artigo tem frontmatter completo antes do merge.
- Toda imagem tem `alt`, crédito, e é otimizada.
- Toda afirmação factual tem fonte citada.
- Conteúdo patrocinado é **sempre** marcado com `SponsoredBadge`.

## 10. O que **nunca** fazer

- Usar WordPress, Blogger, Firebase.
- Criar backend próprio nesta fase.
- Instalar dependência "porque é famosa".
- Duplicar código para ir mais rápido.
- Ativar anúncios sem plano editorial de monetização aprovado.
- Publicar artigo sem revisão editorial.