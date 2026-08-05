import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

interface WorkerModule {
  default: {
    fetch(request: Request, env: unknown, context: ExecutionContext): Promise<Response> | Response;
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

const expectDemo = process.argv.includes("--expect-demo");
const workerUrl = pathToFileURL(resolve(".output/server/index.mjs")).href;
const worker = ((await import(workerUrl)) as WorkerModule).default;
const context: ExecutionContext = { waitUntil: () => undefined };

async function request(
  path: string,
  init?: RequestInit,
  environment: Record<string, string> = {},
): Promise<{ response: Response; body: string }> {
  const response = await worker.fetch(
    new Request(`http://127.0.0.1:4173${path}`, init),
    environment,
    context,
  );
  return { response, body: await response.text() };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Smoke test falhou: ${message}`);
}

const demoArticle = "/artigo/hidrogenio-verde-no-brasil-promessa-e-realidade";
const foundationalArticle = "/artigo/o-que-e-energia";
const pilotArticle = "/artigo/rascunho-como-funciona-matriz-eletrica-brasileira";
const cases = [
  ["/", 200],
  [demoArticle, expectDemo ? 200 : 404],
  [foundationalArticle, 200],
  [pilotArticle, 404],
  ["/artigo/artigo-inexistente", 404],
  ["/autor/ana-souza", expectDemo ? 200 : 404],
  ["/autor/olavo-oliveira", 200],
  ["/autor/autoria-pendente", 404],
  ["/autor/autor-inexistente", 404],
  ["/categoria/energia", 200],
  ["/categoria/funcional", 200],
  ["/busca?q=energia", 200],
  ["/busca?q=funcional", 200],
  ["/robots.txt", 200],
  ["/sitemap.xml", 200],
  ["/rss.xml", 200],
  ["/privacidade", 200],
  ["/termos", 200],
  ["/politica-editorial", 200],
  ["/metodologia", 200],
  ["/rota-inexistente", 404],
] as const;

const results = new Map<string, { response: Response; body: string }>();
for (const [path, expectedStatus] of cases) {
  const result = await request(path);
  assert(result.response.status === expectedStatus, `${path}: esperado ${expectedStatus}`);
  assert(result.response.status < 500, `${path}: não deve retornar 500`);
  results.set(path, result);
  console.log(`${path} ${result.response.status} ${result.response.headers.get("content-type")}`);
}

function resultFor(path: string): { response: Response; body: string } {
  const result = results.get(path);
  assert(result, `resultado ausente para ${path}`);
  return result;
}

const home = resultFor("/");
assert(home.body.includes("<title>"), "home deve conter metadata SSR");
assert(home.response.headers.get("x-robots-tag") === "noindex, nofollow", "preview noindex");

const search = resultFor("/busca?q=energia");
assert(search.body.includes("noindex, follow"), "busca deve declarar noindex");

const functionalCategory = resultFor("/categoria/funcional");
assert(functionalCategory.body.includes("Funcional"), "categoria Funcional deve responder por SSR");

const functionalSearch = resultFor("/busca?q=funcional");
assert(functionalSearch.body.includes("Busca"), "busca por Funcional deve responder");

const foundational = resultFor(foundationalArticle);
assert(foundational.body.includes("O que é energia?"), "artigo fundamental deve conter o título");
assert(
  foundational.body.includes("A energia pode desaparecer?"),
  "artigo fundamental deve renderizar o conteúdo principal por SSR",
);
assert(
  !foundational.body.includes("o conteúdo editorial exibido é fictício"),
  "artigo real não deve receber aviso fictício",
);

const olavo = resultFor("/autor/olavo-oliveira");
assert(olavo.body.includes("Olavo Oliveira"), "perfil público de Olavo deve responder");
assert(olavo.body.includes('"@type":"Person"'), "perfil de Olavo deve incluir JSON-LD Person");

const robots = resultFor("/robots.txt");
assert(robots.body.includes("Disallow: /"), "robots de preview deve bloquear rastreamento");

const sitemap = resultFor("/sitemap.xml");
assert(sitemap.body.includes("<urlset"), "sitemap deve ser XML válido");
assert(!sitemap.body.includes(demoArticle), "sitemap não deve expor demo em preview");

const rss = resultFor("/rss.xml");
assert(rss.body.includes('<rss version="2.0">'), "RSS deve ser XML válido");
assert(!rss.body.includes(demoArticle), "RSS não deve expor demo em preview");

const requiredHeaders = [
  "content-security-policy",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "x-frame-options",
  "cross-origin-opener-policy",
] as const;
for (const header of requiredHeaders) {
  assert(home.response.headers.has(header), `header ausente: ${header}`);
}
assert(
  !home.response.headers.get("content-security-policy")?.includes("unsafe-eval"),
  "CSP não deve usar unsafe-eval",
);

const adminEnvironment = {
  NEWSROOM_ADMIN_SECRET: "smoke-admin-secret",
  NEWSROOM_ENVIRONMENT: "development",
  NEWSROOM_STORAGE_DRIVER: "local",
};
process.env.NEWSROOM_ADMIN_SECRET = adminEnvironment.NEWSROOM_ADMIN_SECRET;
const protectedAdmin = await request("/admin/newsroom", { redirect: "manual" }, adminEnvironment);
assert(protectedAdmin.response.status === 302, "admin sem sessão deve redirecionar");
assert(
  protectedAdmin.response.headers.get("location")?.endsWith("/admin/login"),
  `admin sem sessão deve apontar para login; location=${protectedAdmin.response.headers.get("location")}`,
);

const adminLoginPage = await request("/admin/login", undefined, adminEnvironment);
assert(adminLoginPage.response.status === 200, "login administrativo deve responder");
assert(adminLoginPage.body.includes("noindex"), "login administrativo deve ser noindex");

const adminLogin = await request(
  "/api/admin/login",
  {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ secret: adminEnvironment.NEWSROOM_ADMIN_SECRET, actor: "smoke-test" }),
  },
  adminEnvironment,
);
assert(adminLogin.response.status === 200, "login administrativo válido deve autenticar");
const adminCookie = adminLogin.response.headers.get("set-cookie")?.split(";")[0];
assert(adminCookie, "login administrativo deve emitir cookie");
const adminSession = JSON.parse(adminLogin.body) as { csrf?: string };
assert(adminSession.csrf, "login administrativo deve emitir token CSRF");

const adminDashboard = await request(
  "/api/admin/dashboard",
  { headers: { cookie: adminCookie } },
  adminEnvironment,
);
assert(adminDashboard.response.status === 200, "dashboard autenticado deve responder");
assert(!adminDashboard.body.includes("C:\\Projetos"), "dashboard não deve expor caminho local");

const scientificRadarPage = await request(
  "/admin/newsroom/scientific-radar",
  { headers: { cookie: adminCookie } },
  adminEnvironment,
);
assert(scientificRadarPage.response.status === 200, "Radar Científico privado deve responder");
assert(
  scientificRadarPage.body.includes("Radar Científico"),
  "Radar Científico deve estar no menu",
);
assert(scientificRadarPage.body.includes("noindex"), "Radar Científico deve permanecer noindex");

const scientificRadarApi = await request(
  "/api/admin/scientific-radar",
  { headers: { cookie: adminCookie } },
  adminEnvironment,
);
assert(
  scientificRadarApi.response.status === 200,
  "API privada do Radar Científico deve responder",
);
assert(
  scientificRadarApi.response.headers.get("cache-control")?.includes("private"),
  "Radar Científico não deve permitir cache público",
);
assert(
  scientificRadarApi.response.headers.get("x-robots-tag")?.includes("noindex"),
  "API do Radar Científico deve permanecer noindex",
);

const adminLogout = await request(
  "/api/admin/logout",
  {
    method: "POST",
    headers: { cookie: adminCookie, "x-csrf-token": adminSession.csrf },
  },
  adminEnvironment,
);
assert(adminLogout.response.status === 200, "logout administrativo deve responder");
assert(
  adminLogout.response.headers.get("set-cookie")?.includes("Max-Age=0"),
  "logout administrativo deve expirar o cookie",
);
delete process.env.NEWSROOM_ADMIN_SECRET;

console.log(
  `Smoke tests concluídos: ${cases.length} endpoints públicos e fluxo administrativo; expectDemo=${expectDemo}.`,
);
