# Technical Audit

## 1. Sumário executivo

Auditoria executada em 12 de julho de 2026 sobre a branch `docs/foundation-documentation`. O frontend é compilável, responde em desenvolvimento e possui uma base funcional coerente para demonstração. A aplicação ainda não está pronta para publicação editorial real nem para monetização.

Os pontos mais fortes são: TypeScript estrito, roteamento TanStack com SSR, rotas públicas funcionais, componentes editoriais pequenos, HTML semântico básico, tema claro/escuro, formulários rotulados e build de produção aprovado.

As prioridades antes de conteúdo real são: restabelecer gates de qualidade; decidir a fonte de conteúdo; impedir publicação acidental dos dados fictícios; definir domínio e baseline de SEO; e corrigir a entrega de imagens e conteúdo no bundle. MDX ou CMS não deve ser escolhido sem uma decisão editorial e operacional explícita.

Classificação geral: **aceitável para MVP demonstrativo**, com riscos altos para credibilidade editorial, SEO, performance e manutenção se o estado atual for publicado como produto final.

## 2. Escopo e metodologia

Foram inspecionados integralmente os documentos da raiz e de `docs/`, configurações, lockfile, estrutura de `src/`, `public/`, `.lovable/`, arquivos gerados, rotas, componentes, dados, hooks e utilitários.

Métodos utilizados:

- leitura estática de código e documentação;
- busca de imports, APIs sensíveis, metadados, atributos de imagem e recursos de acessibilidade;
- contagem de arquivos e linhas;
- comparação de finais de linha e regras documentadas;
- `bun install`, build, lint e inicialização controlada do servidor;
- inspeção dos artefatos e headers gerados.

Escala dos achados: **saudável**, **aceitável para MVP**, **dívida técnica**, **risco** e **bloqueador**. Grau de certeza: **confirmado**, **provável**, **possível** ou **não conclusivo**.

Não foram executados Lighthouse, teste com leitor de tela, auditoria visual de contraste, teste real em dispositivos, pentest, análise dinâmica de hidratação em navegador ou exploração externa. Nenhuma pontuação dessas áreas foi estimada.

## 3. Estado do ambiente

| Item | Evidência | Estado |
| --- | --- | --- |
| Sistema | Bun reportou Windows x64; workspace em `C:\Projetos\sul-global-energiaesustentabilidade` | Confirmado |
| Bun | `bun --version` → `1.3.14` | Saudável |
| Node | `node` não está disponível no `PATH` | Aceitável, pois os scripts usam Bun |
| Lockfile | `bun.lock`, SHA-256 `5465177E9C2179CBBC7E40B34F846B179595D842E6B133EA05D841FB7FF5B2D4` | Saudável |
| Outros lockfiles | `package-lock.json`, `yarn.lock` e `pnpm-lock.yaml` ausentes | Saudável |
| Instalação | 498 instalações verificadas em 627 pacotes, sem mudanças | Saudável |
| Lovable | `.lovable/project.json`, configuração Vite e `AGENTS.md` | Confirmado |

`bunfig.toml` aplica espera mínima de 24 horas para versões recém-publicadas, com exceções explícitas de pacotes Lovable. Isso reduz risco de supply chain, embora não substitua auditoria de vulnerabilidades.

## 4. Build, lint, dev, typecheck e testes

| Verificação | Resultado | Evidência |
| --- | --- | --- |
| `bun install` | Aprovado | Nenhuma mudança no lockfile |
| `bun run build` | Aprovado | Cliente, SSR e Nitro/Cloudflare gerados com Vite 8.0.16 |
| `bun run lint` | Reprovado | 6.771 erros `prettier/prettier` e 6 warnings `react-refresh/only-export-components` |
| `bun run dev` | Aprovado | HTTP 200 em `http://127.0.0.1:8080/`; processos encerrados |
| Typecheck | Não disponível | Não existe script `typecheck` |
| Testes | Não disponíveis | Não existe script `test` |

A causa predominante do lint é a divergência de finais de linha: 105 arquivos de texto versionados usam CRLF, enquanto `.prettierrc` não define `endOfLine` e o Prettier cobra LF. `docs/README.md` e `docs/ROADMAP.md` usam LF. Não existem `.gitattributes` nem `.editorconfig`; `core.autocrlf=true` no ambiente auditado. Nenhuma formatação em massa foi realizada.

