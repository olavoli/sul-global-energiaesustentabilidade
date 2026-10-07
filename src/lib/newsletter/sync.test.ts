import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { LocalCommentDatabase } from "../comments/test-database";
import { handleNewsletterRequest } from "./handler";
import { handleAdminRequest } from "../admin/handler";
import { createSessionToken } from "../admin/auth";
import { MemoryStorageAdapter } from "../../../scripts/newsroom/storage/memory-adapter";
import { setStorageAdapter } from "../../../scripts/newsroom/storage/runtime";
import { D1NewsletterRepository } from "./repository";
import { newsletterEmailHash } from "./security";

beforeEach(() => setStorageAdapter(new MemoryStorageAdapter()));
afterEach(() => setStorageAdapter(undefined));

async function fixture() {
  const database = new LocalCommentDatabase(5);
  const env = {
    NEWSLETTER_ENABLED: "true",
    NEWSROOM_DB: database,
    KIT_API_KEY: "test-key",
    KIT_FORM_ID: "77",
    NEWSLETTER_HASH_SECRET: "test-hash",
    TURNSTILE_SITE_KEY: "test-site",
    TURNSTILE_SECRET_KEY: "test-turnstile",
    NEWSROOM_ADMIN_SECRET: "test-admin",
  };
  const session = await createSessionToken(env.NEWSROOM_ADMIN_SECRET, "editor");
  const provider = {
    state: "inactive",
    createState: "inactive",
    email: "reader@example.com",
    id: 123,
    fail: false,
  };
  const calls: Array<{ url: string; method: string }> = [];
  const fetcher = (async (input, init) => {
    const url = String(input);
    calls.push({ url, method: init?.method ?? "GET" });
    if (url.includes("turnstile"))
      return Response.json({
        success: true,
        hostname: "localhost",
        action: "newsletter-subscribe",
      });
    if (provider.fail) return new Response(null, { status: 503 });
    return Response.json({
      subscriber: {
        id: provider.id,
        email_address: provider.email,
        state: init?.method === "GET" ? provider.state : provider.createState,
      },
    });
  }) as typeof fetch;
  const subscribe = () =>
    handleNewsletterRequest(
      new Request("http://localhost/api/newsletter/subscriptions", {
        method: "POST",
        headers: {
          origin: "http://localhost",
          "content-type": "application/json",
          "cf-connecting-ip": "192.0.2.1",
        },
        body: JSON.stringify({
          email: "reader@example.com",
          consentAccepted: true,
          turnstileToken: "test-token",
        }),
      }),
      env,
      { fetcher },
    );
  const sync = (body: unknown = {}, headers: Record<string, string> = {}) =>
    handleAdminRequest(
      new Request("http://localhost/api/admin/newsletter/sync", {
        method: "POST",
        headers: {
          origin: "http://localhost",
          "content-type": "application/json",
          cookie: `newsroom_admin=${session.token}`,
          "x-csrf-token": session.session.csrf,
          ...headers,
        },
        body: JSON.stringify(body),
      }),
      env,
      { fetcher },
    );
  const count = (table: string) =>
    (database.sqlite.query(`SELECT COUNT(*) AS total FROM ${table}`).get() as { total: number })
      .total;
  return { database, env, provider, calls, subscribe, sync, count };
}

