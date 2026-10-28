import { test, expect } from "bun:test";
import { mkdtemp, mkdir, cp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { planBatch, saveBatchPlan, executeBatch, batchStatus, cancelUnusedBatch } from "./batch";
import { append, replay, loadBook, held, checkBatchBudget, locked } from "./ledger";
import { batchRunId } from "./batch-schema";
import fixture from "../i18n-cloudflare-experiment/complete-translations.fixture.json";
import type { Transport } from "../i18n-real-pilot/adapters";
const root = process.cwd(),
  slugs = ["o-que-e-potencia", "o-que-e-potencia-fixture"];
const credentials = { account: "a".repeat(32), token: "MOCK-NOT-A-REAL-CREDENTIAL" };
async function temporary(fn: (dir: string) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), "sg-batch-"));
  try {
    for (const path of [
      "scripts/i18n-operations",
      "scripts/i18n-simulation/pipeline.ts",
      "scripts/i18n-real-pilot/adapters.ts",
      "scripts/i18n-real-pilot/budget.ts",
      "scripts/i18n-real-pilot/sample.ts",
      "scripts/i18n-cloudflare-experiment/experiment.ts",
      "scripts/generate-content.ts",
      "src/content/schema.ts",
      "src/content/editorial-parser.ts",
      "src/content/translation-schema.ts",
      "src/content/remark-editorial-slots.ts",
      "bun.lock",
      "package.json",
      "content/articles/o-que-e-potencia.mdx",
    ]) {
      await mkdir(join(dir, path, ".."), { recursive: true });
      await cp(join(root, path), join(dir, path), { recursive: true });
    }
    const raw = await readFile(join(dir, "content/articles/o-que-e-potencia.mdx"), "utf8");
    await writeFile(
      join(dir, "content/articles/o-que-e-potencia-fixture.mdx"),
      raw.replace(/^slug: o-que-e-potencia$/m, "slug: o-que-e-potencia-fixture"),
    );
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
function simulated() {
  let calls = 0;
  const transport: Transport = async (_url, init) => {
    calls++;
    const payload = JSON.parse(String(init.body));
    const locale = payload.messages[0].content.includes("Target language: English") ? "en" : "es";
    const leaves = JSON.parse(payload.messages[1].content) as { id: string }[];
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
  };
  return { transport, count: () => calls };
}
const options = (id: string, transport: Transport) => ({
  authorization: id,
  paid: "1",
  operator: "SYNTHETIC TEST OPERATOR",
  credentials,
  transport,
});
test("batch planning is deterministic, whole EN ES and read-only for finance", () =>
  temporary(async (dir) => {
    const a = await planBatch(dir, slugs),
      b = await planBatch(dir, slugs);
    expect(a.id).toBe(b.id);
    expect(a.allowed).toBe(true);
    expect(a.summary.calls).toBe(8);
    expect(a.plan.reserved).toBe(a.plan.articles.reduce((n, x) => n + x.reserved, 0));
    await saveBatchPlan(dir, a);
    await saveBatchPlan(dir, b);
    expect((await loadBook(join(dir, "i18n/storage"))).events).toEqual([]);
    await expect(planBatch(dir, [slugs[0], slugs[0]])).rejects.toThrow("duplicate");
  }));
test("invalid or absent financial authorization makes zero calls", () =>
  temporary(async (dir) => {
    const p = await planBatch(dir, slugs);
    await saveBatchPlan(dir, p);
    const mock = simulated();
    await expect(
      executeBatch(dir, p.id, { ...options(p.id, mock.transport), authorization: "wrong" }),
    ).rejects.toThrow("authorization");
    await expect(
      executeBatch(dir, p.id, { ...options(p.id, mock.transport), paid: undefined }),
    ).rejects.toThrow("authorization");
    expect(mock.count()).toBe(0);
    expect((await loadBook(join(dir, "i18n/storage"))).events).toHaveLength(0);
  }));
test("two articles share atomic reservation with no double counting and independent drafts", () =>
  temporary(async (dir) => {
    const p = await planBatch(dir, slugs);
    await saveBatchPlan(dir, p);
    const mock = simulated();
    const state = await executeBatch(dir, p.id, options(p.id, mock.transport));
    expect(state.state).toBe("REVIEW_REQUIRED");
    expect(mock.count()).toBe(8);
    const book = await loadBook(join(dir, "i18n/storage"));
    expect(book.events[0].kind).toBe("batch-reserve");
    expect(book.events.filter((e) => e.kind === "reserve")).toHaveLength(0);
    expect([...book.runs.values()].reduce((n, r) => n + held(r), 0)).toBe(p.plan.reserved);
    for (const a of state.articles) {
      expect(a.state).toBe("REVIEW_REQUIRED");
      for (const locale of ["en", "es"]) {
        const raw = await readFile(join(a.output!, locale + ".mdx"), "utf8");
        expect(raw).toContain('"status": "draft"');
        expect(raw).toContain('"status": "pending"');
        expect(raw).toContain("Cloudflare Workers AI");
      }
      expect(JSON.parse(await readFile(join(a.output!, "review.json"), "utf8")).publishable).toBe(
        false,
      );
    }
    await expect(executeBatch(dir, p.id, options(p.id, mock.transport))).rejects.toThrow(
      "already-started",
    );
    await executeBatch(dir, p.id, { ...options(p.id, mock.transport), resume: true });
    expect(mock.count()).toBe(8);
  }));
test("supervised pause resumes pending articles without redispatching completed work", () =>
  temporary(async (dir) => {
    const p = await planBatch(dir, slugs);
    await saveBatchPlan(dir, p);
    const mock = simulated();
    const paused = await executeBatch(dir, p.id, {
      ...options(p.id, mock.transport),
      maxArticles: 1,
    });
    expect(paused.state).toBe("PAUSED");
    expect(paused.articles.map((a) => a.state)).toEqual(["REVIEW_REQUIRED", "PENDING"]);
    expect(mock.count()).toBe(4);
    const done = await executeBatch(dir, p.id, { ...options(p.id, mock.transport), resume: true });
    expect(done.state).toBe("REVIEW_REQUIRED");
    expect(mock.count()).toBe(8);
  }));
for (const status of [401, 403])
  test(`authentication ${status} stops the batch, retains all reserves and forbids retry`, () =>
    temporary(async (dir) => {
      const p = await planBatch(dir, slugs);
      await saveBatchPlan(dir, p);
      let calls = 0;
      const opts = options(p.id, async () => {
        calls++;
        return new Response("SECRET", { status });
      });
      await expect(executeBatch(dir, p.id, opts)).rejects.toMatchObject({
        diagnostic: { code: "provider-auth-rejected" },
      });
      expect(calls).toBe(1);
      const state = await batchStatus(dir, p.id);
      expect(state.articles.map((a) => a.state)).toEqual(["BLOCKED", "PENDING"]);
      expect(state.executionBlock).toBe("batch-unknown-billing");
      await expect(executeBatch(dir, p.id, { ...opts, resume: true })).rejects.toThrow(
        "unknown-billing",
      );
      expect(calls).toBe(1);
      const b = await loadBook(join(dir, "i18n/storage"));
      expect([...b.runs.values()].reduce((n, r) => n + held(r), 0)).toBe(p.plan.reserved);
      await cancelUnusedBatch(dir, p.id, b.digest, "test", "cancel unused pending work");
      const after = await loadBook(join(dir, "i18n/storage"));
      expect([...after.runs.values()].reduce((n, r) => n + held(r), 0)).toBe(p.plan.reserved);
      expect([...after.runs.values()][0].confirmed).toBeNull();
    }));
test("network interruption never records fabricated zero usage", () =>
  temporary(async (dir) => {
    const p = await planBatch(dir, slugs);
    await saveBatchPlan(dir, p);
    let calls = 0;
    await expect(
      executeBatch(
        dir,
        p.id,
        options(p.id, async () => {
          calls++;
          throw new TypeError("NETWORK SECRET");
        }),
      ),
    ).rejects.toThrow("network");
    const b = await loadBook(join(dir, "i18n/storage"));
    expect(calls).toBe(1);
    expect(b.events.some((e) => e.kind === "usage")).toBe(false);
    expect([...b.runs.values()][0].confirmed).toBeNull();
  }));
test("historical reconciled dispatch with unknown billing blocks new batch before network", () =>
  temporary(async (dir) => {
    const store = join(dir, "i18n/storage");
    let b = await append(store, replay([]), "reserve", "legacy", {
      article: "other",
      month: new Date().toISOString().slice(0, 7),
      pool: "regular",
      reserved: 1,
    });
    b = await append(store, b, "dispatch", "legacy", { call: "en:0" });
    b = await append(store, b, "failed", "legacy", {});
    b = await append(store, b, "reconcile", "legacy", {
      operator: "test",
      reason: "unknown invoice",
      confirmed: null,
    });
    const snapshot = await readFile(join(store, "ledger.json"), "utf8");
    const p = await planBatch(dir, slugs);
    expect(p.blocked).toBe("batch-unknown-billing");
    await saveBatchPlan(dir, p);
    const mock = simulated();
    await expect(executeBatch(dir, p.id, options(p.id, mock.transport))).rejects.toThrow(
      "unknown-billing",
    );
    expect(mock.count()).toBe(0);
    expect(await readFile(join(store, "ledger.json"), "utf8")).toBe(snapshot);
  }));
test("aggregate regular and monthly ceilings include all planned articles", () =>
  temporary(async (dir) => {
    const p = await planBatch(dir, slugs),
      book = replay([]);
    const base = {
      month: p.plan.month,
      pool: "regular" as "regular" | "contingency",
      reserved: 100_000_000,
      calculated: 0,
      confirmed: null,
      state: "complete",
      reconciled: false,
      calls: new Set<string>(),
      usage: new Set<string>(),
    };
    for (let i = 0; i < 79; i++)
      book.runs.set(String(i), { ...base, id: String(i), article: "other-" + i });
    book.runs.set("tail", { ...base, id: "tail", article: "tail", reserved: 60_000_000 });
    expect(() =>
      checkBatchBudget(book, {
        ...p.plan,
        articles: [p.plan.articles[0]],
        reserved: p.plan.articles[0].reserved,
      }),
    ).not.toThrow();
    expect(() => checkBatchBudget(book, p.plan)).toThrow("pool-budget");
    book.runs.set("contingency", {
      ...base,
      id: "contingency",
      article: "c",
      pool: "contingency",
      reserved: 2_000_000_000,
    });
    expect(() => checkBatchBudget(book, p.plan)).toThrow("monthly-budget");
  }));
test("article ceiling includes previous reservations", () =>
  temporary(async (dir) => {
    const store = join(dir, "i18n/storage");
    const b = await append(store, replay([]), "reserve", "prior", {
      article: slugs[0],
      month: new Date().toISOString().slice(0, 7),
      pool: "regular",
      reserved: 140_000_000,
    });
    await append(store, b, "complete", "prior", {});
    expect((await planBatch(dir, slugs)).blocked).toBe("article-budget-exceeded");
  }));
test("contingency requires separate scope reason as well as batch authorization", () =>
  temporary(async (dir) => {
    const p = await planBatch(dir, slugs, "contingency");
    await saveBatchPlan(dir, p);
    const mock = simulated();
    await expect(executeBatch(dir, p.id, options(p.id, mock.transport))).rejects.toThrow(
      "contingency",
    );
    expect(mock.count()).toBe(0);
  }));
test("plan/source integrity changes invalidate execution, lock excludes concurrent runner", () =>
  temporary(async (dir) => {
    const p = await planBatch(dir, slugs);
    await saveBatchPlan(dir, p);
    const mock = simulated();
    await locked(join(dir, "i18n/storage"), async () => {
      await expect(executeBatch(dir, p.id, options(p.id, mock.transport))).rejects.toThrow();
    });
    const file = join(dir, "i18n/storage/batches/plans", p.id + ".json");
    const text = await readFile(file, "utf8");
    const tampered = JSON.parse(text);
    tampered.reserved++;
    await writeFile(file, JSON.stringify(tampered));
    await expect(executeBatch(dir, p.id, options(p.id, mock.transport))).rejects.toThrow(
      "integrity",
    );
    await writeFile(file, text);
    await writeFile(
      join(dir, "content/articles", slugs[0] + ".mdx"),
      (await readFile(join(dir, "content/articles", slugs[0] + ".mdx"), "utf8")) + "\n",
    );
    await expect(executeBatch(dir, p.id, options(p.id, mock.transport))).rejects.toThrow(
      "source-stale",
    );
    expect(mock.count()).toBe(0);
  }));
test("new unexpected ledger records stop resume", () =>
  temporary(async (dir) => {
    const p = await planBatch(dir, slugs);
    await saveBatchPlan(dir, p);
    const mock = simulated();
    await executeBatch(dir, p.id, { ...options(p.id, mock.transport), maxArticles: 1 });
    const store = join(dir, "i18n/storage"),
      b = await loadBook(store),
      first = batchRunId(p.id, slugs[0]);
    await append(store, b, "reconcile", first, {
      operator: "test",
      reason: "administrative event",
      confirmed: null,
    });
    // A foreign reservation cannot enter while pending funds exist; a foreign invalid checkpoint must fail closed.
    await writeFile(join(store, "head"), "CORRUPT");
    await expect(
      executeBatch(dir, p.id, { ...options(p.id, mock.transport), resume: true }),
    ).rejects.toThrow("head-mismatch");
    expect(mock.count()).toBe(4);
  }));

test("crash before first dispatch can resume using existing allocations without a second reservation", () =>
  temporary(async (dir) => {
    const p = await planBatch(dir, slugs);
    await saveBatchPlan(dir, p);
    const store = join(dir, "i18n/storage");
    let book = await append(store, replay([]), "batch-reserve", p.id, {
      plan: p.plan,
      operator: "test",
      contingency: null,
    });
    await append(store, book, "batch-start", batchRunId(p.id, slugs[0]), {});
    const mock = simulated();
    await executeBatch(dir, p.id, { ...options(p.id, mock.transport), resume: true });
    expect(mock.count()).toBe(8);
    book = await loadBook(store);
    expect(book.events.filter((e) => e.kind === "batch-reserve")).toHaveLength(1);
    for (const locale of ["en", "es"]) {
      const raw = JSON.parse(
        await readFile(
          join(store, "review", batchRunId(p.id, slugs[0]), locale + ".review.json"),
          "utf8",
        ),
      );
      expect(raw.locale).toBe(locale);
      expect(raw.humanReview).toBe("pending");
      expect(raw.publishable).toBe(false);
    }
  }));
test("foreign valid ledger event after pause stops resumed batch", () =>
  temporary(async (dir) => {
    const store = join(dir, "i18n/storage");
    let b = await append(store, replay([]), "reserve", "foreign", {
      article: "other",
      month: new Date().toISOString().slice(0, 7),
      pool: "regular",
      reserved: 1,
    });
    await append(store, b, "complete", "foreign", {});
    const p = await planBatch(dir, slugs);
    await saveBatchPlan(dir, p);
    const mock = simulated();
    await executeBatch(dir, p.id, { ...options(p.id, mock.transport), maxArticles: 1 });
    b = await loadBook(store);
    await append(store, b, "reconcile", "foreign", {
      operator: "test",
      reason: "foreign administrative record",
      confirmed: null,
    });
    await expect(
      executeBatch(dir, p.id, { ...options(p.id, mock.transport), resume: true }),
    ).rejects.toThrow("history-changed");
    expect(mock.count()).toBe(4);
  }));

test("the three requested public articles can be planned separately and together", async () => {
  const slugs = [
    "o-que-e-energia",
    "baterias-de-sodio-estao-chegando",
    "agrivoltaica-e-possivel-colher-alimentos-e-eletricidade-na-mesma-terra",
  ];
  for (const slug of slugs) {
    const p = await planBatch(root, [slug]);
    expect(p.plan.articles[0].article).toBe(slug);
    expect(p.summary.calls).toBeGreaterThan(0);
    expect(p.plan.articles[0].sourceRevision).toMatch(/^[a-f0-9]{64}$/);
  }
  const p = await planBatch(root, slugs);
  expect(p.plan.articles.map((a) => a.article)).toEqual(slugs);
  expect(p.summary.calls).toBe(p.plan.articles.reduce((n, a) => n + a.calls.length, 0));
  expect(p.allowed).toBe(p.blocked === null);
});
test("known incompatible source gets an article-specific safe diagnostic without finance changes", () =>
  temporary(async (dir) => {
    const file = join(dir, "content/articles", slugs[0] + ".mdx");
    await writeFile(
      file,
      (await readFile(file, "utf8")).replace("## Referências", "## Other bibliography title"),
    );
    await expect(planBatch(dir, [slugs[0]])).rejects.toMatchObject({
      diagnostic: {
        code: "source-bibliography-heading-missing",
        stage: "source",
        article: slugs[0],
      },
    });
    await expect(readFile(join(dir, "i18n/storage/ledger.json"))).rejects.toThrow();
    await expect(planBatch(dir, ["nonexistent-article"])).rejects.toMatchObject({
      diagnostic: { code: "source-not-found", article: "nonexistent-article" },
    });
  }));
