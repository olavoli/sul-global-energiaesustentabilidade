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

async function request(path: string): Promise<{ response: Response; body: string }> {
  const response = await worker.fetch(new Request(`http://127.0.0.1:4173${path}`), {}, context);
  return { response, body: await response.text() };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Smoke test falhou: ${message}`);
}

const demoArticle = "/artigo/hidrogenio-verde-no-brasil-promessa-e-realidade";
const cases = [
  ["/", 200],
  [demoArticle, expectDemo ? 200 : 404],
  ["/artigo/artigo-inexistente", 404],
  ["/autor/ana-souza", 200],
  ["/autor/autor-inexistente", 404],
  ["/categoria/energia", 200],
  ["/busca?q=energia", 200],
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

console.log(`Smoke tests concluídos: ${cases.length} endpoints; expectDemo=${expectDemo}.`);
