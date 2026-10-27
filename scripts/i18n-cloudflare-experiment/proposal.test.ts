import { test, expect } from "bun:test";
import { mkdtemp, writeFile, readFile, rm, readdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import fixture from "./synthetic-history.fixture";
import { proposedCampaignPlan, history, reconcileCampaign, executeCampaign } from "./campaigns";
import { loadInput, experimentLimits, experimentPayload, protectedEquation } from "./experiment";
async function temporary(run: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), "sg-proposal-test-"));
  try {
    for (const [name, raw] of Object.entries(fixture)) await writeFile(join(root, name), raw);
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
test("proposal is read only, linked to history and never applies proposed ceiling or reconciliation", async () =>
  temporary(async (root) => {
    const input = await loadInput(process.cwd());
    const before = await history(root, input);
    const result = await proposedCampaignPlan(root, input, "campaign-003", 0.1);
    expect(result.limitUSD).toBe(0.05);
    expect(experimentLimits.usd).toBe(0.05);
    expect(result.allowed).toBe(false);
    expect(result.proposal.proposedLimitUSD).toBe(0.1);
    expect(result.proposal.historyDigest).toBe(before.digest);
    expect(result.proposal.requiredReconciliations).toEqual(["legacy"]);
    expect(result.proposal.executionAuthorized).toBe(false);
    expect(result.proposal.budgetChangeApplied).toBe(false);
    expect(result.proposal.projectedUSD).toBeCloseTo(
      before.reservedUSD + result.estimate.totalUSD,
      12,
    );
    expect(result.proposal.remainingUSD).toBeCloseTo(0.1 - result.projectedUSD, 12);
    expect(result.proposal.proposalHash).toMatch(/^[a-f0-9]{64}$/);
    expect(await history(root, input)).toEqual(before);
    expect((await readdir(root)).sort()).toEqual(Object.keys(fixture).sort());
    for (const [name, raw] of Object.entries(fixture))
      expect(await readFile(join(root, name), "utf8")).toBe(raw);
    const protectedIDs = new Set(result.proposal.protectedIDs);
    for (const chunk of input.chunks) {
      const sent = JSON.parse(experimentPayload(chunk, "en").messages[1].content) as {
        id: string;
        text: string;
      }[];
      expect(sent.some((s) => protectedIDs.has(s.id) || protectedEquation(s))).toBe(false);
    }
  }));
test("after a synthetic second failure proposal still requires explicit reconciliation and cannot lift active limit", async () =>
  temporary(async (root) => {
    const input = await loadInput(process.cwd()),
      h = await history(root, input);
    await reconcileCampaign(
      root,
      input,
      "legacy",
      h.digest,
      "Synthetic fixture only: reservation retained, billing unknown.",
    );
    const ready = await history(root, input);
    await executeCampaign(root, input, "campaign-002", ready.digest, {
      execute: true,
      authorized: true,
      auth: { account: "a".repeat(32), token: "synthetic-only" },
      transport: async () => {
        throw Error("synthetic-failure");
      },
    });
    const before = await history(root, input);
    const result = await proposedCampaignPlan(root, input, "campaign-003", 0.1);
    expect(result.history.campaigns[0].needsReconciliation).toBe(false);
    expect(result.proposal.requiredReconciliations).toEqual(["campaign-002"]);
    expect(result.allowed).toBe(false);
    expect(result.proposal.withinProposedBudget).toBe(true);
    expect(result.history.reservedUSD).toBe(before.reservedUSD);
    let calls = 0;
    await expect(
      executeCampaign(root, input, "campaign-003", before.digest, {
        execute: true,
        authorized: true,
        auth: { account: "a".repeat(32), token: "synthetic-only" },
        transport: async () => {
          calls++;
          throw Error("unreachable");
        },
      }),
    ).rejects.toThrow("not-authorized");
    expect(calls).toBe(0);
    expect(await history(root, input)).toEqual(before);
  }));
test("invalid proposals and CLI execute/proposal combination fail before credentials or network", async () =>
  temporary(async (root) => {
    const input = await loadInput(process.cwd());
    await expect(proposedCampaignPlan(root, input, "campaign-003", 1)).rejects.toThrow(
      "unsupported-budget-proposal",
    );
    await expect(proposedCampaignPlan(root, input, "other", 0.1)).rejects.toThrow(
      "unsupported-budget-proposal",
    );
    const cli = join(process.cwd(), "scripts/i18n-cloudflare-experiment/run.ts");
    const child = Bun.spawn(
      [
        process.execPath,
        cli,
        "--campaign",
        "campaign-003",
        "--proposed-limit",
        "0.10",
        "--execute",
      ],
      {
        stdout: "pipe",
        stderr: "pipe",
        env: { PATH: process.env.PATH, I18N_PILOT_CF_ACCOUNT_ID: "invalid" },
      },
    );
    const stderr = await new Response(child.stderr).text();
    expect(await child.exited).not.toBe(0);
    expect(stderr).toContain("proposal-is-offline-only");
    expect(stderr).not.toContain("invalid-cloudflare-credential-format");
  }));