Warnings do build:

- `vite-tsconfig-paths` sobrepõe funcionalidade agora nativa do Vite;
- tempo relevante em plugins de proteção de imports e resolução de paths;
- `inlineDynamicImports` ignorado quando `codeSplitting` está definido.

Classificação: build e dev **saudáveis**; lint **bloqueador para gate de qualidade**; ausência de typecheck isolado, testes e CI é **dívida técnica alta**.

## 5. Arquitetura

### Estado saudável

- TanStack Start e Router estruturam sete rotas públicas e o layout raiz.
- `src/routes/` concentra roteamento; `src/components/` separa layout, home, artigo, navegação e newsletter.
- Loaders de artigo e categoria resolvem conteúdo antes da renderização.
- `src/server.ts` e `src/start.ts` fornecem wrappers de erro e entrada SSR.
- Tipos editoriais ficam centralizados em `src/types/content.ts`.

### Aceitável para MVP

- Dados em `src/data/*.ts` permitem demonstração sem backend.
- Busca local e filtros são simples e previsíveis para apenas 12 artigos.
- TanStack Query está configurado, embora os dados atuais sejam síncronos e locais.

### Dívida e riscos

- **Confirmado:** home, artigo, categoria e busca importam diretamente `articles.ts`. Rotas, apresentação e armazenamento estão acoplados.
- **Confirmado:** `articles.ts` possui 394 linhas e combina registros editoriais com funções de consulta.
- **Confirmado:** não existe camada `content-lib`, repositório de conteúdo, interface de datasource ou validação do conjunto de artigos.
- **Confirmado:** Zod valida apenas a query de busca; não valida artigos, autores ou categorias.
- **Confirmado:** `src/routeTree.gen.ts` é versionado e regenerado ao iniciar o dev. O comportamento exige disciplina para não misturar diffs gerados em mudanças documentais.
- **Provável:** trocar TypeScript local por MDX, API ou CMS exigirá mudanças em todas as rotas que importam dados diretamente.

Ponto de migração recomendado: definir primeiro um contrato de leitura independente da fonte, mantendo o tipo de domínio separado de parsing e persistência. A escolha entre MDX e CMS deve considerar equipe editorial, frequência, revisão, volume e operação; não é consequência automática da stack atual.

## 6. Qualidade de código

### Métricas

- 90 arquivos em `src/`, dos quais 88 são `.ts` ou `.tsx`.
- Acima do limite documental de 300 linhas: `sidebar.tsx` (744), `articles.ts` (394) e `chart.tsx` (331).
- Acima do limite documental de 200 linhas para componentes/arquivos: `carousel.tsx` (240), `menubar.tsx` (229) e `styles.css` (206), além dos anteriores.
- `any` foi encontrado somente no arquivo gerado `routeTree.gen.ts`; não foi encontrado no código autoral.

### Achados

| Achado | Certeza | Classificação |
| --- | --- | --- |
| Componentes editoriais principais ficam abaixo de 200 linhas | Confirmado | Saudável |
| `EMAIL_RE` duplicado em contato e newsletter | Confirmado | Dívida técnica baixa |
| Metadados e classes de botões repetidos | Confirmado | Dívida técnica baixa |
| Grande conjunto `src/components/ui/` sem importação pelo fluxo principal | Confirmado quanto aos imports; intenção futura não conclusiva | Candidato a revisão |
| `use-mobile.tsx` é alcançado apenas pelo sidebar aparentemente não usado | Confirmado | Candidato a revisão |
| Poucos exports públicos possuem JSDoc, apesar da regra documental | Confirmado | Divergência de regra |
| Warnings React Refresh em seis módulos | Confirmado | Dívida técnica média |
| Imports não usados | Não conclusivo | ESLint desativa `no-unused-vars`; requer typecheck/análise dedicada |

Não se recomenda remover scaffolding UI nesta sprint. Primeiro deve ser produzido um grafo de alcance validado contra uso planejado e geração shadcn.

