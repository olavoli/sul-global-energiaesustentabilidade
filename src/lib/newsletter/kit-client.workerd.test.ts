import { expect, test } from "bun:test";
import { Miniflare, Request as MockRequest, Response as MockResponse } from "miniflare";

test("workerd confirma receptor incorreto e aceita fetch global e wrapper", async () => {
  let requests = 0;
  const emulator = new Miniflare({
    modules: true,
    compatibilityDate: "2026-07-15",
    cf: false,
    outboundService: () => {
      requests++;
      return new MockResponse("simulated");
    },
    script: `
      class IncorrectClient {
        constructor() { this.fetcher = fetch; }
        request() { return this.fetcher("https://newsletter-runtime.test/mock"); }
      }
      class WrappedClient {
        constructor() { this.fetcher = (...args) => globalThis.fetch(...args); }
        request() { return this.fetcher("https://newsletter-runtime.test/mock"); }
      }
      export default { async fetch() {
        let incorrect;
        try { await new IncorrectClient().request(); }
        catch (error) {
          incorrect = { name: error.name, illegalInvocation: error.message.includes("Illegal invocation") };
        }
        const direct = await globalThis.fetch("https://newsletter-runtime.test/mock");
        const wrapped = await new WrappedClient().request();
        return Response.json({ incorrect, direct: await direct.text(), wrapped: await wrapped.text() });
      }};
    `,
  });
  try {
    const response = await emulator.dispatchFetch("https://local.test/");
    expect(await response.json()).toEqual({
      incorrect: { name: "TypeError", illegalInvocation: true },
      direct: "simulated",
      wrapped: "simulated",
    });
    expect(requests).toBe(2);
  } finally {
    await emulator.dispose();
  }
}, 30_000);

test("cliente real funciona no workerd com fetch nativo e injetado, sem saída externa", async () => {
  const bundle = await Bun.build({
    entrypoints: [`${import.meta.dir}/kit-client.ts`],
    target: "browser",
    format: "esm",
  });
  expect(bundle.success).toBe(true);
  // Redirect only this in-memory test bundle to a fictitious origin.
  const clientScript = (await bundle.outputs[0].text()).replaceAll(
    "https://api.kit.com/v4",
    "https://newsletter-runtime.test/v4",
  );
  const calls: Array<{ path: string; method: string; key: string | null; body: unknown }> = [];
  const emulator = new Miniflare({
    modules: true,
    compatibilityDate: "2026-07-15",
    cf: false,
    outboundService: async (request: MockRequest) => {
      const url = new URL(request.url);
      if (url.hostname !== "newsletter-runtime.test") throw new Error("Unexpected mock origin");
      calls.push({
        path: url.pathname,
        method: request.method,
        key: request.headers.get("x-kit-api-key"),
        body: request.method === "POST" ? await request.json() : null,
      });
      return MockResponse.json({
        subscriber: { id: 42, state: "inactive", email_address: "reader@example.com" },
      });
    },
    script: `${clientScript}
      export default { async fetch() {
        const results = [];
        for (const injected of [undefined, (...args) => globalThis.fetch(...args)]) {
          const client = new KitNewsletterClient("mock-key", "77", injected);
          const created = await client.createInactiveSubscriber("reader@example.com");
          await client.associateSubscriberWithForm(created.id, "https://local.test/newsletter");
          const observed = await client.getSubscriber(created.id);
          results.push({ id: created.id, state: observed.state });
        }
        return Response.json(results);
      }};
    `,
  });
  try {
    const response = await emulator.dispatchFetch("https://local.test/");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      { id: "42", state: "inactive" },
      { id: "42", state: "inactive" },
    ]);
    expect(calls).toHaveLength(6);
    expect(calls.slice(0, 3)).toEqual([
      {
        path: "/v4/subscribers",
        method: "POST",
        key: "mock-key",
        body: { email_address: "reader@example.com", state: "inactive" },
      },
      {
        path: "/v4/forms/77/subscribers/42",
        method: "POST",
        key: "mock-key",
        body: { referrer: "https://local.test/newsletter" },
      },
      { path: "/v4/subscribers/42", method: "GET", key: "mock-key", body: null },
    ]);
    expect(calls.slice(3)).toEqual(calls.slice(0, 3));
  } finally {
    await emulator.dispose();
  }
}, 30_000);
