import { describe, expect, test } from "bun:test";
import { Budget, cost, inputEstimate, limits, type Ledger } from "./budget";
import { credentials, models, PilotAdapters, reviewPayload, translationPayload } from "./adapters";
import { loadSample, estimateArticle, batches, sample } from "./sample";
import { summarize, project } from "./metrics";
import { prepare } from "../i18n-simulation/pipeline";
import { sourceBody } from "../i18n-simulation/fixtures";
const auth = {
  cloudflareToken: "fixture-only-cf",
  cloudflareAccount: "a".repeat(32),
  openaiKey: "fixture-only-openai",
};
const segment = { id: "s0", text: "Um teste.", start: 0, end: 9 };
function setup() {
  const ledger: Ledger = { version: "real-pilot-v1", calls: [] };
  const saved: string[] = [];
  const budget = new Budget(ledger, async (l) => {
    saved.push(JSON.stringify(l));
  });
  return { ledger, budget, saved };
}
function cf(
  response = '{"translations":[{"id":"s0","text":"A test."}]}',
  usage: unknown = { prompt_tokens: 100, completion_tokens: 20 },
) {
  return Response.json({ success: true, result: { response, usage } });
}
function oa(text: string, status = "completed") {
  return Response.json({
    status,
    model: models.openai,
    usage: { input_tokens: 200, output_tokens: 50 },
    output: [{ type: "message", content: [{ type: "output_text", text }] }],
  });
}
describe("real cost pilot, injected responses only; no paid API traffic", () => {
  test("only explicit dedicated credentials; no production/OAuth fallback", () => {
    expect(credentials({ OPENAI_API_KEY: "fixture", CLOUDFLARE_API_TOKEN: "fixture" })).toBeNull();
    expect(credentials({ I18N_PILOT_OPENAI_API_KEY: "fixture" })).toBeNull();
    expect(() =>
      credentials({
        I18N_PILOT_OPENAI_API_KEY: "secret\n",
        I18N_PILOT_CF_API_TOKEN: "fixture",
        I18N_PILOT_CF_ACCOUNT_ID: "a".repeat(32),
      }),
    ).toThrow("invalid-pilot-credential-format");
  });
  test("prices are separate from observed usage and invoiced cost", () => {
    expect(cost("cloudflare", 1e6, 1e6)).toBeCloseTo(2.546);
    expect(cost("openai", 1e6, 1e6)).toBeCloseTo(5.25);
    expect(inputEstimate({ text: "ç" })).toBeGreaterThan(JSON.stringify({ text: "ç" }).length);
  });
  test("reservation persists before the request, usage retained, fixed URL and no redirect", async () => {
    const { ledger, budget, saved } = setup();
    let calls = 0;
    const adapters = new PilotAdapters(auth, budget, async (url, init) => {
      calls++;
      expect(saved.length).toBe(1);
      expect(ledger.calls[0].status).toBe("reserved");
      expect(url).toBe(
        `https://api.cloudflare.com/client/v4/accounts/${auth.cloudflareAccount}/ai/run/${models.cloudflare}`,
      );
      expect(init.redirect).toBe("error");
      const payload = JSON.parse(String(init.body));
      expect(payload.max_tokens).toBe(limits.outputTranslation);
      expect(payload.stream).toBe(false);
      return cf();
    });
    expect(await adapters.translate([segment], "en", "public-fixture", 0)).toEqual({
      s0: "A test.",
    });
    expect(calls).toBe(1);
    expect(ledger.calls[0].usage).toMatchObject({
      inputTokens: 100,
      outputTokens: 20,
      neurons: null,
      providerReportedCostUSD: null,
    });
    expect(ledger.calls[0].usageCalculatedUSD).toBeGreaterThan(0);
    expect(ledger.calls[0].differenceUSD).toBeLessThan(0);
    await expect(adapters.translate([segment], "en", "public-fixture", 0)).rejects.toThrow(
      "retry-forbidden",
    );
    expect(calls).toBe(1);
  });
  test("budget, article budget, tokens and concurrency stop before network", async () => {
    for (const kind of ["global", "article", "tokens", "concurrency"]) {
      const { ledger, budget } = setup();
      const request = {
        id: "x",
        article: "public-fixture",
        locale: "en" as const,
        stage: "translation" as const,
        provider: "cloudflare" as const,
        estimatedInputTokens: 100,
        maxOutputTokens: limits.outputTranslation,
      };
      if (kind === "tokens") request.estimatedInputTokens = limits.inputPerCall + 1;
      if (kind === "concurrency") await budget.reserve({ ...request, id: "first" });
      if (kind === "global" || kind === "article")
        ledger.calls.push({
          ...request,
          id: "old",
          article: kind === "global" ? "another" : "public-fixture",
          reservedUSD: kind === "global" ? 1 : limits.articleUSD,
          status: "completed",
          attempts: 1,
          usage: null,
          usageCalculatedUSD: null,
          differenceUSD: null,
          durationMs: null,
          errorCode: null,
        });
      await expect(budget.reserve(request)).rejects.toThrow();
    }
  });
  for (const status of [401, 403, 429, 500])
    test(`HTTP ${status}: one attempt, generic error, reservation retained`, async () => {
      const { ledger, budget } = setup();
      let calls = 0;
      const a = new PilotAdapters(auth, budget, async () => {
        calls++;
        return new Response("secret vendor response", { status });
      });
      await expect(a.translate([segment], "en", "public-fixture", 0)).rejects.toThrow(
        `provider-http-${status}`,
      );
      expect(calls).toBe(1);
      expect(ledger.calls[0].status).toBe("failed");
      expect(ledger.calls[0].usage).toBeNull();
      await expect(a.translate([segment], "es", "public-fixture", 0)).rejects.toThrow(
        "unreconciled-call-stop",
      );
      expect(calls).toBe(1);
      expect(JSON.stringify(ledger)).not.toContain("secret vendor");
    });
  test("timeout/transport errors are sanitized, no automatic retry", async () => {
    const { ledger, budget } = setup();
    const a = new PilotAdapters(auth, budget, async () => {
      throw new Error("token=fixture-sensitive-value");
    });
    await expect(a.translate([segment], "en", "public-fixture", 0)).rejects.toThrow(
      "provider-or-response-failure",
    );
    expect(JSON.stringify(ledger)).not.toContain("sensitive");
  });
  test("missing usage cannot be fabricated as zero; reject malformed envelope", async () => {
    const { ledger, budget } = setup();
    const a = new PilotAdapters(auth, budget, async () => cf(undefined, {}));
    await expect(a.translate([segment], "en", "public-fixture", 0)).rejects.toThrow();
    expect(ledger.calls[0].usage).toBeNull();
    expect(ledger.calls[0].reservedUSD).toBeGreaterThan(0);
  });
  test("malformed or duplicate translated IDs preserve paid usage, not retried", async () => {
    for (const response of [
      "not json",
      '{"translations":[{"id":"s0","text":"a"},{"id":"s0","text":"b"}]}',
    ]) {
      const { ledger, budget } = setup();
      const a = new PilotAdapters(auth, budget, async () => cf(response));
      await expect(a.translate([segment], "en", "public-fixture", 0)).rejects.toThrow();
      expect(ledger.calls[0].usage?.outputTokens).toBe(20);
    }
  });
  test("OpenAI independent review uses pinned model, no storage/tools and exact evidence", async () => {
    const { ledger, budget } = setup();
    const source = prepare(sourceBody);
    const target = source;
    const result = {
      checks: [
        "causality",
        "certainty",
        "conditions",
        "conclusions",
        "mineral-terms",
        "estimates",
        "statistics",
      ].map((d) => ({
        dimension: d,
        segmentId: "s0",
        sourceQuote: source.segments[0].text,
        targetQuote: source.segments[0].text,
        result: "equivalent",
        explanation: "Injected fixture, not an actual AI judgment",
      })),
    };
    const a = new PilotAdapters(auth, budget, async (url, init) => {
      expect(url).toBe("https://api.openai.com/v1/responses");
      const p = JSON.parse(String(init.body));
      expect(p.store).toBe(false);
      expect(p.model).toBe(models.openai);
      expect(p.tools).toBeUndefined();
      expect(p.max_output_tokens).toBe(limits.outputReview);
      return oa(JSON.stringify(result));
    });
    const report = await a.review(
      source,
      target,
      [source.segments[0]],
      { s0: source.segments[0].text },
      "en",
      "public-fixture",
      0,
    );
    expect(report.provider).toBe("openai");
    expect(report.checks.length).toBe(7);
    expect(ledger.calls[0].usage?.inputTokens).toBe(200);
  });
  test("incomplete review preserves returned usage and blocks continuation", async () => {
    const { ledger, budget } = setup();
    const source = prepare(sourceBody);
    const a = new PilotAdapters(auth, budget, async () => oa("", "incomplete"));
    await expect(
      a.review(
        source,
        source,
        [source.segments[0]],
        { s0: source.segments[0].text },
        "en",
        "public-fixture",
        0,
      ),
    ).rejects.toThrow();
    expect(ledger.calls[0].usage?.outputTokens).toBe(50);
    expect(ledger.calls[0].status).toBe("failed");
  });
  test("fabricated or incomplete semantic quotes do not pass", async () => {
    const { budget } = setup();
    const source = prepare(sourceBody);
    const a = new PilotAdapters(auth, budget, async () => oa('{"checks":[]}'));
    await expect(
      a.review(
        source,
        source,
        [source.segments[0]],
        { s0: source.segments[0].text },
        "en",
        "public-fixture",
        0,
      ),
    ).rejects.toThrow("semantic-json-invalid");
  });
  test("three public approved samples fit the projected one-dollar campaign; ART033 excluded", async () => {
    const articles = await loadSample(process.cwd());
    expect(articles.length).toBe(3);
    expect(sample.some((a) => a.slug.startsWith("terras-raras"))).toBe(false);
    let sum = 0;
    for (const a of articles) {
      expect(a.article.frontmatter.status).toBe("published");
      expect(a.article.frontmatter.isDemo).toBe(false);
      expect(a.sourceRevision).toMatch(/^[a-f0-9]{64}$/);
      const plans = (["en", "es"] as const).map((l) => estimateArticle(a.chunks, l));
      sum += plans.reduce((n, e) => n + e.translationUSD + e.reviewUSD, 0);
      expect(plans.reduce((n, e) => n + e.outputTokenCeiling, 0)).toBeLessThanOrEqual(
        limits.outputPerArticle,
      );
      expect(plans.reduce((n, e) => n + e.calls, 0)).toBeLessThanOrEqual(limits.callsPerArticle);
    }
    expect(sum).toBeLessThanOrEqual(1);
  });
  test("chunk and prompt limits never silently truncate scientific text", () => {
    expect(() => batches([{ ...segment, text: "x".repeat(4000) }])).toThrow();
    expect(translationPayload([segment], "es").messages[0].content).toContain("caveats");
    expect(reviewPayload([{ id: "s0", source: "a", target: "b" }], "es").instructions).toContain(
      "resources/reserves/production",
    );
  });
});