## 7. Dependências

### Confirmadamente utilizadas

- React e React DOM;
- TanStack Start, Router, Query e Zod Adapter;
- Zod;
- Tailwind CSS, `@tailwindcss/vite`, `clsx` e `tailwind-merge`;
- Lucide React;
- configuração Lovable/TanStack, Nitro, Vite e TypeScript no build.

### Utilizadas por scaffolding aparentemente não alcançável

- pacotes `@radix-ui/react-*`;
- `class-variance-authority`, `cmdk`, `embla-carousel-react`, `input-otp`;
- `react-day-picker`, `react-hook-form`, `@hookform/resolvers`;
- `react-resizable-panels`, `recharts`, `sonner` e `vaul`.

### Aparentemente não utilizadas diretamente

- `date-fns`;
- `tw-animate-css` é importado pelo CSS, mas não foi comprovado que animações correspondentes sejam usadas pela aplicação alcançável.

### Impacto

- `recharts`, calendário, formulários e componentes Radix ampliam instalação e superfície de manutenção, ainda que tree-shaking evite necessariamente incluí-los no cliente.
- O chunk principal de cliente tem 404,46 kB (125,24 kB gzip); a causa exata requer analyzer, mas o conteúdo estático completo e dependências do fluxo alcançável são candidatos fortes.
- `vite-tsconfig-paths` é potencialmente redundante segundo warning do próprio Vite 8.

Nenhuma remoção deve ocorrer sem medição do bundle e confirmação de intenção de produto.

## 8. Performance

### Evidências de build

| Ativo | Tamanho | Gzip |
| --- | ---: | ---: |
| Chunk cliente `index` | 404,46 kB | 125,24 kB |
| CSS | 80,49 kB | 13,80 kB |
| `Container` compartilhado | 27,53 kB | 9,01 kB |
| `link` compartilhado | 26,76 kB | 9,81 kB |
| Dados de artigos no SSR | 19,40 kB | 7,30 kB |

### Achados

- **Alto impacto, esforço médio:** nenhum `<img>` usa `srcset`, `sizes`, `width` ou `height`, contrariando `PROJECT_RULES.md`. Aspect ratio em CSS reduz parte do layout shift, mas não fornece seleção responsiva de arquivo.
- **Alto impacto, esforço médio:** capas usam URLs externas do Unsplash com largura fixa de 1600 px, inclusive em cards pequenos.
- **Alto impacto, esforço médio:** strings completas dos 12 artigos são importadas por rotas cliente; separar índice/metadados do corpo tende a reduzir transferência e hidratação.
- **Médio impacto, esforço baixo:** fontes Google externas usam `display=swap` e preconnect, mas continuam dependência de terceiro e recurso potencialmente bloqueante.
- **Médio impacto, esforço médio:** chunk principal gzip de 125,24 kB merece orçamento e análise antes de crescimento editorial.
- **Baixo impacto imediato:** assets com hash recebem `cache-control: public, max-age=31536000, immutable`.

SSR e code splitting existem, mas o benefício é parcialmente reduzido pelo acoplamento de conteúdo ao cliente. Lighthouse não foi executado; não há pontuação de Core Web Vitals.

## 9. Acessibilidade

### Conformidades observadas

- `html lang="pt-BR"`, landmarks, headings, `<article>`, `<figure>` e `<nav>`.
- Skip link funcional para `#conteudo`.
- Labels associados em busca, newsletter e contato.
- Mensagens com `role="alert"`, `role="status"` e `aria-live`.
- Botões somente com ícone possuem `aria-label`; ícones decorativos usam `aria-hidden`.
- Foco visível global e `prefers-reduced-motion` no CSS.
- Imagens editoriais possuem texto alternativo.

### Riscos e testes necessários

- **Provável:** o menu móvel usa `role="dialog"` e Escape, mas não implementa foco inicial, contenção de foco, retorno ao gatilho ou `inert` no conteúdo de fundo.
- **Confirmado:** 404 e boundary de erro raiz estão em inglês, divergindo de `lang="pt-BR"` e do produto.
- **Possível:** `aria-live` no próprio botão de copiar pode produzir anúncio inconsistente; requer leitor de tela.
- **Não conclusivo:** contraste AA/AAA, zoom, reflow, ordem real de foco e navegação por teclado exigem teste manual.
- **Não conclusivo:** imagens não têm dimensões intrínsecas, com possível impacto de layout durante carregamento.

