import { prepare as prepareAudit } from "../i18n-simulation/pipeline";
import { parseEditorialFile as parseAudit } from "../generate-content";
import { test, expect } from "bun:test";
import { mkdtemp, readFile, writeFile, mkdir, cp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { append, loadBook, replay, locked, checkBudget, held } from "./ledger";
import { authorize, plan, execute, reconcile } from "./run";
import { input, draft, payload, decode } from "./translation";
import { nanos, policy } from "./policy";
import fixture from "../i18n-cloudflare-experiment/complete-translations.fixture.json";
const root = process.cwd();
async function temporary(fn: (dir: string) => Promise<void>) {
  const d = await mkdtemp(join(tmpdir(), "sg-operations-"));
  try {
    await fn(d);
  } finally {
    await rm(d, { recursive: true, force: true });
  }
}
const cred = { account: "a".repeat(32), token: "TEST-ONLY-NOT-REAL" };
test("policy enforces regular, contingency and lifetime article budgets", () => {
  const b = replay([]);
  expect(() => checkBudget(b, "a", "2026-10", "regular", policy.article + 1)).toThrow(
    "article-budget",
  );
  const run = {
    id: "r",
    article: "a",
    month: "2026-10",
    pool: "regular" as const,
    reserved: 100_000_000,
    calculated: 0,
    confirmed: null,
    state: "complete",
    reconciled: false,
    calls: new Set<string>(),
    usage: new Set<string>(),
  };
  b.runs.set("r", run);
  expect(() => checkBudget(b, "a", "2026-11", "regular", 60_000_000)).toThrow("article-budget");
  b.runs.clear();
  for (let i = 0; i < 80; i++) b.runs.set(String(i), { ...run, id: String(i), article: String(i) });
  expect(() => checkBudget(b, "new", "2026-10", "regular", 1)).toThrow("pool-budget");
  for (const r of b.runs.values()) r.pool = "regular";
  b.runs.set("c", { ...run, id: "c", article: "c", pool: "contingency", reserved: 2_000_000_000 });
  expect(() => checkBudget(b, "new", "2026-10", "contingency", 1)).toThrow("monthly-budget");
});
test("ledger preserves holds, explicit unknown billing reconciliation, detects tampering", () =>
  temporary(async (d) => {
    let b = await append(d, replay([]), "reserve", "r", {
      article: "a",
      month: "2026-10",
      pool: "regular",
      reserved: 40_000_000,
    });
    b = await append(d, b, "dispatch", "r", { call: "en:0" });
    b = await append(d, b, "usage", "r", { call: "en:0", calculated: 2_000_000 });
    await expect(append(d, b, "dispatch", "r", { call: "en:0" })).rejects.toThrow("duplicate");
    b = await append(d, b, "failed", "r", {});
    expect(() => checkBudget(b, "a", "2026-10", "regular", 1)).toThrow("reconcile");
    b = await append(d, b, "reconcile", "r", {
      operator: "test",
      reason: "unknown invoice",
      confirmed: null,
    });
    expect(held(b.runs.get("r")!)).toBe(40_000_000);
    expect(b.runs.get("r")?.confirmed).toBeNull();
    await expect(
      append(d, b, "reconcile", "r", { operator: "test", reason: "again", confirmed: null }),
    ).rejects.toThrow();
    expect((await loadBook(d)).digest).toBe(b.digest);
    const events = JSON.parse(await readFile(join(d, "ledger.json"), "utf8"));
    events[0].data.reserved = 1;
    await writeFile(join(d, "ledger.json"), JSON.stringify(events));
    await expect(loadBook(d)).rejects.toThrow("integrity");
  }));
test("confirmed billing needs evidence and cannot release reservation", () =>
  temporary(async (d) => {
    let b = await append(d, replay([]), "reserve", "r", {
      article: "a",
      month: "2026-10",
      pool: "regular",
      reserved: 40_000_000,
    });
    await expect(
      append(d, b, "reconcile", "r", { operator: "test", reason: "invoice", confirmed: 1 }),
    ).rejects.toThrow("evidence");
    b = await append(d, b, "reconcile", "r", {
      operator: "test",
      reason: "invoice",
      confirmed: 1,
      evidence: "invoice-local-reference",
    });
    expect(held(b.runs.get("r")!)).toBe(40_000_000);
  }));
test("lock excludes concurrent processes and stale head fails closed", () =>
  temporary(async (d) => {
    await locked(d, async () => {
      await expect(locked(d, async () => {})).rejects.toThrow();
    });
    await writeFile(join(d, "head"), "previous-book");
    await expect(loadBook(d)).rejects.toThrow("missing-ledger");
  }));
test("financial authorization is exact, separate, and contingency-specific", () =>
  temporary(async (dir) => {
    await cloneFixture(dir);
    const p = await plan(dir, "o-que-e-potencia");
    expect(p.allowed).toBe(true);
    expect(p.calls.length).toBe((await input(root, "o-que-e-potencia")).chunks.length * 2);
    expect(() => authorize(p, p.planHash, undefined, undefined)).toThrow();
    expect(() => authorize(p, "wrong", "1", undefined)).toThrow();
    expect(() => authorize(p, p.planHash, "1", undefined)).not.toThrow();
    const c = { ...p, pool: "contingency" as const };
    expect(() => authorize(c, c.planHash, "1", undefined)).toThrow("contingency");
    expect(() =>
      authorize({ ...p, allowed: false, blocked: "blocked" }, p.planHash, "1", undefined),
    ).toThrow("blocked");
  }));
test("published input protects math, boundaries and all metadata; simulated EN ES compile", async () => {
  const s = await input(root, "o-que-e-potencia");
  for (const chunk of s.chunks) {
    const sent = JSON.parse(payload(chunk, "en").messages[1].content);
    for (const leaf of sent) {
      expect(leaf.text).not.toMatch(/^[ \t\r\n]|[ \t\r\n]$/);
      expect(s.protectedSegments.some((p) => p.id === leaf.id)).toBe(false);
    }
  }
  for (const locale of ["en", "es"] as const) {
    const map = Object.fromEntries(
      s.chunks.flat().map((x) => [x.id, fixture[locale][x.id as keyof typeof fixture.en]]),
    );
    const result = await draft(s, locale, map);
    expect(result.mdx).toContain('"status": "draft"');
    expect(result.mdx).toContain('"status": "pending"');
    expect(result.publishable).toBe(false);
    for (const eq of s.protectedSegments) expect(result.mdx).toContain(eq.text);
  }
});
test("missing, extra, untranslated and changed numeric leaves block drafts", async () => {
  const s = await input(root, "o-que-e-potencia");
  const map = Object.fromEntries(
    s.chunks.flat().map((x) => [x.id, fixture.en[x.id as keyof typeof fixture.en]]),
  );
  await expect(draft(s, "en", { ...map, extra: "extra" })).rejects.toThrow("incomplete");
  const missing = { ...map };
  delete missing[s.chunks[0][0].id];
  await expect(draft(s, "en", missing)).rejects.toThrow("incomplete");
  const prose = s.chunks.flat().find((x) => (x.text.match(/\p{L}+/gu)?.length ?? 0) >= 3)!;
  await expect(draft(s, "en", { ...map, [prose.id]: prose.text })).rejects.toThrow("untranslated");
  const numeric = s.chunks.flat().find((x) => /\d/.test(x.text))!;
  await expect(
    draft(s, "en", { ...map, [numeric.id]: map[numeric.id].replace(/\d/, "9") }),
  ).rejects.toThrow();
});
test("parser rejects duplicate, missing, malformed and truncated replies", () => {
  const chunk = [{ id: "s1", text: "teste", start: 0, end: 5 }];
  const result = {
    response: { translations: [{ id: "s1", text: "test" }] },
    usage: { prompt_tokens: 1, completion_tokens: 1 },
  };
  expect(decode(result, chunk)).toEqual({ s1: "test" });
  expect(() => decode({ ...result, response: "{broken" }, chunk)).toThrow();
  expect(() => decode({ ...result, response: { translations: [] } }, chunk)).toThrow();
  expect(() =>
    decode({ ...result, usage: { prompt_tokens: 1, completion_tokens: 2500 } }, chunk),
  ).toThrow();
  expect(() =>
    decode(
      {
        ...result,
        response: {
          translations: [
            { id: "s1", text: "test" },
            { id: "s1", text: "test" },
          ],
        },
      },
      chunk,
    ),
  ).toThrow();
});
async function cloneFixture(dir: string) {
  for (const path of [
    "scripts/i18n-operations",
    "scripts/i18n-simulation/pipeline.ts",
    "scripts/i18n-real-pilot/adapters.ts",
    "scripts/i18n-real-pilot/budget.ts",
    "scripts/i18n-real-pilot/sample.ts",
    "scripts/i18n-cloudflare-experiment/experiment.ts",
    "scripts/generate-content.ts",
    "src/content/schema.ts",
    "src/content/translation-schema.ts",
    "src/content/remark-editorial-slots.ts",
    "bun.lock",
    "package.json",
    "content/articles/o-que-e-potencia.mdx",
  ]) {
    await mkdir(join(dir, path, ".."), { recursive: true });
    await cp(join(root, path), join(dir, path), { recursive: true });
  }
}
test("complete simulated calls persist usage and only create nonpublic pending drafts", () =>
  temporary(async (dir) => {
    await cloneFixture(dir);
    const p = await plan(dir, "o-que-e-potencia");
    let calls = 0;
    const result = await execute(dir, "o-que-e-potencia", {
      authorization: p.planHash,
      paid: "1",
      credentials: cred,
      transport: async (_url, init) => {
        calls++;
        expect(new URL(_url).origin).toBe("https://api.cloudflare.com");
        expect(new URL(_url).pathname).toBe(
          `/client/v4/accounts/${cred.account}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`,
        );
        expect(init.method).toBe("POST");
        expect(init.redirect).toBe("error");
        expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
        const body = JSON.parse(String(init.body));
        expect(body.max_tokens).toBe(2500);
        expect(body.stream).toBe(false);
        expect(body.response_format).toEqual({ type: "json_object" });
        const locale = body.messages[0].content.includes("Target language: English") ? "en" : "es";
        const leaves = JSON.parse(body.messages[1].content) as { id: string }[];
        return Response.json({
          success: true,
          result: {
            response: {
              translations: leaves
                .map((s) => ({ id: s.id, text: fixture[locale][s.id as keyof typeof fixture.en] }))
                .reverse(),
            },
            usage: { prompt_tokens: 100, completion_tokens: 100, neurons: 1 },
          },
        });
      },
    });
    expect(calls).toBe(p.calls.length);
    for (const locale of ["en", "es"] as const) {
      const raw = await readFile(join(result.destination, locale + ".mdx"), "utf8");
      const parsed = parseAudit(raw);
      expect(parsed.frontmatter.status).toBe("draft");
      const original = await input(dir, "o-que-e-potencia");
      for (const field of ["title", "subtitle", "excerpt", "seoTitle", "seoDescription"] as const)
        expect(parsed.frontmatter[field]).toBe(
          fixture[locale][`meta:${field}` as keyof typeof fixture.en],
        );
      for (const field of ["alt", "caption"] as const)
        expect(parsed.frontmatter.cover[field]).toBe(
          fixture[locale][`cover:${field}` as keyof typeof fixture.en],
        );
      for (const leaf of original.protectedSegments) expect(raw).toContain(leaf.text);
      expect(prepareAudit(parsed.body).bibliography).toBe(original.source.bibliography);
    }
    const manifest = JSON.parse(await readFile(join(result.destination, "review.json"), "utf8"));
    expect(manifest.publishable).toBe(false);
    expect(manifest.findings.en).toBeArray();
    expect(manifest.findings.es).toBeArray();
    expect(result.status).toBe("REVIEW_REQUIRED");
    expect(result.destination).toContain("i18n/storage/review/");
    const b = await loadBook(join(dir, "i18n/storage"));
    expect(b.runs.get(result.run)?.state).toBe("complete");
    expect(b.events.filter((e) => e.kind === "usage").length).toBe(calls);
    let repeated = 0;
    await expect(
      execute(dir, "o-que-e-potencia", {
        authorization: p.planHash,
        paid: "1",
        credentials: cred,
        transport: async () => {
          repeated++;
          throw Error("never");
        },
      }),
    ).rejects.toThrow();
    expect(repeated).toBe(0);
  }));
test("interrupted provider requires reconciliation, preserves full reserve, no retry or output", () =>
  temporary(async (dir) => {
    await cloneFixture(dir);
    const p = await plan(dir, "o-que-e-potencia");
    let calls = 0;
    await expect(
      execute(dir, "o-que-e-potencia", {
        authorization: p.planHash,
        paid: "1",
        credentials: cred,
        transport: async () => {
          calls++;
          throw Error("simulated failure");
        },
      }),
    ).rejects.toThrow();
    expect(calls).toBe(1);
    const b = await loadBook(join(dir, "i18n/storage"));
    expect([...b.runs.values()][0].reserved).toBe(p.reserved);
    expect((await plan(dir, "o-que-e-potencia")).blocked).toBe("reconcile-before-retry");
    await expect(
      reconcile(dir, p.planHash, "stale", "test", "unknown invoice", null),
    ).rejects.toThrow("stale");
    await reconcile(dir, p.planHash, b.digest, "test", "unknown invoice", null);
    expect((await loadBook(join(dir, "i18n/storage"))).runs.get(p.planHash)?.confirmed).toBeNull();
  }));
test("money rejects invalid values", () => {
  for (const n of [NaN, Infinity, -1]) expect(() => nanos(n)).toThrow();
});

test("failed decoding still accounts reported usage before reconciliation", () =>
  temporary(async (dir) => {
    await cloneFixture(dir);
    const p = await plan(dir, "o-que-e-potencia");
    let calls = 0;
    await expect(
      execute(dir, "o-que-e-potencia", {
        authorization: p.planHash,
        paid: "1",
        credentials: cred,
        transport: async () => {
          calls++;
          return Response.json({
            success: true,
            result: {
              response: "{broken",
              usage: { prompt_tokens: 1114, completion_tokens: 1103, neurons: 255.608 },
            },
          });
        },
      }),
    ).rejects.toThrow();
    const b = await loadBook(join(dir, "i18n/storage"));
    expect(calls).toBe(1);
    expect(b.events.some((e) => e.kind === "usage")).toBe(true);
    expect(b.runs.get(p.planHash)?.calculated).toBeGreaterThan(0);
    expect(b.runs.get(p.planHash)?.reserved).toBe(p.reserved);
    expect(b.runs.get(p.planHash)?.confirmed).toBeNull();
  }));
test("source or code change invalidates the exact plan before any dispatch", () =>
  temporary(async (dir) => {
    await cloneFixture(dir);
    const p = await plan(dir, "o-que-e-potencia");
    await writeFile(join(dir, "scripts/i18n-operations/policy.ts"), "// changed code");
    let calls = 0;
    await expect(
      execute(dir, "o-que-e-potencia", {
        authorization: p.planHash,
        paid: "1",
        credentials: cred,
        transport: async () => {
          calls++;
          throw Error("never");
        },
      }),
    ).rejects.toThrow("authorization");
    expect(calls).toBe(0);
  }));
test("plan is read-only and credentials are not required", () =>
  temporary(async (dir) => {
    await cloneFixture(dir);
    const p = await plan(dir, "o-que-e-potencia");
    expect(p.history).toBe("GENESIS");
    await expect(readFile(join(dir, "i18n/storage/ledger.json"))).rejects.toThrow();
  }));

test("late billing confirmation is appended after operational reconciliation without releasing reserves", () =>
  temporary(async (d) => {
    let b = await append(d, replay([]), "reserve", "r", {
      article: "a",
      month: "2026-10",
      pool: "regular",
      reserved: 40_000_000,
    });
    b = await append(d, b, "reconcile", "r", {
      operator: "test",
      reason: "unknown billing",
      confirmed: null,
    });
    await expect(
      append(d, b, "billing", "r", { operator: "test", reason: "invoice", confirmed: 2_000_000 }),
    ).rejects.toThrow();
    b = await append(d, b, "billing", "r", {
      operator: "test",
      reason: "invoice",
      confirmed: 2_000_000,
      evidence: "invoice reference",
    });
    expect(b.runs.get("r")?.confirmed).toBe(2_000_000);
    expect(held(b.runs.get("r")!)).toBe(40_000_000);
    await expect(
      append(d, b, "billing", "r", {
        operator: "test",
        reason: "duplicate",
        confirmed: 1,
        evidence: "other",
      }),
    ).rejects.toThrow();
  }));

test("request failure records safe diagnostics and blocks duplicate dispatch without reconciliation", () =>
  temporary(async (dir) => {
    await cloneFixture(dir);
    const p = await plan(dir, "o-que-e-potencia");
    let calls = 0;
    const options = {
      authorization: p.planHash,
      paid: "1",
      credentials: cred,
      transport: async () => {
        calls++;
        return new Response("SECRET BODY", { status: 401 });
      },
    };
    await expect(execute(dir, "o-que-e-potencia", options)).rejects.toMatchObject({
      diagnostic: { code: "provider-auth-rejected", httpStatus: 401 },
    });
    const book = await loadBook(join(dir, "i18n/storage"));
    const data = book.events.at(-1)?.data;
    expect(data).toMatchObject({
      code: "provider-auth-rejected",
      stage: "request",
      dispatch: "response-received",
      billingStatus: "unknown",
      billingConfirmed: null,
      call: "en:0",
    });
    expect(JSON.stringify(data)).not.toContain("SECRET BODY");
    await expect(execute(dir, "o-que-e-potencia", options)).rejects.toThrow(
      "reconcile-before-retry",
    );
    expect(calls).toBe(1);
  }));

test("failure to persist diagnostics never replaces provider error or rewrites uncertain checkpoint", () =>
  temporary(async (dir) => {
    await cloneFixture(dir);
    const p = await plan(dir, "o-que-e-potencia");
    let calls = 0;
    await expect(
      execute(dir, "o-que-e-potencia", {
        authorization: p.planHash,
        paid: "1",
        credentials: cred,
        transport: async () => {
          calls++;
          await writeFile(join(dir, "i18n/storage/head"), "SIMULATED-CORRUPT-CHECKPOINT");
          return new Response("PRIVATE BODY", { status: 403 });
        },
      }),
    ).rejects.toMatchObject({
      diagnostic: { code: "provider-auth-rejected", failureRecordCode: "ledger-head-mismatch" },
    });
    expect(calls).toBe(1);
    const events = JSON.parse(await readFile(join(dir, "i18n/storage/ledger.json"), "utf8"));
    expect(events.map((e: { kind: string }) => e.kind)).toEqual(["reserve", "dispatch"]);
    expect(await readFile(join(dir, "i18n/storage/head"), "utf8")).toBe(
      "SIMULATED-CORRUPT-CHECKPOINT",
    );
  }));

test("editorial review warnings survive draft assembly with original IDs", async () => {
  const original = await input(root, "o-que-e-potencia");
  const source = prepareAudit("O resultado pode variar.\n\n## Referências\n");
  const result = await draft(
    { ...original, source, metadata: [], protectedSegments: [], chunks: [source.segments] },
    "en",
    { s0: "The result varies." },
  );
  expect(result.findings.some((f) => f.severity === "review" && f.segment === "s0")).toBe(true);
  expect(result.status).toBe("REVIEW_REQUIRED");
  expect(result.publishable).toBe(false);
});
