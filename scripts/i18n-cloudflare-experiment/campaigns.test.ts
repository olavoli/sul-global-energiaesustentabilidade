import { test, expect } from "bun:test";
import { mkdtemp, writeFile, readFile, rm, mkdir, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import fixture from "./synthetic-history.fixture";
import { campaignPlan, reconcileCampaign, executeCampaign, history } from "./campaigns";
import { loadInput } from "./experiment";
const auth = { account: "a".repeat(32), token: "synthetic-test-only" };
async function temporary(run: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), "sg-campaign-test-"));
  try {
    for (const [name, raw] of Object.entries(fixture)) await writeFile(join(root, name), raw);
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
async function reconciled(root: string) {
  const input = await loadInput(process.cwd());
  const before = await history(root, input);
  await reconcileCampaign(
    root,
    input,
    "legacy",
    before.digest,
    "Synthetic reconciliation: billing unknown; reservation retained.",
  );
  return { input, preview: await campaignPlan(root, input, "campaign-002") };
}
const options = (transport: NonNullable<Parameters<typeof executeCampaign>[4]["transport"]>) => ({
  execute: true,
  authorized: true,
  auth,
  transport,
});
test("offline retains original cost and requires explicit hash-bound reconciliation", async () =>
  temporary(async (root) => {
    const input = await loadInput(process.cwd());
    const before = await campaignPlan(root, input, "campaign-002");
    expect(before.allowed).toBe(false);
    expect(before.history.reservedUSD).toBeCloseTo(0.0062185, 12);
    expect(before.history.calculatedUSD).toBeCloseTo(0.00029966, 12);
    expect(before.projectedUSD).toBeCloseTo(0.0062185 + before.estimate.totalUSD, 12);
    expect(before.remainingUSD).toBeCloseTo(0.05 - before.projectedUSD, 12);
    expect((await readdir(root)).sort()).toEqual(Object.keys(fixture).sort());
    await expect(
      reconcileCampaign(root, input, "legacy", "stale", "Synthetic reconciliation reason"),
    ).rejects.toThrow("mismatch");
    const { preview } = await reconciled(root);
    expect(preview.allowed).toBe(true);
    for (const [name, raw] of Object.entries(fixture))
      expect(await readFile(join(root, name), "utf8")).toBe(raw);
  }));
test("invalid or missing historical files fail closed before any transport", async () =>
  temporary(async (root) => {
    const { input, preview } = await reconciled(root);
    await writeFile(join(root, "ledger.json"), "{}");
    let calls = 0;
    await expect(
      executeCampaign(
        root,
        input,
        "campaign-002",
        preview.history.digest,
        options(async () => {
          calls++;
          throw Error("unreachable");
        }),
      ),
    ).rejects.toThrow("legacy-integrity-invalid");
    expect(calls).toBe(0);
  }));
test("failure is sealed, remains charged and cannot be retried or reset", async () =>
  temporary(async (root) => {
    const { input, preview } = await reconciled(root);
    let calls = 0;
    const opt = options(async () => {
      calls++;
      return Response.json({
        success: true,
        result: { usage: { prompt_tokens: 100, completion_tokens: 120, neurons: 12 } },
      });
    });
    const result = await executeCampaign(root, input, "campaign-002", preview.history.digest, opt);
    expect(result.report.state).toBe("BLOCKED_RECONCILE_BEFORE_RETRY");
    expect(calls).toBe(1);
    expect(result.accounting.history.reservedUSD).toBeCloseTo(
      0.0062185 + preview.estimate.totalUSD,
      12,
    );
    expect(result.accounting.allowed).toBe(false);
    const h = await history(root, input);
    await reconcileCampaign(
      root,
      input,
      "campaign-002",
      h.digest,
      "Synthetic reconciliation retains full campaign reservation.",
    );
    const next = await campaignPlan(root, input, "campaign-003");
    expect(next.allowed).toBe(false); // full new campaign would exceed aggregate cap
    await expect(
      executeCampaign(root, input, "campaign-003", next.history.digest, opt),
    ).rejects.toThrow("not-authorized");
    await expect(
      executeCampaign(root, input, "campaign-002", next.history.digest, opt),
    ).rejects.toThrow("not-authorized");
    expect(calls).toBe(1);
    await writeFile(join(root, "campaigns/campaign-002/ledger.json"), "{}");
    await expect(history(root, input)).rejects.toThrow("integrity-invalid");
  }));
test("global execution lock excludes simultaneous campaigns", async () =>
  temporary(async (root) => {
    const { input, preview } = await reconciled(root);
    let release: (() => void) | undefined;
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    let started: (() => void) | undefined;
    const ready = new Promise<void>((resolve) => {
      started = resolve;
    });
    let calls = 0;
    const first = executeCampaign(
      root,
      input,
      "campaign-002",
      preview.history.digest,
      options(async () => {
        calls++;
        started?.();
        await wait;
        throw Error("synthetic-failure");
      }),
    );
    await ready;
    try {
      await expect(
        executeCampaign(
          root,
          input,
          "campaign-003",
          preview.history.digest,
          options(async () => {
            throw Error("unreachable");
          }),
        ),
      ).rejects.toThrow("concurrent");
    } finally {
      release?.();
      await first;
    }
    expect(calls).toBe(1);
  }));
test("missing seal after crash prevents recovery without evidence; authorization mandatory", async () =>
  temporary(async (root) => {
    const { input, preview } = await reconciled(root);
    await expect(
      executeCampaign(root, input, "campaign-002", preview.history.digest, {
        execute: true,
        authorized: false,
        auth,
      }),
    ).rejects.toThrow("authorization");
    await mkdir(join(root, "campaigns/campaign-002"), { recursive: true });
    await expect(campaignPlan(root, input, "campaign-003")).rejects.toThrow();
  }));
test("successful mock campaign keeps EN ES nonpublishable and duplicate execution blocked", async () =>
  temporary(async (root) => {
    const { input, preview } = await reconciled(root);
    let calls = 0;
    const result = await executeCampaign(
      root,
      input,
      "campaign-002",
      preview.history.digest,
      options(async (_url, init) => {
        calls++;
        const payload = JSON.parse(String(init.body));
        return Response.json({
          success: true,
          result: {
            response: { translations: JSON.parse(payload.messages[1].content) },
            usage: { prompt_tokens: 100, completion_tokens: 100 },
          },
        });
      }),
    );
    expect(calls).toBe(6);
    expect(result.report.state).toBe("TRANSLATED_AWAITING_REVIEW");
    for (const row of result.report.results) {
      expect(row.decision).toBe("REVIEW_REQUIRED");
      const raw = await readFile(
        join(root, "campaigns/campaign-002", `NONPUBLISHABLE-${row.locale}.mdx`),
        "utf8",
      );
      expect(raw).toContain('"status": "draft"');
      expect(raw).toContain('"publishable": false');
    }
    expect((await campaignPlan(root, input, "campaign-002")).duplicate).toBe(true);
  }));

test("a missing campaign directory cannot erase its reserved budget", async () =>
  temporary(async (root) => {
    const { input, preview } = await reconciled(root);
    await executeCampaign(
      root,
      input,
      "campaign-002",
      preview.history.digest,
      options(async () => {
        throw Error("synthetic-failure");
      }),
    );
    // This deletes ONLY the synthetic test fixture, never the real experiment directory.
    await rm(join(root, "campaigns/campaign-002"), { recursive: true });
    await expect(campaignPlan(root, input, "campaign-003")).rejects.toThrow(
      "campaign-inventory-invalid",
    );
  }));
test("stale authorization digest cannot launch a new campaign", async () =>
  temporary(async (root) => {
    const { input } = await reconciled(root);
    let calls = 0;
    await expect(
      executeCampaign(
        root,
        input,
        "campaign-002",
        "stale",
        options(async () => {
          calls++;
          throw Error("unreachable");
        }),
      ),
    ).rejects.toThrow("not-authorized");
    expect(calls).toBe(0);
    expect(await readdir(root)).not.toContain("campaigns");
  }));

test("synthetic legacy execution discovery rejects duplicate records", async () =>
  temporary(async (root) => {
    const input = await loadInput(process.cwd());
    await writeFile(join(root, "execution-duplicate-test.json"), "{}");
    await expect(history(root, input)).rejects.toThrow("legacy-integrity-invalid");
  }));