## 10. SEO técnico

| Recurso | Estado | Evidência |
| --- | --- | --- |
| Title e description | Implementado | Todas as rotas definem `head()` |
| Open Graph | Parcial | Título/descrição na maioria; imagem global herdada |
| Twitter Cards | Parcial | Globais e específicas em artigos |
| JSON-LD de artigo | Parcial | `NewsArticle` somente em `/artigo/$slug` |
| Organization schema | Ausente como entidade própria | Publisher parcial dentro do artigo |
| Canonical | Ausente | Nenhum `rel="canonical"` |
| `robots.txt` | Ausente | `public/` contém somente favicon |
| Sitemap | Ausente | Nenhum arquivo ou rota correspondente |
| RSS | Ausente | Nenhum feed; rodapé exibe RSS como “em breve” |
| Breadcrumb | Ausente | Sem UI ou schema de breadcrumb |
| Autor | Parcial | Meta e JSON-LD com nome, sem página/URL |
| Categoria | Parcial | URL e metadados, sem schema/canonical |
| Busca | Adequado para MVP | `noindex` na rota `/busca` |
| 404 dinâmico | Parcial | Componentes e `noindex` quando loader não resolve; status HTTP exige teste publicado |
| Imagem OG | Incorreta para produção | URL global temporária do Lovable/R2 |
| Domínio definitivo | Ausente | Share SSR usa `https://sulglobal.example` |

O `NewsArticle` não inclui `dateModified`, URL/canonical, `mainEntityOfPage` ou logo do publisher. O domínio final é dependência para canonical, OG, sitemap, JSON-LD e compartilhamento confiável.

## 11. SSR e hidratação

- **Confirmado:** build cria ambientes cliente, SSR e Nitro/Cloudflare; dev respondeu HTTP 200.
- **Confirmado:** artigo e categoria carregam dados síncronos no loader, permitindo HTML inicial com conteúdo.
- **Confirmado:** busca e conteúdo usam dados empacotados, sem `useEffect + fetch` para render inicial.
- **Aceitável para MVP:** tema é ajustado no cliente por `localStorage`; pode haver troca visual após hidratação, mas o hook evita acesso a `window` durante inicialização do servidor.
- **Possível:** data formatada no header usa `new Date()` em SSR e cliente; diferença de timezone ou virada do dia pode produzir divergência de texto.
- **Não conclusivo:** nenhum warning de hidratação foi capturado em navegador; exige inspeção de console e teste com JS desabilitado.

## 12. Conteúdo e modelo editorial

### Capacidade atual

O tipo `Article` suporta: slug, título, subtítulo, resumo, corpo, capa e alt, categoria, tags, autor embutido, data de publicação, tempo de leitura, destaque e status `published|draft`.

O renderizador “markdown-lite” suporta apenas parágrafos, `##`, `###`, blockquotes e listas simples. O conteúdo é renderizado como texto React, sem HTML arbitrário, o que reduz risco de XSS.

| Formato editorial | Capacidade atual |
| --- | --- |
| Notícia rápida | Parcial; publicação exige edição e build |
| Análise longa | Parcial; strings grandes e renderer limitado |
| Guia educativo | Parcial; faltam links, tabelas, figuras e notas estruturadas |
| Artigo técnico | Insuficiente para fontes, equações, tabelas e referências robustas |
| Entrevista | Não modelada |
| Opinião | Não modelada nem identificada |
| Patrocinado | Não suportado no tipo ou na UI |
| Atualização de matéria | Não há `updatedAt`, histórico ou indicação visual |

### Riscos editoriais

- **Confirmado:** os 12 artigos são declarados fictícios no comentário do código, mas são apresentados na interface como matérias publicadas plausíveis.
- **Confirmado:** afirmações, números e citações não possuem campos estruturados de fonte ou verificação.
- **Confirmado:** não há crédito de imagem distinto; o figcaption repete o alt.
- **Confirmado:** autor não possui rota própria, links ou identificador externo.
- **Bloqueador editorial:** conteúdo fictício não deve ser confundido com publicação jornalística real.

