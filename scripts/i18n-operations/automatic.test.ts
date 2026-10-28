import { test, expect } from "bun:test";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { runAutomaticCycle } from "./automatic-cycle";
import { discover } from "./automatic-discovery";
import { loadBook, append, replay } from "./ledger";
import { financialExposure, continuousBudget, maximumCallReserve } from "./automation-policy";
import { validateAutomaticRecord } from "./automatic-attestation";
import { parseEditorialFile } from "../../src/content/editorial-parser";
import { translationSchema, translationReviewAccepted } from "../../src/content/translation-schema";
import { verifyCloudflare, verifyPrivateRepository } from "./automatic-state";
import { temporary, policy, mock, deps, credentials, slug } from "./automatic-fixtures.test";
test("complete offline discovery translation validation and publication are idempotent", () =>
  temporary(async (dir) => {
    const m = mock(),
      snapshots: string[] = [];
    const d = {
      ...deps(m.transport),
      persist: async (directory: string) => {
        snapshots.push((await loadBook(directory)).events.at(-1)?.kind ?? "");
      },
    };
    const result = await runAutomaticCycle(dir, policy(), d);
    expect(result[0].state).toBe("SIMULATED_PUBLICATION");
    expect(m.count()).toBe(4);
    expect(snapshots.filter((x) => x === "dispatch")).toHaveLength(4);
    for (const locale of ["en", "es"]) {
      const raw = await readFile(join(dir, "content/translations", locale, slug + ".mdx"), "utf8"),
        parsed = parseEditorialFile(raw),
        f = validateAutomaticRecord(parsed.frontmatter, parsed.body);
      expect(f.status).toBe("published");
      expect(f.translationReview.status).toBe("automatic");
      expect(f.translationReview.reviewer).toBeUndefined();
      expect(f.aiDisclosure).toContain(locale === "en" ? "do not certify" : "no certifican");
      expect(translationReviewAccepted(f)).toBe(true);
    }
    expect((await discover(dir))[0].state).toBe("CURRENT");
    const book = await loadBook(join(dir, "i18n/storage"));
    await runAutomaticCycle(dir, policy(), d);
    expect(m.count()).toBe(4);
    expect((await loadBook(join(dir, "i18n/storage"))).runs.size).toBe(book.runs.size);
  }));
test("source change schedules updated editions rather than claiming stale translations current", () =>
  temporary(async (dir) => {
    const m = mock();
    await runAutomaticCycle(dir, policy(), deps(m.transport));
    const source = join(dir, "content/articles", slug + ".mdx");
    await writeFile(source, (await readFile(source, "utf8")) + "\n");
    expect((await discover(dir))[0].state).toBe("PENDING");
    await runAutomaticCycle(dir, policy(), deps(m.transport));
    expect(m.count()).toBe(8);
    expect((await discover(dir))[0].state).toBe("CURRENT");
  }));
test("a failed publication resumes from complete run without another paid call", () =>
  temporary(async (dir) => {
    const m = mock();
    const first = await runAutomaticCycle(dir, policy(), {
      ...deps(m.transport),
      publish: async () => {
        throw Error("SIMULATED DISK FAILURE");
      },
    });
    expect(first[0].state).toBe("QUARANTINED");
    expect(m.count()).toBe(4);
    const next = await runAutomaticCycle(dir, policy(), deps(m.transport));
    expect(next[0].state).toBe("SIMULATED_PUBLICATION");
    expect(m.count()).toBe(4);
  }));
test("bounded known-usage retry reserves a second attempt in contingency", () =>
  temporary(async (dir) => {
    const m = mock((count) =>
      count === 1
        ? Response.json({
            success: true,
            result: { response: "{broken", usage: { prompt_tokens: 100, completion_tokens: 100 } },
          })
        : undefined,
    );
    const result = await runAutomaticCycle(dir, policy(), deps(m.transport));
    expect(result[0].state).toBe("SIMULATED_PUBLICATION");
    expect(m.count()).toBe(5);
    const b = await loadBook(join(dir, "i18n/storage"));
    expect([...b.runs.values()].map((r) => r.pool)).toEqual(["regular", "contingency"]);
    expect([...b.runs.values()].reduce((n, r) => n + r.reserved, 0)).toBe(8 * maximumCallReserve());
  }));
test("historical unknown billing remains unknown and fully reserved under explicit covered policy", () =>
  temporary(async (dir) => {
    const store = join(dir, "i18n/storage");
    let b = await append(store, replay([]), "reserve", "old", {
      article: "historical",
      month: "2026-09",
      pool: "regular",
      reserved: 28_971_312,
    });
    b = await append(store, b, "dispatch", "old", { call: "en:0" });
    b = await append(store, b, "failed", "old", {});
    const prefix = JSON.stringify(b.events),
      anchor = b.digest,
      m = mock();
    const result = await runAutomaticCycle(dir, policy(anchor), deps(m.transport));
    expect(result[0].state).toBe("SIMULATED_PUBLICATION");
    const next = await loadBook(store);
    expect(JSON.stringify(next.events.slice(0, 3))).toBe(prefix);
    expect(next.runs.get("old")?.reserved).toBe(28_971_312);
    expect(next.runs.get("old")?.confirmed).toBeNull();
    expect(next.runs.get("old")?.usage.size).toBe(0);
  }));
