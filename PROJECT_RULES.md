# PROJECT_RULES.md — Sul Global

Este é o **cérebro do projeto**. Lovable, Cursor e qualquer colaborador humano
devem ler este arquivo **antes** de alterar qualquer coisa. Regras aqui têm
prioridade sobre preferências pessoais ou padrões default de ferramentas.

A versão detalhada de cada tema vive em `docs/`. Este arquivo é o resumo
executivo — curto, direto, inegociável.

---

## 1. Identidade do projeto

- Nome: **Sul Global**.
- Tipo: **portal de mídia independente**, não um blog pessoal.
- Temas: energia, sustentabilidade, ciência, tecnologia, desenvolvimento,
  transição energética.
- Idioma no MVP: **PT-BR apenas**.
- Referência visual: **Bloomberg Green** (editorial denso, verde/preto,
  serifada forte, ar técnico).
- Referências editoriais: Reuters, Bloomberg Green, MIT Technology Review.

## 2. Guardrails de código

- Sempre TypeScript. **Nunca `any`.**
- Arquivos **≤ 300 linhas**. Componentes **≤ 200 linhas**. Acima disso, quebrar.
- Cada componente tem **responsabilidade única**. Preferir composição.
- **Nunca duplicar código.** Extrair para `src/lib` ou `src/hooks`.
- **Nunca instalar dependência sem justificativa** escrita no PR.
- Sem UI kit pesado, sem state manager global, sem lib de animação pesada.
- Todo componente público deve ser documentado (JSDoc curto).
- Todo commit precisa de descrição clara.

## 3. Guardrails de design

- **Nunca alterar cores sem autorização** — paleta vive em `docs/DESIGN_SYSTEM.md`
  e nos tokens de `src/styles.css`.
- **Nunca trocar fontes** sem autorização.
- **Nunca remover componentes** existentes sem autorização.
- Nunca usar classes de cor hardcoded (`text-white`, `bg-black`, `bg-[#...]`).
  Só tokens semânticos.
- Contraste AA obrigatório em modo claro e escuro.

## 4. Performance e acessibilidade

- **Sempre lazy loading** em imagens abaixo da dobra.
- **Sempre imagens responsivas** (`srcset`, `sizes`, `loading="lazy"`).
- **Sempre `alt`** em imagens de conteúdo.
- SSR em toda rota pública (SEO).
- Cada rota define `head()` próprio (title, description, og:*, twitter:*).
- Sem hash anchors como navegação principal entre seções de conteúdo.

## 5. Arquitetura

- Stack: React + TypeScript + Vite (TanStack Start) + Tailwind v4.
- Roteamento file-based em `src/routes/`. Nunca `src/pages/`.
- Conteúdo em **MDX no repositório** na fase 1. Supabase entra apenas na fase 2.
- Newsletter usa Lovable Cloud (Supabase gerenciado) com RLS estrita.
- Sem WordPress, sem Blogger, sem Firebase, sem backend próprio.

## 6. Fluxo de trabalho com IA (Lovable / Cursor)

- Antes de qualquer alteração, a IA **deve ler** este arquivo e o documento
  específico do domínio da alteração em `docs/`.
- Nunca pedir "o site inteiro" em um único prompt. Sempre um componente ou
  uma página por vez.
- Nunca inventar funcionalidades não descritas.
- Nunca gerar código sem plano aprovado.
- Em dúvida, **perguntar antes de codar**.

## 7. Ordem canônica de construção

1. Documentos-constituição (este arquivo + `docs/*.md`).
2. Design System (tokens em `src/styles.css`).
3. Header.
4. Footer.
5. Home.
6. Página de Artigo.
7. Página de Categoria.
8. Busca.
9. Newsletter (Lovable Cloud).
10. Slots de anúncio (placeholders).
11. Sitemap, RSS, robots, SEO técnico.

Cada etapa é um prompt separado e revisável.

---

Documentos detalhados:
- [docs/VISION.md](docs/VISION.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)
- [docs/PROJECT_RULES.md](docs/PROJECT_RULES.md)
- [docs/ROADMAP.md](docs/ROADMAP.md)
- [docs/CONTENT_MODEL.md](docs/CONTENT_MODEL.md)