## 13. Segurança

### Estado atual

- Nenhum `.env`, segredo, token ou credencial foi encontrado fora de diretórios ignorados.
- Links externos com `target="_blank"` usam `noopener noreferrer`.
- Newsletter e contato não enviam dados; o risco atual de backend, spam e PII é limitado.
- Tema persiste apenas a preferência `light|dark` em `localStorage`.
- Conteúdo editorial é convertido em nós React de texto, sem `dangerouslySetInnerHTML` no fluxo atual.

### Riscos

- Headers gerados explicitamente contêm apenas cache para `/assets/*`; CSP, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `Permissions-Policy` e outros headers não foram comprovados.
- O componente `ui/chart.tsx`, aparentemente não alcançado, usa `dangerouslySetInnerHTML` para CSS derivado de configuração. Se futuramente receber dados não confiáveis, exigirá validação.
- Formulários possuem apenas validação cliente. Uma integração futura precisará de validação servidor, rate limit, antispam, consentimento, retenção e resposta genérica.
- Fontes, imagens e compartilhamento dependem de terceiros; uma CSP futura precisará listar origens deliberadamente.
- Auditoria de vulnerabilidades de dependências não foi executada; não foi instalada ferramenta adicional.

## 14. Developer experience

### Pontos positivos

- Instalação com um comando e lockfile único.
- Scripts curtos e claros para dev, build, preview, lint e format.
- Alias `@/*`, TypeScript estrito e rotas file-based.
- README raiz descreve o fluxo básico.

### Dívidas

- Lint inutilizável como gate enquanto CRLF/LF não for reconciliado.
- Sem scripts de typecheck e testes; sem CI.
- `noUnusedLocals` e `noUnusedParameters` estão desabilitados; ESLint também desativa unused vars TypeScript.
- Sem `.editorconfig` e `.gitattributes`; comportamento varia entre Windows, Linux, Lovable e CI.
- O dev regenera arquivo versionado, criando risco de diff incidental.
- Documentação exige JSDoc público, limites de tamanho e imagens responsivas, mas o repositório não aplica essas regras automaticamente.

## 15. Monetização futura

Não existem `AdSlot`, scripts, `ads.txt`, CMP, consentimento, política de privacidade ou separação técnica entre conteúdo editorial e comercial.

Antes de anúncios:

1. definir política editorial, rotulagem e inventário de posições;
2. reservar dimensões responsivas para evitar CLS;
3. definir limites de densidade, especialmente mobile e artigo;
4. implementar consentimento e preferências conforme jurisdição e fornecedores;
5. medir Core Web Vitals antes e depois de qualquer script;
6. publicar `ads.txt` apenas com parceiros reais;
7. separar conteúdo patrocinado no modelo, UI, schema e revisão editorial.

Classificação: ausência aceitável nesta Era; ativar monetização sem esses pré-requisitos seria **risco alto** para credibilidade, privacidade e performance.

## 16. Divergências entre documentação e código

### 1. Documentação desatualizada

- `ARCHITECTURE.md` registra Vite 7; `package.json` e build confirmam Vite 8.0.16.
- Estruturas propostas incluem diretórios e componentes inexistentes.
- `.lovable/plan.md` descreve fase sem código, mas a aplicação já existe.
- `VISION.md` afirma que slots de anúncio existem; não existe `AdSlot`.

### 2. Arquitetura planejada ainda não implementada

- conteúdo MDX, `content/` e `content-lib`;
- validação de frontmatter com Zod;
- Lovable Cloud/Supabase para newsletter;
- página de autor;
- canonical, sitemap, RSS, robots e JSON-LD completo;
- slots de anúncio e `SponsoredBadge`.

### 3. Implementação que diverge da decisão documentada

