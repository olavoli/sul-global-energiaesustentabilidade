import { describe, expect, test } from "bun:test";
import { LocalCommentDatabase } from "../comments/test-database";
import { handleNewsletterRequest } from "./handler";

const origin = "https://sulglobalenergia.com.br";
const endpoint = `${origin}/api/newsletter/subscriptions`;
const webhookEndpoint = `${origin}/api/newsletter/webhooks/kit`;
const webhookSecret = "kit-webhook-test-secret";
const nowSeconds = 1_800_000_000;
const payload = {
  email: " Reader@Example.com ",
  consentAccepted: true,
  honeypot: "",
  turnstileToken: "turnstile-token",
};

async function signature(rawBody: string): Promise<string> {
  const timestamp = String(nowSeconds);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(webhookSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`),
  );
  const digest = [...new Uint8Array(signed)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `t=${timestamp},v1=${digest}`;
}

function fixture(
  options: {
    enabled?: boolean;
    kitFailure?: boolean;
    turnstile?: boolean;
    unconfirmed?: boolean;
  } = {},
) {
  const database = new LocalCommentDatabase(5);
  let providerState = "inactive";
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetcher = (async (input, init) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.includes("turnstile"))
      return Response.json({
        success: options.turnstile !== false,
        hostname: "sulglobalenergia.com.br",
        action: "newsletter-subscribe",
      });
    if (options.kitFailure) return new Response(null, { status: 503 });
    return Response.json({
      subscriber: {
        id: 123,
        state: init?.method === "GET" ? providerState : "inactive",
        email_address: "reader@example.com",
      },
    });
  }) as typeof fetch;
  const env = {
    NEWSLETTER_ENABLED: options.enabled === false ? "false" : "true",
    NEWSLETTER_HASH_SECRET: "newsletter-hash-test-secret",
    KIT_API_KEY: "kit-api-test-secret",
    KIT_FORM_ID: "77",
    KIT_WEBHOOK_SECRET: webhookSecret,
    TURNSTILE_SECRET_KEY: "turnstile-test-secret",
    TURNSTILE_SITE_KEY: "turnstile-site-test",
    NEWSROOM_DB: database,
  };
  const send = (body: unknown = payload, headers: Record<string, string> = {}) =>
    handleNewsletterRequest(
      new Request(endpoint, {
        method: "POST",
        headers: {
          origin,
          "content-type": "application/json",
          "cf-connecting-ip": "192.0.2.30",
          ...headers,
        },
        body: JSON.stringify(body),
      }),
      env,
      { fetcher, nowSeconds },
    );
  const webhook = async (events: unknown[], valid = true) => {
    providerState =
      !options.unconfirmed &&
      events.some((event) => (event as { type: string }).type === "subscriber.activated")
        ? "active"
        : "inactive";
    const rawBody = JSON.stringify({ delivery_id: 1, events });
    return handleNewsletterRequest(
      new Request(webhookEndpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-kit-signature": valid ? await signature(rawBody) : "t=1,v1=invalid",
        },
        body: rawBody,
      }),
      env,
      { fetcher, nowSeconds },
    );
  };
  return { database, calls, env, send, webhook };
}

function kitEvent(id: string, type: string) {
  return {
    id,
    type,
    created: "2027-01-15T08:00:00.000Z",
    data: {
      subscriber: { id: 123, email_address: "reader@example.com" },
    },
  };
}

describe("API da newsletter", () => {
  test("webhook assinado não ativa quando a API ainda retorna inactive", async () => {
    const { database, send, webhook } = fixture({ unconfirmed: true });
    await send();
    expect(
      (await webhook([kitEvent("55555555-5555-4555-8555-555555555555", "subscriber.activated")]))
        ?.status,
    ).toBe(204);
    expect(
      database.sqlite.query("SELECT COUNT(*) AS total FROM newsletter_subscribers").get(),
    ).toEqual({ total: 0 });
    expect(
      database.sqlite.query("SELECT COUNT(*) AS total FROM newsletter_kit_pending").get(),
    ).toEqual({ total: 1 });
  });
  test("configuração pública não expõe secrets e flag false não escreve nem chama Kit", async () => {
    const { database, calls, env, send } = fixture({ enabled: false });
    const config = await handleNewsletterRequest(new Request(endpoint), env);
    const configBody = await config?.json();
    expect(configBody).toEqual({ enabled: false, turnstileSiteKey: "" });
    expect((await send())?.status).toBe(503);
    expect(
      database.sqlite.query("SELECT COUNT(*) AS total FROM newsletter_kit_pending").get(),
    ).toEqual({ total: 0 });
    expect(calls).toHaveLength(0);
    expect(JSON.stringify(configBody)).not.toMatch(/api|secret|webhook/i);
  });

  test.each([
    [{ ...payload, email: "invalid" }, 400],
    [{ ...payload, consentAccepted: false }, 400],
    [{ ...payload, extra: true }, 400],
  ])("rejeita entrada estrita inválida", async (body, status) => {
    const { send } = fixture();
    expect((await send(body))?.status).toBe(status);
  });

  test("honeypot responde genericamente sem verificar nem persistir", async () => {
    const { database, calls, send } = fixture();
    expect((await send({ ...payload, honeypot: "bot" }))?.status).toBe(202);
    expect(
      database.sqlite.query("SELECT COUNT(*) AS total FROM newsletter_kit_pending").get(),
    ).toEqual({ total: 0 });
    expect(calls).toHaveLength(0);
  });

  test("Turnstile inválido e rate limit próprio falham antes do Kit", async () => {
    const { calls, send } = fixture({ turnstile: false });
    for (let index = 0; index < 5; index += 1) expect((await send())?.status).toBe(400);
    expect((await send())?.status).toBe(429);
    expect(calls).toHaveLength(5);
    expect(calls.every(({ url }) => url.includes("turnstile"))).toBe(true);
  });

  test("cadastro normal registra consentimento, envia inactive e associa ao Form", async () => {
    const { database, calls, send } = fixture();
    const response = await send();
    expect(response?.status).toBe(202);
    const body = await response?.json();
    expect(body).toEqual({
      accepted: true,
      message: "Confira sua caixa de entrada para confirmar sua inscrição.",
    });
    expect(JSON.stringify(body)).not.toContain("reader@example.com");
    const kitCreate = calls.find(({ url }) => url.endsWith("/v4/subscribers"));
    expect(JSON.parse(String(kitCreate?.init?.body))).toEqual({
      email_address: "reader@example.com",
      state: "inactive",
    });
    expect(calls.some(({ url }) => url.endsWith("/v4/forms/77/subscribers/123"))).toBe(true);
    expect(
      database.sqlite
        .query("SELECT email_normalized,sync_status FROM newsletter_kit_pending")
        .get(),
    ).toEqual({ email_normalized: "reader@example.com", sync_status: "associated" });
    expect(database.sqlite.query("SELECT event_type FROM newsletter_consent_events").all()).toEqual(
      [{ event_type: "consent_recorded" }],
    );
  });

  test("retry permanece idempotente no estado pending", async () => {
    const { database, send } = fixture();
    expect((await send())?.status).toBe(202);
    expect((await send())?.status).toBe(202);
    expect(
      database.sqlite.query("SELECT COUNT(*) AS total FROM newsletter_kit_pending").get(),
    ).toEqual({ total: 1 });
    expect(
      database.sqlite.query("SELECT COUNT(*) AS total FROM newsletter_subscribers").get(),
    ).toEqual({ total: 0 });
  });

  test("falha parcial do Kit preserva consentimento e estado recuperável", async () => {
    const { database, send } = fixture({ kitFailure: true });
    const response = await send();
    expect(response?.status).toBe(503);
    expect(await response?.json()).toEqual({
      error: "Não foi possível iniciar a confirmação. Tente novamente mais tarde.",
    });
    expect(database.sqlite.query("SELECT sync_status FROM newsletter_kit_pending").get()).toEqual({
      sync_status: "failed",
    });
    expect(
      database.sqlite.query("SELECT COUNT(*) AS total FROM newsletter_consent_events").get(),
    ).toEqual({ total: 1 });
  });

  test("webhook valida assinatura, ativa e deduplica pelo UUID", async () => {
    const { database, send, webhook } = fixture();
    await send();
    const event = kitEvent("11111111-1111-4111-8111-111111111111", "subscriber.activated");
    expect((await webhook([event], false))?.status).toBe(401);
    expect((await webhook([event]))?.status).toBe(204);
    expect((await webhook([event]))?.status).toBe(204);
    expect(
      database.sqlite
        .query("SELECT status,email_normalized,kit_subscriber_id FROM newsletter_subscribers")
        .get(),
    ).toEqual({
      status: "active",
      email_normalized: "reader@example.com",
      kit_subscriber_id: "123",
    });
    expect(
      database.sqlite.query("SELECT COUNT(*) AS total FROM newsletter_kit_pending").get(),
    ).toEqual({ total: 0 });
    expect(
      database.sqlite.query("SELECT COUNT(*) AS total FROM newsletter_kit_webhook_events").get(),
    ).toEqual({ total: 1 });
    expect(
      database.sqlite
        .query(
          "SELECT COUNT(*) AS total FROM newsletter_consent_events WHERE event_type='subscription_confirmed'",
        )
        .get(),
    ).toEqual({ total: 1 });
  });

  test("unsubscribe suprime, remove e-mail legível e reinscrição volta a pending", async () => {
    const { database, send, webhook } = fixture();
    await send();
    await webhook([kitEvent("22222222-2222-4222-8222-222222222222", "subscriber.activated")]);
    await webhook([kitEvent("33333333-3333-4333-8333-333333333333", "subscriber.unsubscribed")]);
    expect(
      database.sqlite.query("SELECT COUNT(*) AS total FROM newsletter_subscribers").get(),
    ).toEqual({ total: 0 });
    expect(
      database.sqlite.query("SELECT COUNT(*) AS total FROM newsletter_suppressions").get(),
    ).toEqual({ total: 1 });
    expect(
      JSON.stringify(database.sqlite.query("SELECT * FROM newsletter_consent_events").all()),
    ).not.toContain("reader@example.com");
    expect((await send())?.status).toBe(202);
    expect(
      database.sqlite.query("SELECT COUNT(*) AS total FROM newsletter_suppressions").get(),
    ).toEqual({ total: 1 });
    expect(database.sqlite.query("SELECT sync_status FROM newsletter_kit_pending").get()).toEqual({
      sync_status: "associated",
    });
    expect(
      database.sqlite.query("SELECT COUNT(*) AS total FROM newsletter_subscribers").get(),
    ).toEqual({ total: 0 });
  });

  test("evento assinado desconhecido é reconhecido sem efeitos de assinatura", async () => {
    const { database, webhook } = fixture();
    const event = {
      id: "44444444-4444-4444-8444-444444444444",
      type: "subscriber.created",
      created: "2027-01-15T08:00:00.000Z",
      data: {},
    };
    expect((await webhook([event]))?.status).toBe(204);
    expect(
      database.sqlite.query("SELECT event_type FROM newsletter_kit_webhook_events").get(),
    ).toEqual({
      event_type: "subscriber.created",
    });
    expect(
      database.sqlite.query("SELECT COUNT(*) AS total FROM newsletter_subscribers").get(),
    ).toEqual({ total: 0 });
  });
});
