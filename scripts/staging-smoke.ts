interface SmokeCheck {
  name: string;
  ok: boolean;
  status: number;
}

interface SmokeOptions {
  baseUrl: string;
  adminSecret?: string;
  actor?: string;
  fetcher?: typeof fetch;
}

function safeBaseUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Smoke remoto exige URL HTTPS de staging.");
  if (/^(?:localhost|127\.0\.0\.1)$/i.test(url.hostname))
    throw new Error("Use o smoke local para URLs locais.");
  if (process.env.PRODUCTION_BASE_URL) {
    const production = new URL(process.env.PRODUCTION_BASE_URL);
    if (url.origin === production.origin) throw new Error("Smoke de staging recusou a produção.");
  }
  return url;
}

function cookieFrom(response: Response): string | undefined {
  return response.headers.get("set-cookie")?.split(";")[0];
}

async function request(
  fetcher: typeof fetch,
  base: URL,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetcher(new URL(path, base), { redirect: "manual", ...init });
}

export async function runStagingSmoke(options: SmokeOptions): Promise<SmokeCheck[]> {
  const base = safeBaseUrl(options.baseUrl);
  const fetcher = options.fetcher ?? fetch;
  const checks: SmokeCheck[] = [];
  const publicCases = [
    ["home", "/", 200],
    ["artigo demo rotulado", "/artigo/hidrogenio-verde-no-brasil-promessa-e-realidade", 200],
    ["artigo fundamental real", "/artigo/o-que-e-energia", 200],
    ["categoria", "/categoria/energia", 200],
    ["categoria Funcional", "/categoria/funcional", 200],
    ["busca", "/busca?q=energia", 200],
    ["busca Funcional", "/busca?q=funcional", 200],
    ["autor Olavo", "/autor/olavo-oliveira", 200],
    ["draft invisível", "/artigo/rascunho-como-funciona-matriz-eletrica-brasileira", 404],
    ["robots", "/robots.txt", 200],
    ["sitemap", "/sitemap.xml", 200],
    ["RSS", "/rss.xml", 200],
    ["privacidade", "/privacidade", 200],
    ["termos", "/termos", 200],
    ["política editorial", "/politica-editorial", 200],
  ] as const;
  for (const [name, path, expected] of publicCases) {
    const response = await request(fetcher, base, path);
    const noindex =
      path === "/" ? response.headers.get("x-robots-tag")?.includes("noindex") === true : true;
    checks.push({ name, status: response.status, ok: response.status === expected && noindex });
  }
  const blocked = await request(fetcher, base, "/api/admin/dashboard");
  checks.push({ name: "admin bloqueado", status: blocked.status, ok: blocked.status === 401 });
  if (!options.adminSecret) return checks;

  const login = await request(fetcher, base, "/api/admin/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      actor: options.actor ?? "staging-smoke",
      secret: options.adminSecret,
    }),
  });
  const cookie = cookieFrom(login);
  checks.push({ name: "login", status: login.status, ok: login.status === 200 && Boolean(cookie) });
  if (!cookie) return checks;
  const loginBody = (await login.json()) as { csrf?: string };
  const dashboard = await request(fetcher, base, "/api/admin/dashboard", {
    headers: { cookie },
  });
  checks.push({ name: "dashboard", status: dashboard.status, ok: dashboard.status === 200 });
  const health = await request(fetcher, base, "/api/admin/storage/health", {
    headers: { cookie },
  });
  checks.push({ name: "storage health", status: health.status, ok: health.status === 200 });
  const logout = await request(fetcher, base, "/api/admin/logout", {
    method: "POST",
    headers: { cookie, "x-csrf-token": loginBody.csrf ?? "" },
  });
  checks.push({ name: "logout", status: logout.status, ok: logout.status === 200 });
  return checks;
}

async function main(): Promise<void> {
  const baseUrl = process.env.STAGING_BASE_URL;
  if (!baseUrl)
    throw new Error("STAGING_BASE_URL não configurada; nenhum acesso remoto realizado.");
  if (process.env.STAGING_TARGET_CONFIRMATION !== "STAGING-ONLY")
    throw new Error("Confirmação STAGING-ONLY ausente; nenhum acesso remoto realizado.");
  const checks = await runStagingSmoke({
    baseUrl,
    adminSecret: process.env.STAGING_ADMIN_SECRET,
  });
  for (const check of checks)
    console.log(`${check.ok ? "OK" : "FALHA"} ${check.name}: HTTP ${check.status}`);
  if (checks.some(({ ok }) => !ok)) process.exitCode = 1;
}

if (import.meta.main)
  main().catch((error) => {
    console.error(`[erro] ${error instanceof Error ? error.message : "Falha sanitizada."}`);
    process.exitCode = 1;
  });