describe("sincronização Kit Free sem webhook", () => {
  test("flag ausente/false mantém fluxo desligado; segredo webhook não é requisito", async () => {
    const f = await fixture();
    expect(
      (
        await handleNewsletterRequest(
          new Request("http://localhost/api/newsletter/subscriptions"),
          f.env,
        )
      )?.status,
    ).toBe(200);
    expect((await f.subscribe())?.status).toBe(202);
    expect(f.count("newsletter_kit_pending")).toBe(1);
    expect(f.count("newsletter_subscribers")).toBe(0);
    expect(f.calls.filter((c) => c.url.includes("kit.com")).map((c) => c.method)).toEqual([
      "POST",
      "POST",
    ]);
    expect(
      (
        await handleNewsletterRequest(
          new Request("http://localhost/api/newsletter/webhooks/kit", { method: "POST" }),
          f.env,
        )
      )?.status,
    ).toBe(404);
    for (const flag of [undefined, "false"]) {
      expect(
        await (
          await handleNewsletterRequest(
            new Request("http://localhost/api/newsletter/subscriptions"),
            { ...f.env, NEWSLETTER_ENABLED: flag },
          )
        )?.json(),
      ).toEqual({ enabled: false, turnstileSiteKey: "" });
    }
  });

  test("inactive continua pending; apenas GET Kit active promove; retries são idempotentes", async () => {
    const f = await fixture();
    await f.subscribe();
    await f.subscribe();
    expect(f.calls.filter((c) => c.url.includes("kit.com") && c.method === "POST")).toHaveLength(2);
    expect(f.count("newsletter_consent_events")).toBe(1);
    expect((await f.sync())?.status).toBe(200);
    expect(f.count("newsletter_subscribers")).toBe(0);
    f.provider.state = "active";
    const response = await f.sync();
    expect(response?.status).toBe(200);
    expect(await response?.json()).toEqual({ checked: 1, cursor: null });
    expect(f.count("newsletter_kit_pending")).toBe(0);
    expect(f.count("newsletter_subscribers")).toBe(1);
    expect(
      f.database.sqlite
        .query(
          "SELECT source FROM newsletter_consent_events WHERE event_type='subscription_confirmed'",
        )
        .get(),
    ).toEqual({ source: "kit-api-sync" });
    await f.sync();
    expect(f.count("newsletter_consent_events")).toBe(2);
    expect(f.calls.some((c) => c.url.endsWith("/v4/subscribers/123") && c.method === "GET")).toBe(
      true,
    );
  });

  test("autenticação, CSRF, origem e limite de ações protegem a consulta", async () => {
    const f = await fixture();
    expect((await f.sync({}, { cookie: "" }))?.status).toBe(401);
    expect((await f.sync({}, { "x-csrf-token": "invalid" }))?.status).toBe(403);
    expect((await f.sync({}, { origin: "https://evil.example" }))?.status).toBe(403);
    expect((await f.sync({ email: "reader@example.com" }))?.status).toBe(400);
    expect((await f.sync({ cursor: "x".repeat(600) }))?.status).toBe(400);
    for (let index = 0; index < 28; index++) expect((await f.sync())?.status).toBe(200);
    expect((await f.sync())?.status).toBe(429);
    expect(f.calls).toHaveLength(0);
  });

  test.each(["cancelled", "bounced", "complained"])(
    "%s remove email, suprime e não reativa sem consentimento",
    async (state) => {
      const f = await fixture();
      await f.subscribe();
      f.provider.state = "active";
      await f.sync();
      f.provider.state = state;
      await f.sync();
      await f.sync();
      expect(f.count("newsletter_subscribers")).toBe(0);
      expect(f.count("newsletter_kit_pending")).toBe(0);
      expect(f.count("newsletter_suppressions")).toBe(1);
      expect(
        JSON.stringify(f.database.sqlite.query("SELECT * FROM newsletter_consent_events").all()),
      ).not.toContain("reader@example.com");
      f.provider.state = "active";
      await f.sync();
      expect(f.count("newsletter_subscribers")).toBe(0);
      // Upsert cannot reset a cancelled subscriber; fail closed and remove readable email.
      f.provider.createState = state;
      expect((await f.subscribe())?.status).toBe(503);
      expect(f.count("newsletter_kit_pending")).toBe(0);
      expect(f.count("newsletter_suppressions")).toBe(1);
      expect(f.count("newsletter_subscribers")).toBe(0);
      // A genuinely new inactive baseline + explicit consent may start fresh DOI.
      f.provider.createState = "inactive";
      f.provider.state = "inactive";
      expect((await f.subscribe())?.status).toBe(202);
      await f.sync();
      expect(f.count("newsletter_subscribers")).toBe(0);
      expect(f.count("newsletter_suppressions")).toBe(1);
      f.provider.state = "active";
      await f.sync();
      expect(f.count("newsletter_subscribers")).toBe(1);
      expect(f.count("newsletter_suppressions")).toBe(0);
    },
  );

  test("active retornado pelo POST não prova double opt-in novo", async () => {
    const f = await fixture();
    f.provider.createState = "active";
    f.provider.state = "active";
    expect((await f.subscribe())?.status).toBe(503);
    await f.sync();
    expect(f.count("newsletter_subscribers")).toBe(0);
    expect(f.calls.filter((c) => c.url.includes("kit.com"))).toHaveLength(1);
  });

  test("descadastro concorrente impede ressurreição durante o batch de ativação", async () => {
    const f = await fixture();
    await f.subscribe();
    f.provider.state = "active";
    const batch = f.database.batch.bind(f.database);
    let intercepted = false;
    f.database.batch = async (statements) => {
      if (!intercepted) {
        intercepted = true;
        const row = f.database.sqlite
          .query("SELECT email_hash FROM newsletter_kit_pending")
          .get() as { email_hash: string };
        f.database.sqlite.query("DELETE FROM newsletter_kit_pending").run();
        f.database.sqlite
          .query("INSERT INTO newsletter_suppressions VALUES (?,?)")
          .run(row.email_hash, new Date().toISOString());
      }
      return batch(statements);
    };
    await f.sync();
    expect(f.count("newsletter_subscribers")).toBe(0);
    expect(f.count("newsletter_suppressions")).toBe(1);
    expect(
      f.database.sqlite
        .query(
          "SELECT COUNT(*) AS total FROM newsletter_consent_events WHERE event_type='subscription_confirmed'",
        )
        .get(),
    ).toEqual({ total: 0 });
  });

  test("nova geração de consentimento não é apagada por uma consulta anterior", async () => {
    const f = await fixture();
    await f.subscribe();
    f.provider.state = "cancelled";
    const batch = f.database.batch.bind(f.database);
    let intercepted = false;
    f.database.batch = async (statements) => {
      if (!intercepted) {
        intercepted = true;
        f.database.sqlite
          .query(
            "UPDATE newsletter_kit_pending SET consented_at='2027-01-01T00:00:00.000Z', updated_at='2027-01-01T00:00:00.000Z'",
          )
          .run();
      }
      return batch(statements);
    };
    await f.sync();
    expect(f.count("newsletter_kit_pending")).toBe(1);
    expect(f.count("newsletter_suppressions")).toBe(0);
    expect(
      f.database.sqlite
        .query(
          "SELECT COUNT(*) AS total FROM newsletter_consent_events WHERE event_type='unsubscribed'",
        )
        .get(),
    ).toEqual({ total: 0 });
  });

  test("falha Kit, estado desconhecido ou identidade divergente nunca ativam; retry recupera", async () => {
    const f = await fixture();
    await f.subscribe();
    f.provider.fail = true;
    expect((await f.sync())?.status).toBe(503);
    f.provider.fail = false;
    f.provider.state = "unknown";
    expect((await f.sync())?.status).toBe(503);
    f.provider.state = "active";
    f.provider.email = "different@example.com";
    expect((await f.sync())?.status).toBe(503);
    f.provider.email = "reader@example.com";
    f.provider.id = 456;
    expect((await f.sync())?.status).toBe(503);
    expect(f.count("newsletter_subscribers")).toBe(0);
    f.provider.id = 123;
    expect((await f.sync())?.status).toBe(200);
    expect(f.count("newsletter_subscribers")).toBe(1);
  });

  test("paginação limita consultas e usa cursor local; registros removidos não bloqueiam próximo lote", async () => {
    const f = await fixture();
    const repo = new D1NewsletterRepository(f.database);
    for (let index = 1; index <= 11; index++) {
      const email = `reader${index}@example.com`;
      const hash = await newsletterEmailHash(email, f.env.NEWSLETTER_HASH_SECRET);
      await repo.preparePending({
        emailNormalized: email,
        emailHash: hash,
        source: "newsletter-cta",
      });
      await repo.recordKitSubscriber(hash, String(index));
      await repo.markAssociated(hash);
    }
    const fetcher = (async (input) => {
      const id = String(input).split("/").at(-1)!;
      return Response.json({
        subscriber: { id: Number(id), email_address: `reader${id}@example.com`, state: "active" },
      });
    }) as typeof fetch;
    const { handleNewsletterSync } = await import("./sync");
    const send = (cursor = "") =>
      handleNewsletterSync(
        new Request("http://localhost/api/admin/newsletter/sync", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ cursor }),
        }),
        f.env,
        fetcher,
      );
    const first = (await (await send()).json()) as { checked: number; cursor: string };
    expect(first.checked).toBe(10);
    expect(first.cursor).toBeString();
    expect(await (await send(first.cursor)).json()).toEqual({ checked: 1, cursor: null });
    expect(f.count("newsletter_subscribers")).toBe(11);
  });
});