- conteúdo atual está em strings TypeScript, não MDX;
- newsletter e contato são simulações cliente, não validação servidor;
- imagens não usam `srcset`/`sizes` nem dimensões explícitas;
- vários arquivos excedem limites de 300/200 linhas;
- exports públicos geralmente não têm JSDoc;
- `any` existe no arquivo gerado versionado, embora não no código autoral;
- metadados globais incluem `og:image` no root, contrariando regra que o reserva a leaf routes;
- domínio e imagem social usam placeholders/ativos temporários.

## 17. Matriz de riscos

| ID | Título | Categoria | Evidência | Impacto | Probabilidade | Severidade | Recomendação | Sprint sugerida |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-01 | Conteúdo fictício com aparência de notícia real | Editorial | 12 artigos plausíveis sem disclosure na UI ou fontes | Credibilidade e risco reputacional | Alta | Alta | Bloquear publicação real até substituir/identificar conteúdo | S3 |
| R-02 | Baseline de SEO incompleta | SEO | Sem canonical, robots, sitemap, RSS e domínio final | Indexação e compartilhamento deficientes | Alta | Alta | Definir domínio e implementar baseline verificável | S5 |
| R-03 | Conteúdo e imagens pesados no cliente | Performance | Chunk 404,46 kB; artigos importados; imagens 1600 px sem responsive images | LCP, dados móveis e crescimento | Alta | Alta | Separar índice/corpo e criar estratégia de imagens | S6 |
| R-04 | Gates de qualidade ausentes ou quebrados | DX/Qualidade | Lint com 6.771 erros; sem typecheck, testes e CI | Regressões e baixa confiança | Alta | Alta | Reconciliar EOL e criar gates incrementais | S3 |
| R-05 | Fonte de conteúdo indefinida | Arquitetura | Documentação exige MDX; código usa TypeScript | Retrabalho transversal | Alta | Alta | ADR editorial/técnico antes de migração | S4 |
| R-06 | Acessibilidade do menu não comprovada | Acessibilidade | Dialog sem gestão completa de foco | Barreiras de teclado/leitor de tela | Média | Média | Teste manual e correção focal | S6 |
| R-07 | Segurança e privacidade futuras não preparadas | Segurança | Sem headers comprovados, consentimento ou backend seguro | PII, spam e conformidade | Média | Média | Threat model antes de formulários reais | S7 |
| R-08 | Metadados usam origem temporária e domínio exemplo | SEO | OG no R2/Lovable; `sulglobal.example` | URLs sociais incorretas | Alta | Média | Centralizar site URL após domínio final | S5 |
| R-09 | Scaffolding e dependências sem uso aparente | Dependências | Nenhuma importação UI pelo fluxo principal | Manutenção e supply chain | Média | Média | Confirmar alcance antes de remoção | S3/S8 |
| R-10 | Monetização sem infraestrutura de proteção | Monetização | Sem slots, CMP, política, ads.txt ou orçamento CWV | CLS, privacidade e credibilidade | Média no futuro | Média | Preparar arquitetura somente após baseline | S8 |

Nenhum risco crítico de segurança foi comprovado no estado simulado atual. R-01 a R-05 impedem tratar o projeto como portal editorial pronto para produção.

## 18. Quick wins

| Quick win | Impacto | Esforço | Observação |
| --- | --- | --- | --- |
| Definir política única de EOL com `.gitattributes`/Prettier | Alto | Baixo/médio | Sprint isolada; evitar formatação indiscriminada |
| Adicionar script de typecheck sem emissão | Alto | Baixo | Após baseline de EOL |
| Traduzir 404 e boundary raiz para PT-BR | Médio | Baixo | Sem mudança arquitetural |
| Centralizar URL do site e remover domínio exemplo após definição | Alto | Baixo | Depende do domínio final |
| Marcar ou retirar dados fictícios de qualquer ambiente público | Alto | Baixo | Guardrail editorial |
| Adicionar o relatório de auditoria ao índice de `docs/` | Médio | Baixo | Executado nesta sprint documental |
| Documentar que `routeTree.gen.ts` é regenerado pelo dev | Médio | Baixo | Reduz diffs incidentais |
| Criar orçamento de bundle e imagens | Médio | Baixo | Sem instalar analyzer inicialmente |

## 19. Dívida técnica

