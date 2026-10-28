import { test, expect } from "bun:test";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { temporary, mock, credentials, slug } from "./automatic-fixtures.test";
import { execute, plan } from "./run";
import { loadBook } from "./ledger";
import { fingerprint } from "./policy";
import { freeMargin } from "./free-policy";
import { cloudflareFreeQuota } from "./free-provider";
import { request } from "./translation";
const proof = () => ({
  version: "owner-free-plan-v1",
  accountHash: fingerprint(credentials.account),
  plan: "workers-free",
  evidence: "SYNTHETIC owner confirmation of Workers Free",
  recordedAt: new Date().toISOString(),
});
const snapshot = () => ({
  accountHash: fingerprint(credentials.account),
  day: new Date().toISOString().slice(0, 10),
  asOf: new Date().toISOString(),
  plan: "workers-free",
  planEvidence: "SYNTHETIC owner confirmed Free",
  enforcement: "cloudflare-429-3036",
  model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  observedNeuronsEstimate: null,
  sharedUsage: "unknown-provider-enforced",
});
test("adaptive/absent metrics stay unknown but Free provider hard-stop permits local margin", async () => {
  let reads = 0;
  const quota = cloudflareFreeQuota(
    credentials,
    async (url, init) => {
      reads++;
      expect(new URL(url).pathname).toBe("/client/v4/graphql");
      expect(JSON.parse(String(init.body)).query).toStartWith("query");
      return Response.json({ data: { viewer: { accounts: [{ aiInferenceAdaptiveGroups: [] }] } } });
    },
    proof(),
  );
  const raw = await quota.read();
  expect(reads).toBe(1);
  expect(raw).toMatchObject({
    observedNeuronsEstimate: null,
    sharedUsage: "unknown-provider-enforced",
  });
  expect(() => freeMargin([], raw, 2, fingerprint(credentials.account))).not.toThrow();
});
test("metrics network failure is not zero usage and does not replace the provider cap", async () => {
  const raw = await cloudflareFreeQuota(
    credentials,
    async () => {
      throw Error("synthetic network");
    },
    proof(),
  ).read();
  expect(raw).toMatchObject({ observedNeuronsEstimate: null });
  expect(() => freeMargin([], raw, 1, fingerprint(credentials.account))).not.toThrow();
});
test("owner plan proof must be present, fresh and account-bound", async () => {
  let calls = 0;
  const transport = async () => {
    calls++;
    return Response.json({});
  };
  for (const value of [
    undefined,
    { ...proof(), plan: "paid" },
    { ...proof(), accountHash: "b".repeat(64) },
    { ...proof(), recordedAt: "2001-01-01T00:00:00Z" },
  ])
    await expect(cloudflareFreeQuota(credentials, transport, value).read()).rejects.toThrow(
      "free-plan-confirmation-required",
    );
  expect(calls).toBe(0);
});
test("local daily cap still blocks without exact shared metrics", () => {
  expect(() => freeMargin([], snapshot(), 8, fingerprint(credentials.account))).toThrow(
    "free-quota-exhausted",
  );
});
test("429/3036 stops, records code and never falls back or retries", () =>
  temporary(async (dir) => {
    let calls = 0;
    await expect(
      execute(dir, slug, {
        credentials,
        executionMode: "free-only",
        locales: ["en"],
        freeQuota: { read: async () => snapshot() },
        transport: async (url) => {
          calls++;
          expect(new URL(url).hostname).toBe("api.cloudflare.com");
          return Response.json(
            { errors: [{ code: 3036, message: "SYNTHETIC QUOTA MESSAGE" }] },
            { status: 429 },
          );
        },
      }),
    ).rejects.toMatchObject({
      diagnostic: { code: "free-quota-exhausted", httpStatus: 429, providerCode: 3036 },
    });
    expect(calls).toBe(1);
    const book = await loadBook(join(dir, "i18n/storage"));
    expect(book.events.find((e) => e.kind === "failed")?.data.providerCode).toBe(3036);
    expect([...book.runs.values()][0].reserved).toBeGreaterThan(0);
    expect(() => freeMargin(book.events, snapshot(), 1, fingerprint(credentials.account))).toThrow(
      "free-quota-exhausted",
    );
  }));
test("other 429 and paid-only models also stop, without upgrade", async () => {
  const chunk = [{ id: "s1", text: "teste", start: 0, end: 5 }];
  for (const [status, code, name] of [
    [429, 3040, "free-provider-rate-limited"],
    [403, 5035, "free-model-requires-paid"],
  ] as const) {
    let calls = 0;
    await expect(
      request(
        chunk,
        "en",
        credentials,
        async () => {
          calls++;
          return Response.json({ errors: [{ code }] }, { status });
        },
        true,
      ),
    ).rejects.toMatchObject({ diagnostic: { code: name, providerCode: code } });
    expect(calls).toBe(1);
  }
});
test("single EN validates before any ES call; provider responses remain private and pending", () =>
  temporary(async (dir) => {
    const m = mock();
    const result = await execute(dir, slug, {
      credentials,
      executionMode: "free-only",
      locales: ["en"],
      freeQuota: { read: async () => snapshot() },
      transport: async (url, init) => {
        expect(JSON.parse(String(init.body)).messages[0].content).toContain(
          "Target language: English",
        );
        return m.transport(url, init);
      },
    });
    const p = await plan(dir, slug, "regular", new Date(), ["en"]);
    expect(m.count()).toBe(p.calls.length);
    expect(result.locales).toEqual(["en"]);
    expect(result.publishable).toBe(false);
    await expect(readFile(join(result.destination, "es.mdx"), "utf8")).rejects.toThrow();
    const reply = await readFile(
      join(dir, "i18n/storage/responses", result.run, "en-0.json"),
      "utf8",
    );
    expect(reply).not.toContain(credentials.token);
    expect(reply).toContain('"publishable": false');
    expect(await readFile(join(result.destination, "en.mdx"), "utf8")).toContain(
      '"status": "draft"',
    );
  }));
test("missing neurons remain unknown; valid tokens and structures can still complete on Free", () =>
  temporary(async (dir) => {
    const m = mock();
    const result = await execute(dir, slug, {
      credentials,
      executionMode: "free-only",
      locales: ["es"],
      freeQuota: { read: async () => snapshot() },
      transport: async (url, init) => {
        const response = await m.transport(url, init),
          value = await response.json();
        delete value.result.usage.neurons;
        return Response.json(value);
      },
    });
    expect(result.locales).toEqual(["es"]);
    const b = await loadBook(join(dir, "i18n/storage"));
    expect(b.events.find((e) => e.kind === "usage")?.data.neurons).toBeNull();
    expect([...b.runs.values()][0].confirmed).toBeNull();
  }));
