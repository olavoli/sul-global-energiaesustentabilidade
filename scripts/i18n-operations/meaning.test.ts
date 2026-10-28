import { setup, quota, verdicts } from "./meaning-fixtures.test";
import type { Transport } from "../i18n-real-pilot/adapters";
import { test, expect, setSystemTime } from "bun:test";
import { readFile, writeFile, cp } from "node:fs/promises";
import { join } from "node:path";
import { root, slug, credentials } from "./automatic-fixtures.test";
import { meaningPlan, meaningPayload, decodeMeaning, evidenceFromBatches } from "./meaning";
import { executeMeaning } from "./meaning-execution";
import { loadBook, append, replay } from "./ledger";
test("meaning planning and prompt require all quote pairs without rewriting MDX", () =>
  setup(async (dir) => {
    const p = await meaningPlan(dir, slug, "en");
    expect(p.input.pairs).toHaveLength(85);
    expect(p.batches).toHaveLength(9);
    expect(meaningPayload(p.batches[0].pairs, "en").messages[0].content).toContain(
      "do not translate or rewrite",
    );
    expect(p.reserved).toBeGreaterThan(0);
    expect(await loadBook(join(dir, "i18n/storage"))).toMatchObject({ digest: "GENESIS" });
    const findings = p.batches.map((b) => decodeMeaning(verdicts(b.pairs), b.pairs));
    const e = evidenceFromBatches(p, findings);
    expect(e.humanReview).toBe(false);
    expect(e.findings).toHaveLength(85);
  }));
test("meaning parser rejects duplicate/missing IDs, incomplete JSON and uncertain final evidence", () =>
  setup(async (dir) => {
    const p = await meaningPlan(dir, slug, "en"),
      b = p.batches[0];
    const v = verdicts(b.pairs);
    v.findings[1] = v.findings[0];
    expect(() => decodeMeaning(v, b.pairs)).toThrow("meaning-ids-invalid");
    expect(() => decodeMeaning('{"findings":', b.pairs)).toThrow();
    const findings = p.batches.map((b) => decodeMeaning(verdicts(b.pairs), b.pairs));
    findings[0][0].outcome = "uncertain";
    expect(() => evidenceFromBatches(p, findings)).toThrow("editorial-meaning-review-required");
  }));
test("free meaning execution records reserve/dispatch/usage and resumes without duplicate requests", () =>
  setup(async (dir) => {
    let calls = 0;
    const transport: Transport = async (_url, init) => {
      calls++;
      const body = JSON.parse(String(init?.body));
      const pairs = JSON.parse(body.messages[1].content);
      return Response.json({
        success: true,
        result: {
          response: verdicts(pairs),
          usage: { prompt_tokens: 10, completion_tokens: 10, neurons: 1 },
        },
      });
    };
    const opts = {
      executionMode: "free-only" as const,
      credentials,
      freeQuota: quota,
      transport,
      persist: async () => {},
    };
    const a = await executeMeaning(dir, slug, "en", opts);
    expect(a.state).toBe("PENDING");
    expect(calls).toBe(1);
    const b = await executeMeaning(dir, slug, "en", opts);
    expect(b.state).toBe("PENDING");
    expect(calls).toBe(2);
    const book = await loadBook(join(dir, "i18n/storage"));
    expect(book.runs.size).toBe(2);
    for (const run of book.runs.values()) {
      expect(run.calls.size).toBe(1);
      expect(run.usage.size).toBe(1);
      expect(run.confirmed).toBeNull();
      expect(run.reserved).toBeGreaterThan(run.calculated);
    }
    const checkpoint = join(dir, "i18n/storage/meaning", a.id, "0.json");
    await writeFile(
      checkpoint,
      (await readFile(checkpoint, "utf8")).replace("SYNTHETIC", "TAMPERED"),
    );
    await expect(executeMeaning(dir, slug, "en", opts)).rejects.toThrow(
      "meaning-checkpoint-invalid",
    );
    expect(calls).toBe(2);
  }));
test("a network failure is retained and never retried; no zero billing fabricated", () =>
  setup(async (dir) => {
    let calls = 0;
    const opts = {
      executionMode: "free-only" as const,
      credentials,
      freeQuota: quota,
      transport: async () => {
        calls++;
        throw Error("PRIVATE PROVIDER ERROR suppressed");
      },
      persist: async () => {},
    };
    await expect(executeMeaning(dir, slug, "en", opts)).rejects.toThrow();
    await expect(executeMeaning(dir, slug, "en", opts)).rejects.toThrow(
      "meaning-reconcile-before-retry",
    );
    expect(calls).toBe(1);
    const book = await loadBook(join(dir, "i18n/storage"));
    const run = [...book.runs.values()][0];
    expect(run.confirmed).toBeNull();
    expect(run.reserved).toBeGreaterThan(0);
    expect(book.events.map((e) => e.kind)).toContain("failed");
    expect(book.events.map((e) => e.kind)).not.toContain("usage");
  }));