test("unknown network dispatch is quarantined across restarts without repeating it", () =>
  temporary(async (dir) => {
    let count = 0;
    const d = deps(async () => {
      count++;
      throw TypeError("SYNTHETIC NETWORK FAILURE");
    });
    await runAutomaticCycle(dir, policy(), d);
    await runAutomaticCycle(dir, policy(), d);
    expect(count).toBe(1);
    const b = await loadBook(join(dir, "i18n/storage"));
    expect([...b.runs.values()][0].confirmed).toBeNull();
  }));
test("durable checkpoint failure stops before transport", () =>
  temporary(async (dir) => {
    const m = mock();
    let checks = 0;
    await expect(
      runAutomaticCycle(dir, policy(), {
        ...deps(m.transport),
        persist: async () => {
          checks++;
          if (checks >= 3) throw Error("state-persistence-failed");
        },
      }),
    ).rejects.toThrow("state-persistence-failed");
    expect(m.count()).toBe(0);
  }));
test("continuous authorization and external activation are independently required", () =>
  temporary(async (dir) => {
    const m = mock();
    await expect(
      runAutomaticCycle(
        dir,
        { ...policy(), validUntil: "2020-01-01T00:00:00Z" },
        deps(m.transport),
      ),
    ).rejects.toThrow("expired");
    await expect(
      runAutomaticCycle(dir, policy(), { ...deps(m.transport), simulation: false }),
    ).rejects.toThrow("external-disabled");
    expect(m.count()).toBe(0);
  }));
test("carried uncertain liabilities and all attempts are counted before monthly or article work", () => {
  const r = {
    id: "r",
    article: slug,
    month: "2026-09",
    pool: "regular" as const,
    reserved: 9_980_000_000,
    calculated: 0,
    confirmed: null,
    calls: new Set(["en:0"]),
    usage: new Set<string>(),
  };
  expect(financialExposure(r)).toBe(r.reserved);
  expect(() =>
    continuousBudget([r], "another", "2026-10", "regular", 50_000_000, policy()),
  ).toThrow("monthly-budget-exceeded");
  expect(() =>
    continuousBudget(
      [{ ...r, month: "2026-10", reserved: 140_000_000 }],
      slug,
      "2026-10",
      "regular",
      20_000_000,
      policy(),
    ),
  ).toThrow("article-budget-exceeded");
});
test("attestation rejects content tampering and never fabricates human approval", () =>
  temporary(async (dir) => {
    const m = mock();
    await runAutomaticCycle(dir, policy(), deps(m.transport));
    const raw = await readFile(join(dir, "content/translations/en", slug + ".mdx"), "utf8"),
      parsed = parseEditorialFile(raw);
    expect(() =>
      validateAutomaticRecord(parsed.frontmatter, parsed.body + "Changed meaning."),
    ).toThrow("attestation-stale");
    const f = translationSchema.parse(parsed.frontmatter);
    expect(f.translationReview.reviewer).toBeUndefined();
    expect(() =>
      translationSchema.parse({ ...f, translationReview: { status: "pending" } }),
    ).toThrow();
  }));
test("credential and private-state checks use read-only mocked transports", async () => {
  await verifyCloudflare(credentials.account, credentials.token, async (url, init) => {
    expect(String(url)).toContain("/user/tokens/verify");
    expect(init?.method).toBeUndefined();
    return Response.json({ success: true, result: { status: "active" } });
  });
  await verifyPrivateRepository("example/private-state", "SIMULATED", async () =>
    Response.json({ private: true }),
  );
  await expect(
    verifyPrivateRepository("example/public", "SIMULATED", async () =>
      Response.json({ private: false }),
    ),
  ).rejects.toThrow("unverified");
});

test("an unresolved article does not starve the next article", () =>
  temporary(async (dir) => {
    const source = await readFile(join(dir, "content/articles", slug + ".mdx"), "utf8");
    await writeFile(
      join(dir, "content/articles/z-fixture.mdx"),
      source.replace(/^slug: o-que-e-potencia$/m, "slug: z-fixture"),
    );
    const m = mock((count) =>
      count === 1
        ? Response.json({
            success: true,
            result: { response: "{broken", usage: { prompt_tokens: 100, completion_tokens: 100 } },
          })
        : undefined,
    );
    const result = await runAutomaticCycle(dir, { ...policy(), maxAttempts: 1 }, deps(m.transport));
    expect(result[0].state).toBe("QUARANTINED");
    expect(result[1].state).toBe("SIMULATED_PUBLICATION");
    expect(m.count()).toBe(5);
  }));
