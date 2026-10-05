// Local-only runner for the mounted React browser regression harness.
import { readFileSync, readdirSync } from "node:fs";
const bundle = await Bun.build({
  entrypoints: ["src/components/comments/interaction.browser.tsx"],
  target: "browser",
  define: { "process.env.NODE_ENV": JSON.stringify("development") },
});
if (!bundle.success) throw new Error(bundle.logs.map(String).join("\n"));
const javascript = await bundle.outputs[0].text();
const cssName = readdirSync(".output/public/assets").find(
  (name) => name.startsWith("styles-") && name.endsWith(".css"),
);
const css = cssName ? readFileSync(`.output/public/assets/${cssName}`, "utf8") : "";
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 4179,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/fixture.js")
      return new Response(javascript, { headers: { "content-type": "application/javascript" } });
    if (path === "/fixture.css")
      return new Response(css, { headers: { "content-type": "text/css" } });
    return new Response(
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/fixture.css"><script data-sges-turnstile="true"></script></head><body><main style="padding:16px"><h1>Comentários: revisão local</h1><button id="run-tests">Executar testes interativos</button><pre id="results" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre><div class="mx-auto max-w-[72ch]">Coluna editorial de referência</div><div id="comments-fixture"></div></main><script type="module" src="/fixture.js"></script></body></html>`,
      { headers: { "content-type": "text/html" } },
    );
  },
});
console.log(`Fixture somente local: ${server.url}`);
