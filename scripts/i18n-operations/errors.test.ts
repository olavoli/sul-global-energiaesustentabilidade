import { test, expect } from "bun:test";
import { request, decode } from "./translation";
import { failure, guard, OperationError } from "./errors";
import { summary } from "./run";
import { replay } from "./ledger";
const chunk = [{ id: "s0", text: "Um texto", start: 0, end: 8 }];
const credentials = { account: "a".repeat(32), token: "SYNTHETIC-SECRET-DO-NOT-LOG" };
for (const status of [401, 403, 429, 500])
  test(`HTTP ${status} is safe and response receipt is distinguished from billing`, async () => {
    try {
      await request(
        chunk,
        "en",
        credentials,
        async () => new Response("SENSITIVE PROVIDER BODY", { status }),
      );
      throw Error("expected failure");
    } catch (e) {
      const d = failure(e, "request", "attempted-unconfirmed").diagnostic;
      expect(d.code).toBe(
        status === 401 || status === 403 ? "provider-auth-rejected" : "provider-http-error",
      );
      expect(d.httpStatus).toBe(status);
      expect(d.dispatch).toBe("response-received");
      expect(d.billingStatus).toBe("unknown");
      expect(JSON.stringify(d)).not.toContain("SENSITIVE");
      expect(JSON.stringify(d)).not.toContain(credentials.token);
    }
  });
for (const name of ["TimeoutError", "AbortError", "TypeError"])
  test(`transport ${name} has unknown delivery, no raw exception`, async () => {
    try {
      await request(chunk, "es", credentials, async () => {
        const e = new Error("token=PRIVATE ACCOUNT DETAILS");
        e.name = name;
        throw e;
      });
      throw Error("expected");
    } catch (e) {
      const d = failure(e, "request").diagnostic;
      expect(d.code).toBe(name === "TypeError" ? "provider-network-error" : "provider-timeout");
      expect(d.dispatch).toBe("attempted-unconfirmed");
      expect(JSON.stringify(d)).not.toContain("PRIVATE");
    }
  });
for (const [body, code] of [
  ["{invalid", "provider-json-invalid"],
  [JSON.stringify({ success: false, errors: [{ message: "secret" }] }), "provider-rejected"],
  [JSON.stringify({ success: true, result: { response: {} } }), "provider-envelope-invalid"],
])
  test(`response ${code} is sanitized`, async () => {
    await expect(
      request(chunk, "en", credentials, async () => new Response(body)),
    ).rejects.toMatchObject({
      diagnostic: { code, dispatch: "response-received", billingStatus: "unknown" },
    });
  });
test("empty and oversized bodies have bounded safe errors", async () => {
  await expect(
    request(chunk, "en", credentials, async () => new Response(null)),
  ).rejects.toMatchObject({ diagnostic: { code: "provider-empty-response" } });
  await expect(
    request(chunk, "en", credentials, async () => new Response("x".repeat(2 * 1024 * 1024 + 1))),
  ).rejects.toMatchObject({ diagnostic: { code: "provider-response-size-limit" } });
});
test("authentication, filesystem, MDX, decode and unknown exceptions remain specific but safe", async () => {
  expect(failure(new Error("credentials-required"), "preflight").diagnostic.code).toBe(
    "credentials-required",
  );
  expect(failure(new Error("invalid-credentials"), "preflight").diagnostic.code).toBe(
    "invalid-credentials",
  );
  const disk = Object.assign(new Error("/private/path TOKEN=abc"), { code: "ENOSPC" });
  const d = failure(disk, "write", "response-received").diagnostic;
  expect(d.code).toBe("local-filesystem-error");
  expect(d.systemCode).toBe("ENOSPC");
  expect(JSON.stringify(d)).not.toContain("/private");
  expect(failure(new Error("MDX with sensitive prose"), "mdx").diagnostic.code).toBe(
    "mdx-validation-failed",
  );
  expect(failure(new Error("translation-json-invalid"), "decode").diagnostic.code).toBe(
    "translation-json-invalid",
  );
  expect(failure(new Error("deterministic-divergence:s35"), "mdx").diagnostic).toMatchObject({
    code: "deterministic-divergence",
    segment: "s35",
  });
  await expect(
    guard("mdx", "response-received", async () => {
      throw new Error("sensitive content");
    }),
  ).rejects.toBeInstanceOf(OperationError);
});
test("billing statuses do not equate unknown usage with zero billing", () => {
  const b = replay([]);
  const r = {
    id: "r",
    article: "a",
    month: "2026-10",
    pool: "regular" as const,
    reserved: 10,
    calculated: 0,
    confirmed: null as number | null,
    state: "failed",
    reconciled: false,
    calls: new Set(["en:0"]),
    usage: new Set<string>(),
  };
  b.runs.set("r", r);
  expect(summary(b).runs[0]).toMatchObject({
    billingStatus: "unknown",
    confirmedUSD: null,
    needsReconciliation: true,
    usageComplete: false,
  });
  r.usage.add("en:0");
  expect(summary(b).runs[0].billingStatus).toBe("unconfirmed");
  r.confirmed = 0;
  expect(summary(b).runs[0].billingStatus).toBe("confirmed");
});

for (const kind of ["string", "object"] as const)
  test(`documented Cloudflare envelope and JSON-mode ${kind} reach the decoder offline`, async () => {
    const value = { translations: [{ id: "s0", text: "A text" }] };
    const result = await request(chunk, "en", credentials, async () =>
      Response.json({
        success: true,
        result: {
          response: kind === "string" ? JSON.stringify(value) : value,
          usage: { prompt_tokens: 100, completion_tokens: 100, neurons: 1 },
        },
      }),
    );
    expect(decode(result, chunk)).toEqual({ s0: "A text" });
  });

test("known source and batch errors are sanitized and distinct from financial blockers", () => {
  expect(failure(new Error("Bibliography heading required"), "source").diagnostic).toMatchObject({
    code: "source-bibliography-heading-missing",
    stage: "source",
    dispatch: "not-attempted",
  });
  expect(failure(new Error("Unsupported translatable attribute"), "source").diagnostic.code).toBe(
    "source-mdx-attribute-unsupported",
  );
  expect(failure(new Error("segment-too-long-review-required"), "source").diagnostic.code).toBe(
    "source-segment-too-large",
  );
  expect(
    failure(Object.assign(new Error("PRIVATE PATH"), { code: "ENOENT" }), "source").diagnostic.code,
  ).toBe("source-not-found");
  expect(failure(new Error("source-not-public"), "source").diagnostic.code).toBe(
    "source-not-public",
  );
  expect(failure(new Error("PRIVATE INVALID CONTENT"), "source").diagnostic.code).toBe(
    "source-validation-failed",
  );
  for (const code of [
    "batch-unknown-billing",
    "article-budget-exceeded",
    "monthly-budget-exceeded",
    "pool-budget-exceeded",
    "batch-selection-required",
    "batch-plan-integrity",
  ])
    expect(failure(new Error(code), "preflight").diagnostic.code).toBe(code);
  expect(
    JSON.stringify(failure(new Error("PRIVATE INVALID CONTENT"), "source").diagnostic),
  ).not.toContain("PRIVATE");
});