- lint e finais de linha inconsistentes;
- ausência de typecheck, testes e CI;
- imports diretos da fonte de conteúdo nas rotas;
- arquivo único de artigos com 394 linhas;
- componentes UI acima dos limites documentados;
- scaffolding e dependências aparentemente não usados;
- metadados repetidos e sem configuração central de domínio;
- renderizador de conteúdo limitado;
- imagens sem variantes responsivas;
- cobertura parcial de SEO e acessibilidade;
- regras documentais não automatizadas;
- documentação estratégica não reconciliada com o código.

## 20. Ordem recomendada das próximas Sprints

1. **Sprint 3 — Baseline de qualidade e segurança editorial.** Resolver EOL de forma controlada, restaurar lint, adicionar typecheck, formalizar proteção contra publicação de conteúdo fictício e medir baseline sem reforma ampla.
2. **Sprint 4 — Decisão da arquitetura de conteúdo.** Levantar fluxo editorial e escolher, via ADR, TypeScript temporário, MDX ou CMS; definir contrato desacoplado de leitura. Não migrar antes da decisão.
3. **Sprint 5 — Domínio e SEO técnico mínimo.** Definir URL canônica, metadados, canonical, robots, sitemap, RSS, JSON-LD e comportamento de 404; validar SSR publicado.
4. **Sprint 6 — Performance e acessibilidade.** Imagens responsivas, separação índice/corpo, orçamento de bundle, foco do menu, idioma das telas de erro e testes manuais.
5. **Sprint 7 — Formulários, privacidade e segurança.** Threat model, política de privacidade, consentimento, validação servidor, rate limit e integração escolhida.
6. **Sprint 8 — Higiene de dependências e preparação comercial.** Revisar scaffolding comprovadamente sem uso; definir slots, política comercial, CMP e orçamento de Core Web Vitals, ainda sem ativar anúncios se os critérios não forem atendidos.
7. **Sprint 9 — Conteúdo real e operação editorial.** Migrar ou publicar o primeiro conjunto revisado, com fontes, créditos, atualização e checklist operacional.

Essa ordem reduz risco antes de investimento em uma tecnologia específica de conteúdo.

## 21. Critérios de entrada na Era 2

- build, lint e typecheck aprovados em ambiente reproduzível;
- testes mínimos para rotas, seleção de conteúdo e formulários críticos;
- fonte de conteúdo decidida e documentada por ADR;
- nenhum conteúdo fictício confundível com publicação real;
- fluxo de autoria, revisão, fontes, créditos e atualização definido;
- domínio final, canonical, robots, sitemap, RSS e JSON-LD validados;
- imagens responsivas e orçamento inicial de bundle/CWV;
- auditoria manual de teclado, foco, contraste e leitor de tela concluída;
- 404 e erros coerentes em PT-BR e com status HTTP verificado;
- formulários com privacidade, validação servidor e mitigação de abuso;
- headers de segurança e origens externas revisados no ambiente publicado;
- documentação estratégica reconciliada com a implementação;
- plano de monetização com separação editorial, consentimento e limites de densidade, sem ativação prematura.

## Atualização pós-auditoria — Sprint 3

Em 12 de julho de 2026, a baseline recomendada pela auditoria foi parcialmente implementada:

- 107 arquivos de texto foram normalizados mecanicamente de CRLF para LF; binários, lockfile e `routeTree.gen.ts` foram excluídos;
- `.gitattributes`, `.editorconfig` e Prettier passaram a definir LF;
- lint e typecheck passaram sem erros ou warnings;
- CI mínimo passou a executar instalação congelada, typecheck, lint e build;
- URL pública e metadata padrão foram centralizadas;
- 404 e fallbacks técnicos raiz foram traduzidos para PT-BR;
- conteúdo demo passou a ser marcado no modelo, oculto em produção por padrão e acompanhado de aviso quando habilitado;
- build e dev permaneceram funcionais; dev respondeu HTTP 200 em `http://127.0.0.1:8080/`.

Riscos R-01 e R-04 foram mitigados, mas não encerrados: o conteúdo demo continua fisicamente presente no bundle e ainda não existem testes automatizados. Os riscos de SEO, performance, arquitetura definitiva de conteúdo e acessibilidade permanecem para as Sprints seguintes.
