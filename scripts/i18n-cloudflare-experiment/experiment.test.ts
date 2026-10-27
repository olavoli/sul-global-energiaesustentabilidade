import { expect, test } from "bun:test";
import { mkdtemp, readdir, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  loadInput,
  plan,
  runExperiment,
  cloudflareCredentials,
  validateTranslation,
  decodeTranslationResponse,
  responseDiagnostics,
  experimentLimits,
  slug,
  protectedEquation,
} from "./experiment";
import { parseEditorialFile } from "../generate-content";
import { prepare, hash } from "../i18n-simulation/pipeline";
import { batches } from "../i18n-real-pilot/sample";
import { limits } from "../i18n-real-pilot/budget";
import type { Transport } from "../i18n-real-pilot/adapters";
const auth = { account: "a".repeat(32), token: "fixture-only-cloudflare-secret" };
async function temporary(run: (directory: string) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), "sg-cf-experiment-"));
  try {
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
/** Identity text is a structural fixture, NOT a linguistic translation or measured API usage. */
function identity(
  counter: { calls: number },
  mutate?: (segments: { id: string; text: string }[]) => unknown,
): Transport {
  return async (url, init) => {
    counter.calls++;
    expect(new URL(url).origin).toBe("https://api.cloudflare.com");
    expect(url).not.toContain("openai");
    expect(init.redirect).toBe("error");
    const payload = JSON.parse(String(init.body));
    expect(payload.max_tokens).toBe(limits.outputTranslation);
    const segments = JSON.parse(payload.messages[1].content) as { id: string; text: string }[];
    return Response.json({
      success: true,
      result: {
        response: JSON.stringify({ translations: mutate ? mutate(segments) : segments }),
        usage: { prompt_tokens: 100, completion_tokens: 100, neurons: 12 },
      },
    });
  };
}
test("dedicated CF credentials do not require or inspect OpenAI", () => {
  expect(
    cloudflareCredentials({
      I18N_PILOT_CF_API_TOKEN: auth.token,
      I18N_PILOT_CF_ACCOUNT_ID: auth.account,
    }),
  ).toEqual(auth);
  expect(cloudflareCredentials({ I18N_PILOT_OPENAI_API_KEY: "unused" })).toBeNull();
  expect(() =>
    cloudflareCredentials({
      I18N_PILOT_CF_API_TOKEN: "bad\nvalue",
      I18N_PILOT_CF_ACCOUNT_ID: auth.account,
    }),
  ).toThrow("invalid-cloudflare-credential-format");
});
test("offline default plans only the one article, within proposed financial limits", async () => {
  const input = await loadInput(process.cwd());
  const estimate = plan(input);
  expect(estimate.allowed).toBe(true);
  expect(estimate.calls.length).toBe(6);
  expect(estimate.totalUSD).toBeLessThanOrEqual(experimentLimits.usd);
  expect(input.article.frontmatter.slug).toBe(slug);
  expect(input.metadata.map((m) => m.id)).toContain("meta:title");
  expect(input.metadata.map((m) => m.id)).toContain("cover:alt");
  await temporary(async (dir) => {
    let calls = 0;
    const result = await runExperiment(input, dir, {
      execute: false,
      authorized: true,
      auth,
      transport: async () => {
        calls++;
        throw new Error("must not run");
      },
    });
    expect(calls).toBe(0);
    expect(result.state).toBe("PLANNED");
    expect(result.measurementOrigin).toBe("not-executed");
    expect(await readdir(dir)).toEqual(["plan-report.json"]);
  });
});
test("execute requires a separate explicit paid authorization, even with credentials", async () => {
  const input = await loadInput(process.cwd());
  for (const ready of [
    { authorized: false, auth },
    { authorized: true, auth: null },
  ])
    await temporary(async (dir) => {
      let calls = 0;
      const result = await runExperiment(input, dir, {
        execute: true,
        ...ready,
        transport: async () => {
          calls++;
          throw new Error("not authorized");
        },
      });
      expect(calls).toBe(0);
      expect(result.state).toBe("REVIEW_REQUIRED_AUTHORIZATION_OR_CREDENTIALS");
      expect((await readdir(dir)).some((n) => n.endsWith(".mdx") || n === "ledger.json")).toBe(
        false,
      );
    });
});
test("mock end-to-end preserves whole body, metadata, references and attribution without approving anything", async () => {
  const input = await loadInput(process.cwd());
  const sourcePath = join(process.cwd(), `content/articles/${slug}.mdx`);
  const before = hash(await readFile(sourcePath, "utf8"));
  await temporary(async (dir) => {
    const counter = { calls: 0 };
    const result = await runExperiment(input, dir, {
      execute: true,
      authorized: true,
      auth,
      transport: identity(counter),
    });
    expect(result.state).toBe("TRANSLATED_AWAITING_REVIEW");
    expect(counter.calls).toBe(6);
    expect(result.measurementOrigin).toBe("injected-test-transport");
    expect(result.publishable).toBe(false);
    expect(result.independentReviewPerformed).toBe(false);
    for (const row of result.results) {
      expect(row.decision).toBe("REVIEW_REQUIRED");
      const raw = await readFile(join(dir, `NONPUBLISHABLE-${row.locale}.mdx`), "utf8");
      const parsed = parseEditorialFile(raw);
      expect(parsed.frontmatter.status).toBe("draft");
      expect(parsed.frontmatter.isDemo).toBe(true);
      expect(parsed.frontmatter.approvedAt).toBeUndefined();
      expect(raw).toContain('"translationReview": {\n    "status": "pending"');
      expect(raw).toContain("NOT PUBLISHABLE");
      expect(raw).toContain(
        input.source.body.replace(
          /^## Referências[ \t]*$/m,
          row.locale === "en" ? "## References" : "## Referencias",
        ),
      );
      expect(prepare(parsed.body).bibliography).toBe(input.source.bibliography);
      expect(parsed.frontmatter.sources).toEqual(input.article.frontmatter.sources);
      expect(parsed.frontmatter.cover.credit).toBe(input.article.frontmatter.cover.credit);
      expect(parsed.frontmatter.author).toBe(input.article.frontmatter.author);
    }
    const ledger = JSON.parse(await readFile(join(dir, "ledger.json"), "utf8"));
    expect(
      ledger.calls.every(
        (c: { usage: { neurons: number }; status: string }) =>
          c.status === "completed" && c.usage.neurons === 12,
      ),
    ).toBe(true);
    expect(JSON.stringify(result)).not.toContain(auth.token);
    expect(JSON.stringify(ledger)).not.toContain(auth.token);
    const again = await runExperiment(input, dir, {
      execute: true,
      authorized: true,
      auth,
      transport: identity(counter),
    });
    expect(again.state).toBe("BLOCKED_RECONCILE_BEFORE_RETRY");
    expect(counter.calls).toBe(6);
  });
  expect(hash(await readFile(sourcePath, "utf8"))).toBe(before);
});
test("metadata translation is assembled without changing original frontmatter or locked attributes", async () => {
  const input = await loadInput(process.cwd());
  const values = Object.fromEntries(
    [...input.source.segments, ...input.metadata].map((s) => [s.id, s.text]),
  );
  values["meta:title"] = "Experimental title for structural validation";
  values["cover:alt"] =
    "Two elevators raise equal loads to the same height, one in 10 seconds and the other in 30 seconds, showing that the same energy transfer can occur at different power levels";
  const result = validateTranslation(input, values, "en");
  expect(result.mdx).not.toBeNull();
  if (!result.mdx) throw new Error("missing artifact");
  const parsed = parseEditorialFile(result.mdx);
  expect(parsed.frontmatter.title).toBe(values["meta:title"]);
  expect(parsed.frontmatter.cover.alt).toBe(values["cover:alt"]);
  expect(input.article.frontmatter.title).not.toBe(values["meta:title"]);
  expect(prepare(result.body).skeleton).toBe(input.source.skeleton);
});
test("synthetic MDX component fixture keeps Callout/Figure/KeyPoints/equations/links protected", async () => {
  const original = await loadInput(process.cwd());
  const body = `<Callout title="Aviso">Dados em revisão: 12%.</Callout>\n\n<KeyPoints>\n\n- Potência: 2 kW.\n\n</KeyPoints>\n\n<MathExpression>2 + 2 = 4</MathExpression>\n\n<Figure src="/locked.webp" alt="Descrição" caption="Legenda" credit="Locked author" />\n\n[Link](https://example.invalid/source) [1]\n\n## Referências\n\n[1] Locked bibliography.\n`;
  const source = prepare(body);
  const input = {
    ...original,
    source,
    chunks: batches([...source.segments, ...original.metadata]),
  };
  const values = Object.fromEntries(
    [...source.segments, ...input.metadata].map((s) => [s.id, s.text]),
  );
  const result = validateTranslation(input, values, "es");
  expect(result.mdx).not.toBeNull();
  expect(prepare(result.body).skeleton).toBe(source.skeleton);
  values[source.segments.find((s) => s.text.includes("12%"))?.id ?? "missing"] = "Dados: 13%.";
  expect(validateTranslation(input, values, "es").mdx).toBeNull();
});
for (const mutation of [
  "number",
  "metadata-number",
  "duplicate-id",
  "missing-id",
  "invalid-json",
  "truncated",
  "missing-usage",
  "http",
  "transport",
] as const)
  test(`failure ${mutation}: stop, preserve ledger, no artifact and no retry`, async () => {
    const input = await loadInput(process.cwd());
    await temporary(async (dir) => {
      const counter = { calls: 0 };
      let transport: Transport = identity(counter, (segments) => {
        if (mutation === "duplicate-id") return [...segments, segments[0]];
        if (mutation === "missing-id") return segments.slice(1);
        if (mutation === "number")
          return segments.map((s) => ({
            ...s,
            text: s.text.replace(/\d/, (d) => String((Number(d) + 1) % 10)),
          }));
        return segments;
      });
      if (mutation === "metadata-number")
        transport = identity(counter, (segments) =>
          segments.map((s) => (s.id.startsWith("meta:") ? { ...s, text: s.text + " 999" } : s)),
        );
      if (["invalid-json", "truncated", "missing-usage", "http", "transport"].includes(mutation))
        transport = async () => {
          counter.calls++;
          if (mutation === "transport") throw new Error("token=" + auth.token);
          if (mutation === "http") return new Response(auth.token, { status: 401 });
          return Response.json({
            success: true,
            result: {
              response: mutation === "invalid-json" ? "unfinished {" : '{"translations":[]}',
              finish_reason: mutation === "truncated" ? "length" : undefined,
              usage:
                mutation === "missing-usage" ? {} : { prompt_tokens: 100, completion_tokens: 100 },
            },
          });
        };
      const result = await runExperiment(input, dir, {
        execute: true,
        authorized: true,
        auth,
        transport,
      });
      expect(result.state).toBe("BLOCKED_RECONCILE_BEFORE_RETRY");
      expect(result.results.some((r) => r.decision === "BLOCK")).toBe(true);
      expect((await readdir(dir)).filter((n) => n.endsWith(".mdx"))).toEqual([]);
      expect(counter.calls).toBeGreaterThan(0);
      const count = counter.calls;
      const ledger = JSON.parse(await readFile(join(dir, "ledger.json"), "utf8"));
      expect(ledger.calls[0].reservedUSD).toBeGreaterThan(0);
      expect(JSON.stringify(result)).not.toContain(auth.token);
      await runExperiment(input, dir, { execute: true, authorized: true, auth, transport });
      expect(counter.calls).toBe(count);
    });
  });
test("concurrent execution and over-budget plan never call a provider", async () => {
  const input = await loadInput(process.cwd());
  await temporary(async (dir) => {
    await writeFile(join(dir, "campaign.lock"), "fixture");
    let calls = 0;
    const result = await runExperiment(input, dir, {
      execute: true,
      authorized: true,
      auth,
      transport: async () => {
        calls++;
        throw new Error("not allowed");
      },
    });
    expect(result.state).toBe("BLOCK_CONCURRENT_EXECUTION");
    expect(calls).toBe(0);
  });
  await temporary(async (dir) => {
    let calls = 0;
    const larger = { ...input, chunks: [...input.chunks, ...input.chunks] };
    const result = await runExperiment(larger, dir, {
      execute: true,
      authorized: true,
      auth,
      transport: async () => {
        calls++;
        throw new Error("not allowed");
      },
    });
    expect(result.state).toBe("BLOCK_BUDGET");
    expect(calls).toBe(0);
  });
});

test("power equation cannot silently change division into multiplication", async () => {
  const input = await loadInput(process.cwd());
  const values = Object.fromEntries(
    [...input.source.segments, ...input.metadata].map((s) => [s.id, s.text]),
  );
  const equation = input.source.segments.find((s) => s.text.trim() === "P = ΔE / Δt");
  if (!equation) throw new Error("Expected source equation is missing");
  values[equation.id] = equation.text.replace("/", "*");
  const result = validateTranslation(input, values, "en");
  expect(result.mdx).toBeNull();
  expect(result.findings.some((f) => f.code === "symbolic-equation-verbatim")).toBe(true);
});

test("usage survives an incomplete response envelope", async () => {
  const input = await loadInput(process.cwd());
  await temporary(async (directory) => {
    const result = await runExperiment(input, directory, {
      execute: true,
      authorized: true,
      auth,
      transport: async () =>
        Response.json({
          success: true,
          result: { usage: { prompt_tokens: 40, completion_tokens: 70, neurons: 3 } },
        }),
    });
    expect(result.state).toBe("BLOCKED_RECONCILE_BEFORE_RETRY");
    const ledger = JSON.parse(await readFile(join(directory, "ledger.json"), "utf8"));
    expect(ledger.calls[0].usage.outputTokens).toBe(70);
    expect(ledger.calls[0].status).toBe("failed");
  });
});

test("ES failure retains the valid non-public EN artifact and its accounting", async () => {
  const input = await loadInput(process.cwd());
  await temporary(async (directory) => {
    const counter = { calls: 0 };
    const mock = identity(counter);
    const result = await runExperiment(input, directory, {
      execute: true,
      authorized: true,
      auth,
      transport: async (url, init) => {
        if (counter.calls === 3) {
          counter.calls++;
          return new Response("fixture failure", { status: 500 });
        }
        return mock(url, init);
      },
    });
    expect(result.state).toBe("BLOCKED_RECONCILE_BEFORE_RETRY");
    expect(counter.calls).toBe(4);
    expect(result.results[0].decision).toBe("REVIEW_REQUIRED");
    expect(result.results[1].decision).toBe("BLOCK");
    expect((await readdir(directory)).filter((n) => n.endsWith(".mdx"))).toEqual([
      "NONPUBLISHABLE-en.mdx",
    ]);
  });
});

test("documented JSON-mode object reproduces legacy incomplete-response with recorded usage", async () => {
  const input = await loadInput(process.cwd());
  const first = input.chunks[0];
  const structured = { translations: first.map(({ id, text }) => ({ id, text })) };
  const legacyCheck = (response: unknown) => {
    if (typeof response !== "string") throw new Error("incomplete-response");
  };
  expect(() => legacyCheck(structured)).toThrow("incomplete-response");
  expect(() => legacyCheck({ translations: structured.translations.slice(0, 1) })).toThrow(
    "incomplete-response",
  );
  expect(decodeTranslationResponse(structured, first)).toEqual(
    decodeTranslationResponse(JSON.stringify(structured), first),
  );
  await temporary(async (directory) => {
    let calls = 0;
    const result = await runExperiment(input, directory, {
      execute: true,
      authorized: true,
      auth,
      transport: async (url, init) => {
        calls++;
        expect(new URL(url).origin).toBe("https://api.cloudflare.com");
        const payload = JSON.parse(String(init.body));
        expect(payload.max_tokens).toBe(2500);
        const translations = JSON.parse(payload.messages[1].content);
        return Response.json({
          success: true,
          result: {
            response: { translations },
            usage: {
              prompt_tokens: 100,
              completion_tokens: 120,
              neurons: Number("1206274414062"),
            },
          },
        });
      },
    });
    expect(result.state).toBe("TRANSLATED_AWAITING_REVIEW");
    expect(calls).toBe(6);
    const ledger = JSON.parse(await readFile(join(directory, "ledger.json"), "utf8"));
    expect(ledger.calls[0].usageCalculatedUSD).toBeCloseTo(0.00029966, 12);
    expect(ledger.calls[0].responseDiagnostics).toMatchObject({
      responseKind: "object",
      translationCount: first.filter((s) => !protectedEquation(s)).length,
      responseBytes: null,
    });
    expect(result.measurementOrigin).toBe("injected-test-transport");
    expect(result.results.every((r) => r.decision === "REVIEW_REQUIRED")).toBe(true);
  });
});

test("object support preserves strict schema and exact IDs, not a generic coercion", async () => {
  const input = await loadInput(process.cwd());
  const chunk = input.chunks[0];
  const translations = chunk.map(({ id, text }) => ({ id, text }));
  for (const value of [undefined, null])
    expect(() => decodeTranslationResponse(value, chunk)).toThrow("incomplete-response");
  for (const value of [true, 12, translations])
    expect(() => decodeTranslationResponse(value, chunk)).toThrow(
      "translation-response-type-invalid",
    );
  for (const value of [
    { translations: [] },
    { translations, unrequested: "extra" },
    { response: { translations } },
    "unfinished JSON",
  ])
    expect(() => decodeTranslationResponse(value, chunk)).toThrow("translation-json-invalid");
  for (const value of [
    { translations: translations.slice(1) },
    { translations: [...translations, translations[0]] },
    { translations: translations.map((s, i) => (i === 0 ? { ...s, id: "unknown-id" } : s)) },
  ])
    expect(() => decodeTranslationResponse(value, chunk)).toThrow(
      "translation-incomplete-or-ids-invalid",
    );
  expect(
    JSON.stringify(responseDiagnostics({ translations, unrequested: auth.token })),
  ).not.toContain(auth.token);
});

test("structured response still blocks scientific data changes before saving", async () => {
  const input = await loadInput(process.cwd());
  await temporary(async (directory) => {
    let calls = 0;
    const result = await runExperiment(input, directory, {
      execute: true,
      authorized: true,
      auth,
      transport: async (_url, init) => {
        calls++;
        const payload = JSON.parse(String(init.body));
        const original = JSON.parse(payload.messages[1].content) as { id: string; text: string }[];
        const translations = original.map((s) => ({
          ...s,
          text: s.text.replace(/\d/, (d) => String((Number(d) + 1) % 10)),
        }));
        return Response.json({
          success: true,
          result: {
            response: { translations },
            usage: { prompt_tokens: 100, completion_tokens: 120 },
          },
        });
      },
    });
    expect(result.state).toBe("BLOCKED_RECONCILE_BEFORE_RETRY");
    expect(calls).toBe(1);
    expect(result.results[0].reason).toBe("deterministic-divergence");
    expect((await readdir(directory)).filter((n) => n.endsWith(".mdx"))).toEqual([]);
  });
});

test("smaller batches preserve source IDs/MDX but do not repair non-string response handling", async () => {
  const input = await loadInput(process.cwd());
  const chunks: typeof input.chunks = [];
  let current: (typeof input.chunks)[number] = [];
  for (const segment of [...input.source.segments, ...input.metadata]) {
    const bytes = (items: typeof current) =>
      Buffer.byteLength(JSON.stringify(items.map(({ id, text }) => ({ id, text }))));
    if (current.length && bytes([...current, segment]) > 2500) {
      chunks.push(current);
      current = [];
    }
    current.push(segment);
  }
  if (current.length) chunks.push(current);
  expect(chunks.flat().map((s) => s.id)).toEqual(
    [...input.source.segments, ...input.metadata].map((s) => s.id),
  );
  const resized = { ...input, chunks };
  expect(plan(resized).calls.length).toBe(6);
  expect(plan(resized).totalUSD).toBeCloseTo(plan(input).totalUSD, 12);
  await temporary(async (directory) => {
    const counter = { calls: 0 };
    const result = await runExperiment(resized, directory, {
      execute: true,
      authorized: true,
      auth,
      transport: identity(counter),
    });
    expect(result.state).toBe("TRANSLATED_AWAITING_REVIEW");
    expect(counter.calls).toBe(6);
  });
});