test("free quota exhaustion stops before HTTP", () =>
  setup(async (dir) => {
    let calls = 0;
    const transport = async () => {
      calls++;
      return Response.json({});
    };
    const blocked = {
      read: async () => ({ ...(await quota.read()), observedNeuronsEstimate: 10000 }),
    };
    await expect(
      executeMeaning(dir, slug, "en", {
        executionMode: "free-only",
        credentials,
        freeQuota: blocked,
        transport,
        persist: async () => {},
      }),
    ).rejects.toThrow("free-quota-exhausted");
    expect(calls).toBe(0);
    expect((await loadBook(join(dir, "i18n/storage"))).digest).toBe("GENESIS");
  }));

test("meaning reservations cannot exceed the accumulated article budget", () =>
  setup(async (dir) => {
    const storage = join(dir, "i18n/storage");
    let book = await append(storage, replay([]), "reserve", "synthetic-existing", {
      article: slug,
      month: new Date().toISOString().slice(0, 7),
      pool: "regular",
      reserved: 150000000,
    });
    book = await append(storage, book, "complete", "synthetic-existing", {
      output: "SYNTHETIC ONLY",
    });
    let calls = 0;
    const transport = async () => {
      calls++;
      return Response.json({ success: false }, { status: 401 });
    };
    await expect(
      executeMeaning(dir, slug, "en", {
        executionMode: "free-only",
        credentials,
        freeQuota: quota,
        transport,
        persist: async () => {},
      }),
    ).rejects.toThrow("article-budget-exceeded");
    expect(calls).toBe(0);
    expect((await loadBook(storage)).digest).toBe(book.digest);
  }));

test("complete mocked EN+ES meaning assessment resumes across quota days and feeds the same publication policy", () =>
  setup(async (dir) => {
    const { editorialPlan } = await import("./editorial-policy-plan");
    await cp(
      join(root, "content/translation-policies"),
      join(dir, "content/translation-policies"),
      { recursive: true },
    );
    let calls = 0;
    const transport: Transport = async (_url, init) => {
      calls++;
      const body = JSON.parse(String(init?.body));
      const pairs = JSON.parse(body.messages[1].content) as {
        id: string;
        sourceQuote: string;
        targetQuote: string;
      }[];
      const result = {
        findings: pairs.map((p) => ({
          id: p.id,
          outcome: "equivalent",
          rationale: "SYNTHETIC OFFLINE verdict; no real model or human review occurred.",
          resolvedSignals:
            p.targetQuote.startsWith("We can summarize") ||
            p.targetQuote.startsWith("Why is no machine")
              ? ["negation-modality-mineral-caveat"]
              : [],
        })),
      };
      return Response.json({
        success: true,
        result: {
          response: result,
          usage: { prompt_tokens: 10, completion_tokens: 10, neurons: 1 },
        },
      });
    };
    try {
      setSystemTime(new Date("2026-10-28T10:00:00Z"));
      for (const locale of ["en", "es"] as const) {
        let state = "PENDING";
        for (let i = 0; i < 10 && state === "PENDING"; i++) {
          const result = await executeMeaning(dir, slug, locale, {
            executionMode: "free-only",
            credentials,
            freeQuota: quota,
            transport,
            persist: async () => {},
          });
          state = result.state;
          if (calls % 5 === 0) setSystemTime(new Date(Date.now() + 86400000));
        }
        expect(state).toBe("EVIDENCE_READY");
      }
      expect(calls).toBe(18);
      const plan = await editorialPlan(dir, [slug]);
      expect(plan.results[0].state).toBe("READY");
      expect(plan.results[0].editions).toHaveLength(2);
      const previous = calls;
      expect(
        (
          await executeMeaning(dir, slug, "en", {
            executionMode: "free-only",
            credentials,
            freeQuota: quota,
            transport,
            persist: async () => {},
          })
        ).state,
      ).toBe("EVIDENCE_READY");
      expect(calls).toBe(previous);
    } finally {
      setSystemTime();
    }
  }));
test("provider authentication rejection is recorded and cannot be retried automatically", () =>
  setup(async (dir) => {
    let calls = 0;
    const opts = {
      executionMode: "free-only" as const,
      credentials,
      freeQuota: quota,
      transport: async () => {
        calls++;
        return Response.json({ success: false }, { status: 403 });
      },
      persist: async () => {},
    };
    await expect(executeMeaning(dir, slug, "en", opts)).rejects.toThrow();
    const book = await loadBook(join(dir, "i18n/storage"));
    expect(book.events.at(-1)?.data.code).toBe("provider-auth-rejected");
    await expect(executeMeaning(dir, slug, "en", opts)).rejects.toThrow(
      "meaning-reconcile-before-retry",
    );
    expect(calls).toBe(1);
  }));

test("concurrent meaning executions cannot duplicate a dispatch", () =>
  setup(async (dir) => {
    let calls = 0;
    const opts = {
      executionMode: "free-only" as const,
      credentials,
      freeQuota: quota,
      persist: async () => {},
      transport: async (_url: string | URL | Request, init?: RequestInit) => {
        calls++;
        const body = JSON.parse(String(init?.body));
        return Response.json({
          success: true,
          result: {
            response: verdicts(JSON.parse(body.messages[1].content)),
            usage: { prompt_tokens: 10, completion_tokens: 10, neurons: 1 },
          },
        });
      },
    };
    const results = await Promise.allSettled([
      executeMeaning(dir, slug, "en", opts),
      executeMeaning(dir, slug, "en", opts),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(calls).toBe(1);
  }));
