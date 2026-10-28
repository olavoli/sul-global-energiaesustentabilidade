import { test, expect } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { temporary, mock, credentials, slug } from "./automatic-fixtures.test";
import { plan, execute, authorize } from "./run";
import { loadBook, append } from "./ledger";
import { fingerprint } from "./policy";
import { freeMargin, freePolicy, executionMode, type FreeSnapshot } from "./free-policy";
const snapshot = (): FreeSnapshot => ({
  accountHash: fingerprint(credentials.account),
  day: new Date().toISOString().slice(0, 10),
  asOf: new Date().toISOString(),
  plan: "workers-free",
  planEvidence: "SYNTHETIC VERIFIED FREE PLAN",
  allConsumersCovered: true,
  authoritativeUpperBound: true,
  usageUpperNeurons: 0,
  unobservedUpperNeurons: 0,
});
test("explicit free mode is distinct; paid authorization remains exact", () =>
  temporary(async (dir) => {
    const p = await plan(dir, slug);
    expect(executionMode(undefined)).toBe("paid");
    expect(executionMode("free-only")).toBe("free-only");
    expect(() => executionMode("FREE")).toThrow("execution-mode-invalid");
    expect(() => authorize(p, undefined, undefined, undefined)).toThrow("financial-authorization");
    expect(() => authorize(p, p.planHash, "1", undefined)).not.toThrow();
    expect(() => authorize(p, p.planHash, undefined, undefined, "free-only")).toThrow(
      "free-paid-mode-conflict",
    );
    expect(() => authorize(p, undefined, undefined, undefined, "free-only")).not.toThrow();
    expect(() => authorize(p, undefined, "1", undefined, "free-only")).toThrow(
      "free-paid-mode-conflict",
    );
    expect(() =>
      authorize(
        { ...p, allowed: false, blocked: "blocked" },
        undefined,
        undefined,
        undefined,
        "free-only",
      ),
    ).toThrow("blocked");
  }));
test("simulated free EN ES uses existing financial reservations and creates only pending drafts", () =>
  temporary(async (dir) => {
    const m = mock(),
      result = await execute(dir, slug, {
        credentials,
        executionMode: "free-only",
        freeQuota: { read: async () => snapshot() },
        transport: m.transport,
      });
    expect(m.count()).toBeGreaterThan(0);
    expect(result.publishable).toBe(false);
    const b = await loadBook(join(dir, "i18n/storage"));
    expect(b.events.filter((e) => e.kind === "free-quota-reserve")).toHaveLength(m.count());
    expect(b.runs.get(result.run)?.executionMode).toBe("free-only");
    expect(b.runs.get(result.run)?.confirmed).toBeNull();
    expect(b.runs.get(result.run)?.reserved).toBeGreaterThan(0);
    for (const locale of ["en", "es"]) {
      const raw = await readFile(join(result.destination, locale + ".mdx"), "utf8");
      expect(raw).toContain('"status": "draft"');
      expect(raw).toContain('"status": "pending"');
    }
  }));
for (const [name, patch, code] of [
  ["missing shared coverage", { allConsumersCovered: false }, "free-quota-unverifiable"],
  ["unknown in-flight usage", { unobservedUpperNeurons: null }, "free-quota-unverifiable"],
  ["adaptive samples", { authoritativeUpperBound: false }, "free-quota-unverifiable"],
  ["paid account", { plan: "workers-paid" }, "free-quota-unverifiable"],
  ["insufficient daily budget", { usageUpperNeurons: 9999 }, "free-quota-exhausted"],
  ["stale usage", { asOf: "2001-01-01T00:00:00Z" }, "free-quota-stale"],
  ["wrong account", { accountHash: "b".repeat(64) }, "free-account-mismatch"],
] as const)
  test(`free preflight blocks ${name} without dispatch or financial writes`, () =>
    temporary(async (dir) => {
      let calls = 0;
      await expect(
        execute(dir, slug, {
          credentials,
          executionMode: "free-only",
          freeQuota: { read: async () => ({ ...snapshot(), ...patch }) },
          transport: async () => {
            calls++;
            throw Error("unreachable");
          },
        }),
      ).rejects.toThrow(code);
      expect(calls).toBe(0);
      expect((await loadBook(join(dir, "i18n/storage"))).events).toHaveLength(0);
    }));
