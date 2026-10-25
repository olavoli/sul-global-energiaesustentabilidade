import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Same local SSR entry point as scripts/smoke-worker.ts. No network or remote bindings.
const worker = (await import(pathToFileURL(resolve(".output/server/index.mjs")).href)).default;
const context = { waitUntil: () => undefined };
const pt = "/artigo/terras-raras-os-17-elementos-que-movem-a-tecnologia-parte-1";
const en = "/en/article/rare-earths-17-elements-technology-brazil-part-1";
const es = "/es/articulo/tierras-raras-17-elementos-tecnologia-brasil-parte-1";
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
async function get(path: string, status: number) {
  const response = await worker.fetch(
    new Request(`https://sulglobalenergia.com.br${path}`),
    {},
    context,
  );
  const html = await response.text();
  assert(response.status === status, `${path}: HTTP ${response.status}, expected ${status}`);
  console.log(`OK ${path}: HTTP ${status}`);
  return html;
}
const original = await get(pt, 200);
assert(original.includes(`<html lang="pt-BR"`), "PT lang changed");
const canonical = original.match(/rel="canonical" href="([^"]+)"/)?.[1];
assert(canonical && new URL(canonical).pathname === pt, "PT canonical changed");
const origin = new URL(canonical).origin;
const indexable = !original.includes('name="robots" content="noindex');
assert(
  original.includes("<details") && original.includes("tradução indisponível"),
  "language fallback missing from SSR",
);
for (const locale of ["en", "es"]) {
  const catalog = await get(`/${locale}`, 200);
  assert(catalog.includes(`<html lang="${locale}"`), "HTML lang mismatch");
  assert(catalog.includes("noindex, follow"), "empty catalog must not be indexable");
  assert(
    catalog.includes(`rel="canonical" href="${origin}/${locale}"`),
    "catalog canonical mismatch",
  );
  const feed = await get(`/${locale}/rss.xml`, 200);
  assert(
    feed.includes(`<language>${locale}</language>`) && !feed.includes("<item>"),
    "draft exposed in language RSS",
  );
}
for (const path of [en, es, "/en/article/not-a-translation", "/fr"]) {
  const missing = await get(path, 404);
  assert(!missing.includes('rel="canonical"'), "404 must not advertise canonical");
}
const sitemap = await get("/sitemap.xml", 200);
assert(
  sitemap.includes(pt) === indexable && !sitemap.includes(en) && !sitemap.includes(es),
  "draft exposed or PT publication changed in sitemap",
);
assert(
  !sitemap.includes("<loc>https://sulglobalenergia.com.br/en</loc>"),
  "empty catalog in sitemap",
);
const rss = await get("/rss.xml", 200);
assert(
  rss.includes(pt) === indexable && !rss.includes(en) && !rss.includes(es),
  "Portuguese feed changed languages",
);
console.log("I18N SSR smoke: 11 local responses verified; no publication or external requests.");
