import { articleRecords } from "../src/content/generated/articles";

const OFFICIAL_PRODUCTION_ORIGIN = "https://sulglobalenergia.com.br";
const TARGET_CONFIRMATION = "PRODUCTION-READ-ONLY";
const DEMO_ARTICLE_PATHS = articleRecords
  .filter(({ isDemo }) => isDemo)
  .map(({ slug }) => `/artigo/${slug}`);

export type SmokeFetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

interface ProductionSmokeOptions {
  baseUrl: string;
  confirmation: string;
  fetcher?: SmokeFetcher;
}

export interface ProductionSmokeCheck {
  name: string;
  ok: boolean;
  status: number;
}

function assertProductionTarget(baseUrl: string, confirmation: string): URL {
  const base = new URL(baseUrl);
  if (base.origin !== OFFICIAL_PRODUCTION_ORIGIN || base.pathname !== "/") {
    throw new Error(`Smoke de produção recusou alvo diferente de ${OFFICIAL_PRODUCTION_ORIGIN}.`);
  }
  if (base.search || base.hash)
    throw new Error("Smoke de produção exige a origem oficial sem parâmetros.");
  if (confirmation !== TARGET_CONFIRMATION) {
    throw new Error(`Confirmação ${TARGET_CONFIRMATION} ausente; nenhum acesso remoto realizado.`);
  }
  return base;
}

function hasNoindex(response: Response, body: string): boolean {
  return (
    response.headers.get("x-robots-tag")?.toLowerCase().includes("noindex") === true ||
    /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(body) ||
    /<meta[^>]+content=["'][^"']*noindex[^"']*["'][^>]+name=["']robots["']/i.test(body)
  );
}

function canonicalHref(body: string): string | undefined {
  return (
    body.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] ??
    body.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)?.[1]
  );
}

async function get(
  fetcher: SmokeFetcher,
  base: URL,
  path: string,
): Promise<{ response: Response; body: string }> {
  const response = await fetcher(new URL(path, base), { method: "GET", redirect: "manual" });
  return { response, body: await response.text() };
}

export async function runProductionSmoke(
  options: ProductionSmokeOptions,
): Promise<ProductionSmokeCheck[]> {
  const base = assertProductionTarget(options.baseUrl, options.confirmation);
  const fetcher = options.fetcher ?? fetch;
  const checks: ProductionSmokeCheck[] = [];

  const home = await get(fetcher, base, "/");
  checks.push({
    name: "home pública indexável",
    status: home.response.status,
    ok:
      home.response.status === 200 &&
      !hasNoindex(home.response, home.body) &&
      canonicalHref(home.body) === `${OFFICIAL_PRODUCTION_ORIGIN}/`,
  });

  const robots = await get(fetcher, base, "/robots.txt");
  checks.push({
    name: "robots público",
    status: robots.response.status,
    ok:
      robots.response.status === 200 &&
      !/^\s*Disallow:\s*\/\s*$/im.test(robots.body) &&
      robots.body.includes(`${OFFICIAL_PRODUCTION_ORIGIN}/sitemap.xml`),
  });

  const sitemap = await get(fetcher, base, "/sitemap.xml");
  checks.push({
    name: "sitemap público sem demo",
    status: sitemap.response.status,
    ok:
      sitemap.response.status === 200 &&
      sitemap.body.includes("<urlset") &&
      DEMO_ARTICLE_PATHS.every((path) => !sitemap.body.includes(path)),
  });

  const rss = await get(fetcher, base, "/rss.xml");
  checks.push({
    name: "RSS público sem demo",
    status: rss.response.status,
    ok:
      rss.response.status === 200 &&
      rss.body.includes('<rss version="2.0">') &&
      DEMO_ARTICLE_PATHS.every((path) => !rss.body.includes(path)),
  });

  const search = await get(fetcher, base, "/busca?q=energia");
  checks.push({
    name: "busca protegida por noindex",
    status: search.response.status,
    ok: search.response.status === 200 && hasNoindex(search.response, search.body),
  });

  const admin = await get(fetcher, base, "/admin/newsroom");
  const adminLocation = admin.response.headers.get("location");
  checks.push({
    name: "admin exige autenticação",
    status: admin.response.status,
    ok:
      (admin.response.status === 301 ||
        admin.response.status === 302 ||
        admin.response.status === 303) &&
      Boolean(adminLocation) &&
      new URL(adminLocation!, base).pathname === "/admin/login",
  });

  const adminLogin = await get(fetcher, base, "/admin/login");
  checks.push({
    name: "admin permanece noindex",
    status: adminLogin.response.status,
    ok: adminLogin.response.status === 200 && hasNoindex(adminLogin.response, adminLogin.body),
  });

  const missing = await get(fetcher, base, "/rota-inexistente-smoke-production");
  checks.push({
    name: "rota inexistente",
    status: missing.response.status,
    ok: missing.response.status === 404,
  });

  return checks;
}

async function main(): Promise<void> {
  const baseUrl = process.env.PRODUCTION_BASE_URL;
  if (!baseUrl)
    throw new Error("PRODUCTION_BASE_URL não configurada; nenhum acesso remoto realizado.");
  const checks = await runProductionSmoke({
    baseUrl,
    confirmation: process.env.PRODUCTION_TARGET_CONFIRMATION ?? "",
  });
  for (const check of checks) {
    console.log(`${check.ok ? "OK" : "FALHA"} ${check.name}: HTTP ${check.status}`);
  }
  if (checks.some(({ ok }) => !ok)) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(`[erro] ${error instanceof Error ? error.message : "Falha sanitizada."}`);
    process.exitCode = 1;
  });
}
