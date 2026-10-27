import { test, expect } from "bun:test";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import fixture from "./synthetic-history.fixture";
import { loadInput, experimentLimits } from "./experiment";
import {
  history,
  reconcileCampaign,
  proposedCampaignPlan,
  approveBudget,
  verifyBudgetApproval,
  campaignPlan,
  executeCampaign,
} from "./campaigns";
async function ready(
  run: (root: string, input: Awaited<ReturnType<typeof loadInput>>) => Promise<void>,
) {
  const root = await mkdtemp(join(tmpdir(), "sg-approval-test-"));
  try {
    for (const [name, raw] of Object.entries(fixture)) await writeFile(join(root, name), raw);
    const input = await loadInput(process.cwd()),
      h = await history(root, input);
    await reconcileCampaign(
      root,
      input,
      "legacy",
      h.digest,
      "Synthetic test reconciliation, reservation retained, billing unknown.",
    );
    await run(root, input);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
async function request(root: string, input: Awaited<ReturnType<typeof loadInput>>) {
  const p = await proposedCampaignPlan(root, input, "campaign-003", 0.1);
  return {
    campaign: "campaign-003",
    historyDigest: p.history.digest,
    proposalHash: p.proposal.proposalHash,
    limitUSD: 0.1,
    approvedBy: "Synthetic test reviewer",
    reason: "Synthetic test approval only; no real calls authorized.",
  };
}
test("formal approval creates exclusive record, preserves reserves and requires separate paid authorization", async () =>
  ready(async (root, input) => {
    const before = await history(root, input),
      r = await request(root, input);
    expect(await verifyBudgetApproval(root, input, "campaign-003")).toBeNull();
    expect((await campaignPlan(root, input, "campaign-003")).limitUSD).toBe(0.05);
    const approval = await approveBudget(root, input, r);
    expect(approval.paidExecutionAuthorized).toBe(false);
    expect((await verifyBudgetApproval(root, input, "campaign-003"))?.proposalHash).toBe(
      r.proposalHash,
    );
    expect((await campaignPlan(root, input, "campaign-003")).limitUSD).toBe(0.1);
    expect(experimentLimits.usd).toBe(0.05);
    expect((await campaignPlan(root, input, "campaign-004")).limitUSD).toBe(0.05);
    expect(await history(root, input)).toEqual(before);
    await expect(
      executeCampaign(root, input, "campaign-003", before.digest, {
        execute: true,
        authorized: false,
        auth: null,
      }),
    ).rejects.toThrow("authorization");
    const raw = await readFile(join(root, "budget-approvals/campaign-003.json"), "utf8");
    await expect(approveBudget(root, input, r)).rejects.toThrow();
    expect(await readFile(join(root, "budget-approvals/campaign-003.json"), "utf8")).toBe(raw);
  }));
test("divergent proposal, history or insufficient ceiling cannot be approved", async () =>
  ready(async (root, input) => {
    const original = await history(root, input);
    await executeCampaign(root, input, "campaign-002", original.digest, {
      execute: true,
      authorized: true,
      auth: { account: "a".repeat(32), token: "synthetic-only" },
      transport: async () => {
        throw Error("synthetic-stop");
      },
    });
    const interrupted = await history(root, input);
    await reconcileCampaign(
      root,
      input,
      "campaign-002",
      interrupted.digest,
      "Synthetic reconciliation only; keep full reservation and unknown billing.",
    );
    const projected = await proposedCampaignPlan(root, input, "campaign-003", 0.1);
    expect(projected.projectedUSD).toBeGreaterThan(0.05);
    expect(projected.allowed).toBe(false);
    const r = await request(root, input);
    await expect(
      approveBudget(root, input, { ...r, proposalHash: "0".repeat(64) }),
    ).rejects.toThrow("request-invalid");
    await expect(
      approveBudget(root, input, { ...r, historyDigest: "0".repeat(64) }),
    ).rejects.toThrow("request-invalid");
    await expect(approveBudget(root, input, { ...r, limitUSD: 0.05 })).rejects.toThrow(
      "unsupported-budget-proposal",
    );
    expect(await verifyBudgetApproval(root, input, "campaign-003")).toBeNull();
  }));
test("source, code, budget or historical mutation invalidates existing approval", async () =>
  ready(async (root, input) => {
    const r = await request(root, input);
    await approveBudget(root, input, r);
    const path = join(root, "budget-approvals/campaign-003.json"),
      raw = await readFile(path, "utf8");
    await expect(
      verifyBudgetApproval(root, { ...input, sourceRevision: "changed" }, "campaign-003"),
    ).rejects.toThrow();
    const record = JSON.parse(raw);
    for (const mutation of [
      { codeRevision: "changed" },
      { historicalReservedUSD: 0 },
      { newReservationUSD: 0.001 },
      { approvedLimitUSD: 0.001 },
    ]) {
      await writeFile(path, JSON.stringify({ ...record, ...mutation }));
      await expect(verifyBudgetApproval(root, input, "campaign-003")).rejects.toThrow();
    }
    await writeFile(path, raw);
    await writeFile(join(root, "ledger.json"), "{}");
    await expect(verifyBudgetApproval(root, input, "campaign-003")).rejects.toThrow(
      "legacy-integrity-invalid",
    );
  }));
test("approval command cannot be combined with paid execution", async () => {
  const child = Bun.spawn(
    [
      process.execPath,
      join(process.cwd(), "scripts/i18n-cloudflare-experiment/run.ts"),
      "--approve-budget",
      "--execute",
    ],
    { stdout: "pipe", stderr: "pipe", env: { PATH: process.env.PATH } },
  );
  const text = await new Response(child.stderr).text();
  expect(await child.exited).not.toBe(0);
  expect(text).toContain("budget-approval-is-offline-only");
});

test("approved ceiling is usable only with separate paid consent and snapshot is sealed", async () =>
  ready(async (root, input) => {
    const r = await request(root, input);
    await approveBudget(root, input, r);
    let calls = 0;
    const result = await executeCampaign(root, input, "campaign-003", r.historyDigest, {
      execute: true,
      authorized: true,
      auth: { account: "a".repeat(32), token: "synthetic-only" },
      transport: async () => {
        calls++;
        throw Error("synthetic-offline-stop");
      },
    });
    expect(calls).toBe(1);
    expect(result.report.state).toBe("BLOCKED_RECONCILE_BEFORE_RETRY");
    const snapshot = JSON.parse(
      await readFile(join(root, "campaigns/campaign-003/budget-approval-snapshot.json"), "utf8"),
    );
    expect(snapshot.proposalHash).toBe(r.proposalHash);
    expect(snapshot.paidExecutionAuthorized).toBe(false);
    expect(snapshot.recordHash).toMatch(/^[a-f0-9]{64}$/);
    const seal = JSON.parse(await readFile(join(root, "campaigns/campaign-003/seal.json"), "utf8"));
    expect(seal["budget-approval-snapshot.json"]).toMatch(/^[a-f0-9]{64}$/);
    expect(experimentLimits.usd).toBe(0.05);
  }));

test("campaign004 proposal and formal approval accept 0.15 without paid authorization or historical changes", async () =>
  ready(async (root, input) => {
    const before = await history(root, input);
    const plan = await proposedCampaignPlan(root, input, "campaign-004", 0.15);
    expect(plan.proposal.proposedLimitUSD).toBe(0.15);
    expect(plan.proposal.executionAuthorized).toBe(false);
    expect(plan.limitUSD).toBe(0.05);
    const approval = await approveBudget(root, input, {
      campaign: "campaign-004",
      historyDigest: before.digest,
      proposalHash: plan.proposal.proposalHash,
      limitUSD: 0.15,
      approvedBy: "Synthetic test reviewer",
      reason: "Synthetic offline budget approval only, not paid execution.",
    });
    expect(approval.campaign).toBe("campaign-004");
    expect(approval.approvedLimitUSD).toBe(0.15);
    expect((await verifyBudgetApproval(root, input, "campaign-004"))?.proposalHash).toBe(
      plan.proposal.proposalHash,
    );
    expect((await campaignPlan(root, input, "campaign-004")).limitUSD).toBe(0.15);
    expect((await campaignPlan(root, input, "campaign-003")).limitUSD).toBe(0.05);
    expect(experimentLimits.usd).toBe(0.05);
    expect(await history(root, input)).toEqual(before);
    await expect(
      executeCampaign(root, input, "campaign-004", before.digest, {
        execute: true,
        authorized: false,
        auth: null,
      }),
    ).rejects.toThrow("authorization");
  }));
test("campaign budget pairs cannot be exchanged or expanded beyond scope", async () =>
  ready(async (root, input) => {
    await expect(proposedCampaignPlan(root, input, "campaign-004", 0.1)).rejects.toThrow(
      "unsupported-budget-proposal",
    );
    await expect(proposedCampaignPlan(root, input, "campaign-003", 0.15)).rejects.toThrow(
      "unsupported-budget-proposal",
    );
    await expect(proposedCampaignPlan(root, input, "campaign-005", 0.15)).rejects.toThrow(
      "unsupported-budget-proposal",
    );
    const p = await proposedCampaignPlan(root, input, "campaign-004", 0.15);
    await approveBudget(root, input, {
      campaign: "campaign-004",
      historyDigest: p.history.digest,
      proposalHash: p.proposal.proposalHash,
      limitUSD: 0.15,
      approvedBy: "Synthetic test reviewer",
      reason: "Synthetic test only: ensure scope is explicitly paired.",
    });
    const path = join(root, "budget-approvals/campaign-004.json");
    const record = JSON.parse(await readFile(path, "utf8"));
    await writeFile(path, JSON.stringify({ ...record, campaign: "campaign-003" }));
    await expect(verifyBudgetApproval(root, input, "campaign-004")).rejects.toThrow();
  }));

test("campaign005 supports only the proposed 0.18 plan, without extending approval schema", async () =>
  ready(async (root, input) => {
    const before = await history(root, input);
    const p = await proposedCampaignPlan(root, input, "campaign-005", 0.18);
    expect(p.proposal.proposedLimitUSD).toBe(0.18);
    expect(p.proposal.historyDigest).toBe(before.digest);
    expect(p.proposal.executionAuthorized).toBe(false);
    expect(p.proposal.budgetChangeApplied).toBe(false);
    expect(p.limitUSD).toBe(0.05);
    expect(experimentLimits.usd).toBe(0.05);
    for (const [campaign, limit] of [
      ["campaign-005", 0.15],
      ["campaign-005", 0.181],
      ["campaign-006", 0.18],
      ["campaign-004", 0.18],
      ["campaign-003", 0.18],
    ] as const)
      await expect(proposedCampaignPlan(root, input, campaign, limit)).rejects.toThrow(
        "unsupported-budget-proposal",
      );
    await expect(
      approveBudget(root, input, {
        campaign: "campaign-005",
        historyDigest: before.digest,
        proposalHash: p.proposal.proposalHash,
        limitUSD: 0.18,
        approvedBy: "Synthetic test reviewer",
        reason: "Synthetic test: a plan is not financial approval.",
      }),
    ).rejects.toThrow();
    expect(await verifyBudgetApproval(root, input, "campaign-005")).toBeNull();
    expect(await history(root, input)).toEqual(before);
  }));
