# Implantação e operação

Este documento prepara uma implantação controlada; ele não autoriza deploy nem define domínio.

## Matriz de ambientes

| Ambiente | `VITE_APP_ENV` | URL | Demos | Indexação |
| --- | --- | --- | --- | --- |
| Desenvolvimento | `development` | local | habilitadas com aviso | bloqueada |
| Teste | `test` | local | permitidas em testes | bloqueada |
| Preview | `preview` ou build sem valor explícito | local ou URL de preview | somente com opt-in e aviso | bloqueada |
| Staging | `staging` | URL explícita de staging | bloqueadas por padrão | bloqueada |
| Produção | `production` | URL pública absoluta obrigatória | proibidas | habilitada |

`src/config/environment.ts` é a autoridade. Um build genérico é preview, nunca produção implícita. Produção falha se a URL pública estiver ausente/local ou se demos forem habilitadas.

## Variáveis públicas

- `VITE_APP_ENV`: ambiente da aplicação.
- `VITE_PUBLIC_SITE_URL`: origem de canonical, social, sitemap e RSS.
- `VITE_ALLOW_DEMO_CONTENT`: opt-in de demo apenas fora de produção oficial.

Toda variável `VITE_*` integra o cliente e não pode conter segredo. Tokens Cloudflare, chaves e credenciais não pertencem a `.env.example` nem ao repositório.

## Toolchain e artefato

- Bun `>=1.3.14`: instalação, geração MDX, typecheck, lint, testes, build e smoke.
- Node `>=20`: necessário para executar o Wrangler suportado.
- Vite 8 + Nitro 3 beta; preset `cloudflare-module`; Wrangler 4.

```bash
bun install --frozen-lockfile
bun run typecheck
bun run lint
bun test
bun run build
bun run smoke
bun run preview
```

O build gera assets em `.output/public`, entrypoint em `.output/server/index.mjs` e configuração em `.output/server/wrangler.json`. `bun run preview` chama Node diretamente, sem instalação global. `bun run smoke:artifact` automatiza dois builds: valida rotas com demo explicitamente habilitada e recompila/valida o estado seguro com demos bloqueadas.

## Segurança e indexação

Todas as respostas recebem CSP, `nosniff`, política de referrer/permissões, bloqueio de frames e COOP. HSTS só é emitido em produção oficial recebida por HTTPS. A CSP mantém Google Fonts e as capas Unsplash enquanto esses terceiros existirem. `unsafe-inline` permanece restrito a script/estilo por compatibilidade com hidratação SSR, estilos inline controlados e folhas do Google; `unsafe-eval` não é permitido.

Development, preview e staging recebem `noindex, nofollow` no HTML e em `X-Robots-Tag`; robots bloqueia tudo, e sitemap/RSS não listam conteúdo. Canonicals usam a origem local/explicitamente configurada, nunca um domínio oficial presumido.

## Procedimento de deploy controlado

1. Concluir [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) e [EDITORIAL_LAUNCH_CHECKLIST.md](./EDITORIAL_LAUNCH_CHECKLIST.md).
2. Configurar `VITE_APP_ENV=production`, URL oficial real e demos desativadas na plataforma.
3. Executar instalação congelada, gates, build e smoke em revisão.
4. Conferir entrypoint, assets e configuração gerada sem inserir token no código.
5. Fazer o primeiro deploy manual pela conta Cloudflare autorizada.
6. Validar headers, status, canonical, robots, sitemap, RSS e páginas legais no domínio real.

Nenhuma conta ou token foi conectado nesta Sprint.

## Cache, rollback e operação

Assets com hash podem usar cache imutável; HTML, robots, sitemap e RSS devem permitir atualização controlada. Não armazenar respostas personalizadas em cache futuro sem revisão. Para rollback, manter o artefato/commit anteriormente aprovado e reimplantar essa versão pela plataforma; nunca reescrever histórico publicado.

A observabilidade atual não envia dados: em desenvolvimento registra diagnóstico; fora dele registra apenas categoria e contexto seguro. Não registrar corpo de formulário, e-mail, mensagem, query sensível ou token. Uma integração futura implementa `ObservabilityReporter` após avaliação de privacidade e retenção.

## Limitações

- domínio e conta Cloudflare ainda não definidos/conectados;
- Node precisa estar instalado para o preview Wrangler;
- imagens demo externas, ativo social e revisão jurídica continuam pendentes;
- não há E2E de navegador, monitoramento remoto ou métricas de campo;
- conteúdo demo ainda integra fisicamente o bundle, embora seja bloqueado.
