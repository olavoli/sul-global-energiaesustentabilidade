import { afterEach, describe, expect, test } from "bun:test";

import { createDistributionResponse } from "@/lib/distribution";
import { getPublishedArticles } from "@/content/repository";
import {
  cookieValue,
  createSessionToken,
  expiredSessionCookie,
  secureEqual,
  sessionCookie,
  verifySessionToken,
} from "./auth";
import { validOperationalId } from "./contracts";
import { handleAdminRequest } from "./handler";
import { clearLoginFailures, loginAllowed, recordFailedLogin, resetRateLimits } from "./rate-limit";

const secret = "segredo-local-forte-para-testes";

afterEach(async () => resetRateLimits());

describe("Sprint 17 — autenticação e fronteira privada", () => {
  test("1. admin sem sessão retorna bloqueio", async () => {
    const response = await handleAdminRequest(new Request("http://localhost/api/admin/dashboard"), {
      NEWSROOM_ADMIN_SECRET: secret,
    });
    expect(response?.status).toBe(401);
  });

  test("2. segredo ausente bloqueia produção", async () => {
    const response = await handleAdminRequest(
      new Request("https://sulglobal.example/api/admin/dashboard"),
      {},
    );
    expect(response?.status).toBe(503);
  });

  test("3. login correto cria sessão", async () => {
    const response = await handleAdminRequest(
      new Request("http://localhost/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ actor: "fundador", secret }),
      }),
      { NEWSROOM_ADMIN_SECRET: secret },
    );
    expect(response?.status).toBe(200);
    expect(response?.headers.get("set-cookie")).toContain("newsroom_admin=");
  });

  test("4. login incorreto não cria sessão", async () => {
    const response = await handleAdminRequest(
      new Request("http://localhost/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ actor: "fundador", secret: "incorreto" }),
      }),
      { NEWSROOM_ADMIN_SECRET: secret },
    );
    expect(response?.status).toBe(401);
    expect(response?.headers.get("set-cookie")).toBeNull();
  });

  test("5. sessão expira", async () => {
    const created = await createSessionToken(secret, "fundador", new Date("2026-07-16T00:00:00Z"));
    const expired = await verifySessionToken(
      created.token,
      secret,
      new Date("2026-07-17T00:00:01Z"),
    );
    expect(expired).toBeUndefined();
  });

  test("6. logout invalida cookie", () => {
    expect(expiredSessionCookie(false)).toContain("Max-Age=0");
  });

  test("7. cookie é HttpOnly", () => {
    expect(sessionCookie("token", false)).toContain("HttpOnly");
  });

  test("8. cookie é Secure em produção", () => {
    expect(sessionCookie("token", true)).toContain("Secure");
  });

  test("9. CSRF bloqueia mutação", async () => {
    const created = await createSessionToken(secret, "fundador");
    const response = await handleAdminRequest(
      new Request("http://localhost/api/admin/actions", {
        method: "POST",
        headers: {
          cookie: `newsroom_admin=${created.token}`,
          "content-type": "application/json",
          "x-csrf-token": "invalido",
        },
        body: JSON.stringify({ action: "pipeline:dry-run", actor: "fundador", note: "" }),
      }),
      { NEWSROOM_ADMIN_SECRET: secret },
    );
    expect(response?.status).toBe(403);
  });

  test("10. rate limit funciona", async () => {
    for (let index = 0; index < 5; index += 1) await recordFailedLogin("ip", index);
    expect(await loginAllowed("ip", 10)).toBe(false);
    await clearLoginFailures("ip");
    expect(await loginAllowed("ip", 10)).toBe(true);
  });

  test("11. rotas privadas são noindex", async () => {
    const response = await handleAdminRequest(new Request("http://localhost/api/admin/dashboard"), {
      NEWSROOM_ADMIN_SECRET: secret,
    });
    expect(response?.headers.get("x-robots-tag")).toContain("noindex");
  });

  test("12. sitemap não contém admin", () => {
    const response = createDistributionResponse("/sitemap.xml", getPublishedArticles());
    expect(response).toBeTruthy();
    return expect(response?.text()).resolves.not.toContain("/admin");
  });

  test("13. RSS não contém admin", () => {
    const response = createDistributionResponse("/rss.xml", getPublishedArticles());
    expect(response).toBeTruthy();
    return expect(response?.text()).resolves.not.toContain("/admin");
  });

  test("29. path traversal é rejeitado", () => {
    expect(validOperationalId("../../newsroom/queue.json")).toBe(false);
  });

  test("comparação de segredo é resistente a timing por digest", async () => {
    expect(await secureEqual(secret, secret)).toBe(true);
    expect(await secureEqual(secret, `${secret}x`)).toBe(false);
  });

  test("cookie é lido sem expor outros valores", () => {
    expect(cookieValue("a=1; newsroom_admin=abc.def; b=2", "newsroom_admin")).toBe("abc.def");
  });
});