test("shared observed and unobserved usage both reduce safe daily margin", () => {
  expect(() =>
    freeMargin(
      [],
      { ...snapshot(), usageUpperNeurons: 5000, unobservedUpperNeurons: 3000 },
      1,
      fingerprint(credentials.account),
    ),
  ).toThrow("free-quota-exhausted");
  expect(() =>
    freeMargin(
      [],
      { ...snapshot(), usageUpperNeurons: 1000, unobservedUpperNeurons: 1000 },
      1,
      fingerprint(credentials.account),
    ),
  ).not.toThrow();
});
test("failure after a free dispatch retains reservations and prevents automatic retry", () =>
  temporary(async (dir) => {
    let count = 0;
    const opts = {
      credentials,
      executionMode: "free-only" as const,
      freeQuota: { read: async () => snapshot() },
      transport: async () => {
        count++;
        throw Error("synthetic-network-failure");
      },
    };
    await expect(execute(dir, slug, opts)).rejects.toThrow();
    const b = await loadBook(join(dir, "i18n/storage"));
    expect(count).toBe(1);
    expect(b.events.filter((e) => e.kind === "free-quota-reserve")).toHaveLength(1);
    expect([...b.runs.values()][0].reserved).toBeGreaterThan(0);
    expect([...b.runs.values()][0].confirmed).toBeNull();
    await expect(execute(dir, slug, opts)).rejects.toThrow("reconcile-before-retry");
    expect(count).toBe(1);
  }));
test("accounting becomes uncertain between calls: no second inference", () =>
  temporary(async (dir) => {
    let reads = 0;
    const m = mock();
    await expect(
      execute(dir, slug, {
        credentials,
        executionMode: "free-only",
        transport: m.transport,
        freeQuota: {
          read: async () =>
            ++reads <= 2 ? snapshot() : { ...snapshot(), unobservedUpperNeurons: null },
        },
      }),
    ).rejects.toThrow("free-quota-unverifiable");
    expect(m.count()).toBe(1);
  }));
test("free execution lock excludes concurrent execution", () =>
  temporary(async (dir) => {
    let entered: () => void = () => {},
      release: () => void = () => {};
    const ready = new Promise<void>((r) => (entered = r)),
      wait = new Promise<void>((r) => (release = r));
    const first = execute(dir, slug, {
      credentials,
      executionMode: "free-only",
      freeQuota: {
        read: async () => {
          entered();
          await wait;
          return { ...snapshot(), allConsumersCovered: false };
        },
      },
    });
    await ready;
    await expect(
      execute(dir, slug, {
        credentials,
        executionMode: "free-only",
        freeQuota: { read: async () => snapshot() },
      }),
    ).rejects.toThrow();
    release();
    await expect(first).rejects.toThrow("free-quota-unverifiable");
  }));
test("daily reservations survive failure/reconciliation and cannot be duplicated", () =>
  temporary(async (dir) => {
    // Build a free reservation with the same replay/append paths used by production.
    const p = await plan(dir, slug);
    let b = await loadBook(join(dir, "i18n/storage"));
    b = await append(join(dir, "i18n/storage"), b, "reserve", p.planHash, {
      article: slug,
      month: p.month,
      pool: p.pool,
      reserved: p.reserved,
      executionMode: "free-only",
    });
    const s = snapshot(),
      data = {
        call: "en:0",
        day: s.day,
        accountHash: s.accountHash,
        neurons: freePolicy.callNeurons,
        version: freePolicy.version,
        snapshot: s,
      };
    b = await append(join(dir, "i18n/storage"), b, "free-quota-reserve", p.planHash, data);
    await expect(
      append(join(dir, "i18n/storage"), b, "free-quota-reserve", p.planHash, data),
    ).rejects.toThrow("free-reservation-invalid");
    expect(() =>
      freeMargin(b.events, { ...snapshot(), usageUpperNeurons: 7000 }, 1, s.accountHash),
    ).toThrow("free-quota-exhausted");
  }));
test("exhaustion discovered between calls prevents further dispatch", () =>
  temporary(async (dir) => {
    let reads = 0;
    const m = mock();
    await expect(
      execute(dir, slug, {
        credentials,
        executionMode: "free-only",
        transport: m.transport,
        freeQuota: {
          read: async () => ({ ...snapshot(), usageUpperNeurons: ++reads <= 2 ? 0 : 8000 }),
        },
      }),
    ).rejects.toThrow("free-quota-exhausted");
    expect(m.count()).toBe(1);
  }));
