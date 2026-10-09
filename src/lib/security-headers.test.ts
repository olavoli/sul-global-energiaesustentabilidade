import { describe, expect, test } from "bun:test";

import { applySecurityHeaders, contentSecurityPolicy } from "./security-headers";

function directives(policy: string): Record<string, string[]> {
  return Object.fromEntries(
    policy.split("; ").map((directive) => {
      const [name, ...sources] = directive.split(" ");
      return [name, sources];
    }),
  );
}

describe("CSP do Cloudflare Web Analytics com injeção automática", () => {
  test("permite o beacon versionado e o envio same-origin sem abrir outros destinos", () => {
    const policy = directives(contentSecurityPolicy(true));
    expect(policy["script-src"]).toEqual([
      "'self'",
      "'unsafe-inline'",
      "https://challenges.cloudflare.com",
      "https://static.cloudflareinsights.com",
    ]);
    // Automatic injection reports to /cdn-cgi/rum on the page's own origin.
    expect(policy["connect-src"]).toEqual(["'self'", "https://challenges.cloudflare.com"]);
    expect(contentSecurityPolicy(true)).not.toContain("unsafe-eval");
    expect(contentSecurityPolicy(true)).not.toContain("*");
  });

  test("preserva todas as demais restrições, Turnstile e fontes", () => {
    const policy = directives(contentSecurityPolicy(true));
    delete policy["script-src"];
    delete policy["connect-src"];
    expect(policy).toEqual({
      "default-src": ["'self'"],
      "base-uri": ["'self'"],
      "object-src": ["'none'"],
      "frame-ancestors": ["'none'"],
      "form-action": ["'self'"],
      "img-src": ["'self'", "data:", "https://images.unsplash.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "frame-src": ["https://challenges.cloudflare.com"],
      "manifest-src": ["'self'"],
      "media-src": ["'self'"],
      "worker-src": ["'self'", "blob:"],
      "upgrade-insecure-requests": [],
    });
  });

  test("a resposta final substitui CSPs anteriores e mantém uma única política", async () => {
    const headers = new Headers();
    headers.append("Content-Security-Policy", "default-src 'none'");
    headers.append("Content-Security-Policy", "script-src 'none'");
    const request = new Request("http://localhost:8787/");
    const response = applySecurityHeaders(
      applySecurityHeaders(new Response("ok", { headers }), request),
      request,
    );
    expect(response.headers.get("content-security-policy")).toBe(contentSecurityPolicy());
    expect(response.headers.get("content-security-policy")).not.toContain(",");
    expect(
      [...response.headers.keys()].filter((name) => name === "content-security-policy"),
    ).toHaveLength(1);
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(await response.text()).toBe("ok");
  });
});
