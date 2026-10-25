import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import mdx from "@mdx-js/rollup";
import remarkFrontmatter from "remark-frontmatter";
import { remarkEditorialSlots } from "../../src/content/remark-editorial-slots";
import { resolve } from "node:path";

// Separate local SPA harness. No public file route, editorial mutation or production switch.
const port = Number(process.env.I18N_PREVIEW_PORT ?? 8093);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid preview port");
const server = await createServer({
  configFile: false,
  root: process.cwd(),
  resolve: { alias: { "@": resolve("src") } },
  optimizeDeps: { entries: ["scripts/visual/review-entry.tsx"] },
  plugins: [
    react(),
    tailwind(),
    mdx({ remarkPlugins: [remarkFrontmatter, remarkEditorialSlots] }),
    {
      name: "isolated-editorial-review",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url === "/__review-health") {
            res.setHeader("Content-Type", "text/plain");
            res.end("Local editorial review only");
            return;
          }
          if (!req.headers.accept?.includes("text/html") || req.url?.startsWith("/@"))
            return next();
          const host = req.headers.host ?? "";
          if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) {
            res.statusCode = 403;
            return res.end("Local preview only");
          }
          res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
          res.setHeader("Cache-Control", "no-store");
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.setHeader(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws:; frame-src 'none'; object-src 'none'",
          );
          try {
            res.end(
              await server.transformIndexHtml(
                req.url ?? "/",
                `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Local editorial preview — NOT PUBLISHED</title></head><body><div id="root"></div><script type="module" src="/scripts/visual/review-entry.tsx"></script></body></html>`,
              ),
            );
          } catch (error) {
            next(error);
          }
        });
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    port,
    strictPort: true,
    watch: { ignored: ["**/playwright-report/**", "**/test-results/**", "**/.wrangler/**"] },
    allowedHosts: ["localhost", "127.0.0.1"],
    fs: {
      deny: [
        ".env",
        ".env.*",
        "**/.git/**",
        "**/.wrangler/**",
        "**/.dev.vars*",
        "**/artifacts/**",
        "**/*.{crt,pem}",
      ],
    },
  },
});
await server.listen();
server.printUrls();