test("unknown billing is null; forecasts never masquerade as observed usage", async () => {
  expect(summarize([]).translation.inputTokens).toBeNull();
  expect(summarize([]).translation.usageCalculatedUSD).toBeNull();
  expect(project(null).every((p) => p.usageBasedUSD === null)).toBe(true);
  expect(project(0.2).map((p) => p.usageBasedUSD)).toEqual([2, 6, 10, 20]);
});

test("reported usage above the estimate is preserved and stops the next request", async () => {
  const { ledger, budget } = setup();
  let count = 0;
  const a = new PilotAdapters(auth, budget, async () => {
    count++;
    return cf(undefined, { prompt_tokens: 30000, completion_tokens: 20 });
  });
  await expect(a.translate([segment], "en", "public-fixture", 0)).rejects.toThrow();
  expect(ledger.calls[0].usage?.inputTokens).toBe(30000);
  expect(ledger.calls[0].usageCalculatedUSD).toBeGreaterThan(0);
  await expect(a.translate([segment], "es", "public-fixture", 0)).rejects.toThrow();
  expect(count).toBe(1);
});

test("failed budget persistence never authorizes the HTTP request", async () => {
  let calls = 0;
  const ledger: Ledger = { version: "real-pilot-v1", calls: [] };
  const a = new PilotAdapters(
    auth,
    new Budget(ledger, async () => {
      throw new Error("disk failure");
    }),
    async () => {
      calls++;
      return cf();
    },
  );
  await expect(a.translate([segment], "en", "public-fixture", 0)).rejects.toThrow();
  expect(calls).toBe(0);
});
