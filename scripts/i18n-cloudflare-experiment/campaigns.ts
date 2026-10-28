import { readFile, readdir, mkdir, open, lstat } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { z } from "zod";
import { hash } from "../i18n-simulation/pipeline";
import { cost, usageSchema } from "../i18n-real-pilot/budget";
import {
  plan,
  runExperiment,
  responseParserVersion,
  promptVersion,
  protectedEquation,
  experimentLimits,
  type Input,
  type Options,
} from "./experiment";

export const legacyPins: Record<string, string> = {
  "ledger.json": "6aa439dc5fb0ae7be6d7cdea49913cd5abee8ae85fd34e00c48ea9d1b43b8b5a",
  "plan-report.json": "daa8411cc0d9b002f7cb4bf40e2c7354446fe69af2da66893f2aad13ee08d59e",
  "execution-*.json": "9b47032e2e6b86706103c4979ad4f89b341a05f76cb1c6d9f56c7ac17d7269c7",
};
const idSchema = z.string().regex(/^[a-z][a-z0-9-]{2,63}$/);
const receiptSchema = z
  .object({
    campaign: idSchema,
    sourceRevision: z.string(),
    parser: z.string(),
    priorDigest: z.string(),
    reservedUSD: z.number().finite().positive(),
    createdAt: z.string().datetime(),
  })
  .strict();
const reconciliationSchema = z
  .object({
    campaign: z.string(),
    historyDigest: z.string(),
    reason: z.string().min(12).max(1000),
    recordedAt: z.string().datetime(),
    billingConfirmed: z.literal(false),
    retainedUSD: z.number().finite().nonnegative(),
  })
  .strict();
async function bytes(path: string) {
  if (!(await lstat(path)).isFile()) throw new Error("history-not-regular-file");
  return readFile(path, "utf8");
}
async function exclusive(path: string, value: unknown) {
  const file = await open(path, "wx", 0o600);
  try {
    await file.writeFile(JSON.stringify(value, null, 2));
  } finally {
    await file.close();
  }
}
async function entries(path: string) {
  try {
    if (!(await lstat(path)).isDirectory()) throw new Error("history-not-directory");
    return (await readdir(path)).sort();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
async function locked<T>(root: string, run: () => Promise<T>) {
  // A crash leaves the lock in place: never automatically delete or steal it.
  const file = await open(join(root, "recovery.lock"), "wx", 0o600).catch(() => {
    throw new Error("concurrent-or-unreconciled-execution");
  });
  try {
    return await run();
  } finally {
    await file.close();
    await import("node:fs/promises").then((fs) => fs.unlink(join(root, "recovery.lock")));
  }
}
const callSchema = z.object({
  id: z.string(),
  article: z.literal("o-que-e-potencia"),
  locale: z.enum(["en", "es"]),
  provider: z.literal("cloudflare"),
  stage: z.literal("translation"),
  estimatedInputTokens: z.number().int().positive(),
  maxOutputTokens: z.literal(2500),
  reservedUSD: z.number().finite().positive(),
  usageCalculatedUSD: z.number().finite().nonnegative().nullable(),
  usage: usageSchema.nullable(),
  status: z.enum(["reserved", "completed", "failed"]),
  attempts: z.literal(1),
});
function accounting(raw: string) {
  const ledger = z
    .object({ version: z.literal("real-pilot-v1"), calls: z.array(callSchema) })
    .parse(JSON.parse(raw));
  const ids = new Set<string>();
  let held = 0,
    calculated = 0;
  for (const call of ledger.calls) {
    if (
      ids.has(call.id) ||
      Math.abs(
        call.reservedUSD - cost("cloudflare", call.estimatedInputTokens, call.maxOutputTokens),
      ) > 1e-12
    )
      throw new Error("history-accounting-invalid");
    ids.add(call.id);
    if (
      call.usage &&
      (call.usageCalculatedUSD === null ||
        Math.abs(
          call.usageCalculatedUSD -
            cost("cloudflare", call.usage.inputTokens, call.usage.outputTokens),
        ) > 1e-12)
    )
      throw new Error("history-accounting-invalid");
    if (!call.usage && call.usageCalculatedUSD !== null)
      throw new Error("history-accounting-invalid");
    held += Math.max(
      call.reservedUSD,
      call.usageCalculatedUSD ?? 0,
      call.usage?.providerReportedCostUSD ?? 0,
    );
    calculated += call.usageCalculatedUSD ?? 0;
  }
  return { held, calculated };
}
export async function history(root: string, input: Input) {
  const records: Record<string, string> = {};
  for (const [pattern, expected] of Object.entries(legacyPins)) {
    let name = pattern;
    if (pattern === "execution-*.json") {
      const matches = (await entries(root)).filter((file) => /^execution-.*\.json$/.test(file));
      if (matches.length !== 1) throw new Error("legacy-integrity-invalid");
      name = matches[0];
    }
    const raw = await bytes(join(root, name));
    if (hash(raw) !== expected) throw new Error("legacy-integrity-invalid");
    records[name] = expected;
  }
  const legacy = accounting(await bytes(join(root, "ledger.json")));
  const rows = [
    {
      campaign: "legacy",
      reservedUSD: legacy.held,
      calculatedUSD: legacy.calculated,
      billingConfirmed: false,
      needsReconciliation: true,
    },
  ];
  let digest = hash(JSON.stringify(records));
  const reconcile = async (campaign: string, retainedUSD: number, needed: boolean) => {
    const file = join(root, "reconciliations", `${campaign}.json`);
    try {
      const raw = await bytes(file),
        rec = reconciliationSchema.parse(JSON.parse(raw));
      if (
        rec.campaign !== campaign ||
        rec.historyDigest !== digest ||
        rec.retainedUSD !== retainedUSD
      )
        throw new Error("reconciliation-invalid");
      records[`reconciliations/${campaign}.json`] = hash(raw);
      digest = hash(JSON.stringify(records));
      return false;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return needed;
      throw error;
    }
  };
  rows[0].needsReconciliation = await reconcile("legacy", legacy.held, true);
  const campaigns = join(root, "campaigns");
  const names = await entries(campaigns);
  const reservations = await entries(join(root, "campaign-reservations"));
  if (JSON.stringify(reservations) !== JSON.stringify(names.map((name) => `${name}.json`)))
    throw new Error("campaign-inventory-invalid");
  for (const name of names) {
    idSchema.parse(name);
    if (!(await lstat(join(campaigns, name))).isDirectory())
      throw new Error("history-not-directory");
    const raw = await bytes(join(campaigns, name, "manifest.json"));
    const manifest = receiptSchema.parse(JSON.parse(raw));
    const reservationRaw = await bytes(join(root, "campaign-reservations", `${name}.json`));
    const reservation = z
      .object({ manifestHash: z.string() })
      .strict()
      .parse(JSON.parse(reservationRaw));
    if (reservation.manifestHash !== hash(raw))
      throw new Error("campaign-reservation-integrity-invalid");
    records[`campaign-reservations/${name}.json`] = hash(reservationRaw);
    if (
      manifest.campaign !== name ||
      manifest.priorDigest !== digest ||
      manifest.sourceRevision !== input.sourceRevision ||
      manifest.parser !== responseParserVersion
    )
      throw new Error("campaign-chain-invalid");
    records[`campaigns/${name}/manifest.json`] = hash(raw);
    const sealRaw = await bytes(join(campaigns, name, "seal.json"));
    const seal = z.record(z.string(), z.string()).parse(JSON.parse(sealRaw));
    const actual = (await entries(join(campaigns, name))).filter(
      (n) => !["manifest.json", "seal.json"].includes(n),
    );
    if (
      JSON.stringify(actual) !== JSON.stringify(Object.keys(seal).sort()) ||
      !actual.includes("ledger.json") ||
      actual.filter((n) => /^execution-.*\.json$/.test(n)).length !== 1
    )
      throw new Error("campaign-seal-invalid");
    for (const file of actual) {
      const value = await bytes(join(campaigns, name, file));
      if (hash(value) !== seal[file]) throw new Error("campaign-integrity-invalid");
      records[`campaigns/${name}/${file}`] = seal[file];
    }
    const totals = accounting(await bytes(join(campaigns, name, "ledger.json")));
    const reportName = actual.find((n) => /^execution-.*\.json$/.test(n));
    if (!reportName) throw new Error("campaign-report-missing");
    const report = z
      .object({
        state: z.enum(["TRANSLATED_AWAITING_REVIEW", "BLOCKED_RECONCILE_BEFORE_RETRY"]),
        sourceRevision: z.literal(input.sourceRevision),
        publishable: z.literal(false),
      })
      .parse(JSON.parse(await bytes(join(campaigns, name, reportName))));
    const historicalReport = JSON.parse(await bytes(join(campaigns, name, reportName)));
    const historicalEstimate = z
      .object({
        totalUSD: z.number().finite().positive(),
        calls: z.array(z.object({ reservedUSD: z.number().finite().positive() })).min(1),
      })
      .parse(historicalReport.estimate);
    if (
      manifest.reservedUSD !== historicalEstimate.totalUSD ||
      Math.abs(
        historicalEstimate.calls.reduce((n, c) => n + c.reservedUSD, 0) - manifest.reservedUSD,
      ) > 1e-12
    )
      throw new Error("campaign-reservation-invalid");
    const held = Math.max(manifest.reservedUSD, totals.held);
    digest = hash(JSON.stringify(records));
    const needed = await reconcile(name, held, report.state !== "TRANSLATED_AWAITING_REVIEW");
    rows.push({
      campaign: name,
      reservedUSD: held,
      calculatedUSD: totals.calculated,
      billingConfirmed: false,
      needsReconciliation: needed,
    });
  }
  const known = new Set(rows.map((row) => `${row.campaign}.json`));
  if ((await entries(join(root, "reconciliations"))).some((name) => !known.has(name)))
    throw new Error("orphan-reconciliation");
  return {
    digest,
    campaigns: rows,
    reservedUSD: rows.reduce((n, r) => n + r.reservedUSD, 0),
    calculatedUSD: rows.reduce((n, r) => n + r.calculatedUSD, 0),
  };
}
async function baseCampaignPlan(root: string, input: Input, campaign: string) {
  idSchema.parse(campaign);
  const previous = await history(root, input),
    estimate = plan(input);
  const projectedUSD = previous.reservedUSD + estimate.totalUSD;
  const duplicate = previous.campaigns.some((row) => row.campaign === campaign);
  return {
    campaign,
    history: previous,
    estimate,
    projectedUSD,
    remainingUSD: experimentLimits.usd - projectedUSD,
    limitUSD: experimentLimits.usd,
    allowed:
      !duplicate &&
      estimate.allowed &&
      projectedUSD <= experimentLimits.usd &&
      previous.campaigns.every((row) => !row.needsReconciliation),
    duplicate,
    publishable: false,
    decision: "REVIEW_REQUIRED",
  };
}
export async function reconcileCampaign(
  root: string,
  input: Input,
  campaign: string,
  digest: string,
  reason: string,
) {
  return locked(root, async () => {
    const current = await history(root, input);
    const row = current.campaigns.find((r) => r.campaign === campaign);
    if (current.digest !== digest || !row?.needsReconciliation)
      throw new Error("reconciliation-history-mismatch");
    const record = reconciliationSchema.parse({
      campaign,
      historyDigest: digest,
      reason,
      recordedAt: new Date().toISOString(),
      billingConfirmed: false,
      retainedUSD: row.reservedUSD,
    });
    await mkdir(join(root, "reconciliations"), { recursive: true });
    await exclusive(join(root, "reconciliations", `${campaign}.json`), record);
    return record;
  });
}
export async function executeCampaign(
  root: string,
  input: Input,
  campaign: string,
  expectedDigest: string,
  options: Options,
) {
  if (!options.execute || !options.authorized || !options.auth)
    throw new Error("explicit-authorization-and-credentials-required");
  return locked(root, async () => {
    const preview = await campaignPlan(root, input, campaign);
    if (!preview.allowed || preview.history.digest !== expectedDigest)
      throw new Error("campaign-plan-not-authorized");
    // Sortable unique identifiers enforce an append-only order. Never resume a directory.
    const names = await entries(join(root, "campaigns"));
    if (names.some((name) => name >= campaign)) throw new Error("campaign-id-not-increasing");
    await mkdir(join(root, "campaigns"), { recursive: true });
    const directory = join(root, "campaigns", campaign);
    await mkdir(directory);
    await exclusive(join(directory, "manifest.json"), {
      campaign,
      sourceRevision: input.sourceRevision,
      parser: responseParserVersion,
      priorDigest: expectedDigest,
      reservedUSD: preview.estimate.totalUSD,
      createdAt: new Date().toISOString(),
    });
    await mkdir(join(root, "campaign-reservations"), { recursive: true });
    await exclusive(join(root, "campaign-reservations", `${campaign}.json`), {
      manifestHash: hash(await bytes(join(directory, "manifest.json"))),
    });
    if (preview.budgetApproval)
      await exclusive(join(directory, "budget-approval-snapshot.json"), preview.budgetApproval);
    const report = await runExperiment(input, directory, options);
    const seal: Record<string, string> = {};
    for (const file of await entries(directory))
      if (file !== "manifest.json") seal[file] = hash(await bytes(join(directory, file)));
    await exclusive(join(directory, "seal.json"), seal);
    return { report, accounting: await campaignPlan(root, input, `${campaign}-next`) };
  });
}

/** Read-only proposal: never changes experimentLimits, reconciles, or authorizes execution. */
export async function proposedCampaignPlan(
  root: string,
  input: Input,
  campaign: string,
  proposedLimitUSD: number,
) {
  if (!supportedBudget(campaign, proposedLimitUSD)) throw new Error("unsupported-budget-proposal");
  const current = await baseCampaignPlan(root, input, campaign);
  const proposal = {
    campaign,
    sourceRevision: input.sourceRevision,
    codeRevision: await codeRevision(),
    promptVersion,
    parser: responseParserVersion,
    historyDigest: current.history.digest,
    historicalReservedUSD: current.history.reservedUSD,
    proposedLimitUSD,
    newReservationUSD: current.estimate.totalUSD,
    projectedUSD: current.projectedUSD,
    remainingUSD: proposedLimitUSD - current.projectedUSD,
    withinProposedBudget: current.projectedUSD <= proposedLimitUSD && current.estimate.allowed,
    requiredReconciliations: current.history.campaigns
      .filter((r) => r.needsReconciliation)
      .map((r) => r.campaign),
    protectedIDs: input.source.segments.filter(protectedEquation).map((s) => s.id),
    submittedIDs: input.chunks.map((chunk) =>
      chunk.filter((s) => !protectedEquation(s)).map((s) => s.id),
    ),
    executionAuthorized: false,
    budgetChangeApplied: false,
  };
  return { ...current, proposal: { ...proposal, proposalHash: hash(JSON.stringify(proposal)) } };
}

/** Explicit supported campaign/ceiling pairs; never infer approval from a numeric limit. */
function supportedBudget(campaign: string, limit: number) {
  return (
    (campaign === "campaign-003" && limit === 0.1) ||
    (campaign === "campaign-004" && limit === 0.15) ||
    (campaign === "campaign-005" && limit === 0.18)
  );
}
const approvalSchema = z
  .object({
    version: z.literal("campaign-budget-approval-v1"),
    campaign: z.enum(["campaign-003", "campaign-004"]),
    historyDigest: z.string().regex(/^[a-f0-9]{64}$/),
    proposalHash: z.string().regex(/^[a-f0-9]{64}$/),
    sourceRevision: z.string(),
    codeRevision: z.string(),
    priorLimitUSD: z.literal(0.05),
    approvedLimitUSD: z.union([z.literal(0.1), z.literal(0.15)]),
    historicalReservedUSD: z.number().finite().nonnegative(),
    newReservationUSD: z.number().finite().positive(),
    approvedBy: z.string().trim().min(3).max(160),
    reason: z.string().trim().min(12).max(1000),
    approvedAt: z.string().datetime(),
    paidExecutionAuthorized: z.literal(false),
  })
  .strict()
  .refine(
    (record) => supportedBudget(record.campaign, record.approvedLimitUSD),
    "unsupported-campaign-budget-pair",
  );
/** Hash the code and dependency lock, not a mutable version label. */
export async function codeRevision() {
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const files = [
    "scripts/i18n-cloudflare-experiment/campaigns.ts",
    "scripts/i18n-cloudflare-experiment/experiment.ts",
    "scripts/i18n-cloudflare-experiment/run.ts",
    "scripts/i18n-real-pilot/adapters.ts",
    "scripts/i18n-real-pilot/budget.ts",
    "scripts/i18n-real-pilot/sample.ts",
    "scripts/i18n-real-pilot/metrics.ts",
    "scripts/i18n-simulation/pipeline.ts",
    "scripts/generate-content.ts",
    "scripts/generate-translations.ts",
    "src/content/schema.ts",
    "src/content/editorial-parser.ts",
    "src/content/taxonomy-catalog.ts",
    "src/data/categories.ts",
    "src/data/taxonomy-tags-1.ts",
    "src/data/taxonomy-tags-2.ts",
    "src/data/taxonomy-tags-3.ts",
    "src/data/taxonomy-tags-4.ts",
    "src/data/taxonomy-tags-5.ts",
    "src/data/taxonomy-tags-6.ts",
    "src/content/translation-schema.ts",
    "src/data/authors.ts",
    "src/data/categories.ts",
    "src/content/remark-editorial-slots.ts",
    "package.json",
    "bun.lock",
  ];
  const digest = createHash("sha256");
  for (const file of files) {
    digest.update(file);
    digest.update("\0");
    digest.update(await readFile(join(repo, file)));
    digest.update("\0");
  }
  return digest.digest("hex");
}
export async function verifyBudgetApproval(root: string, input: Input, campaign: string) {
  idSchema.parse(campaign);
  let raw: string;
  try {
    raw = await bytes(join(root, "budget-approvals", `${campaign}.json`));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  const approval = approvalSchema.parse(JSON.parse(raw));
  const current = await proposedCampaignPlan(root, input, campaign, approval.approvedLimitUSD);
  if (
    approval.campaign !== campaign ||
    approval.historyDigest !== current.history.digest ||
    approval.proposalHash !== current.proposal.proposalHash ||
    approval.sourceRevision !== input.sourceRevision ||
    approval.codeRevision !== current.proposal.codeRevision ||
    approval.priorLimitUSD !== experimentLimits.usd ||
    approval.historicalReservedUSD !== current.history.reservedUSD ||
    approval.newReservationUSD !== current.estimate.totalUSD ||
    current.duplicate ||
    !current.proposal.withinProposedBudget ||
    current.proposal.requiredReconciliations.length
  )
    throw new Error("budget-approval-stale-or-invalid");
  return { ...approval, recordHash: createHash("sha256").update(raw).digest("hex") };
}
export async function campaignPlan(root: string, input: Input, campaign: string) {
  const current = await baseCampaignPlan(root, input, campaign);
  const approval = await verifyBudgetApproval(root, input, campaign);
  if (!approval) return { ...current, budgetApproval: null };
  return {
    ...current,
    limitUSD: approval.approvedLimitUSD,
    remainingUSD: approval.approvedLimitUSD - current.projectedUSD,
    allowed:
      !current.duplicate &&
      current.estimate.allowed &&
      current.projectedUSD <= approval.approvedLimitUSD &&
      current.history.campaigns.every((r) => !r.needsReconciliation),
    budgetApproval: approval,
  };
}
export async function approveBudget(
  root: string,
  input: Input,
  request: {
    campaign: string;
    historyDigest: string;
    proposalHash: string;
    limitUSD: number;
    approvedBy: string;
    reason: string;
  },
) {
  return locked(root, async () => {
    const current = await proposedCampaignPlan(root, input, request.campaign, request.limitUSD);
    if (
      current.history.digest !== request.historyDigest ||
      current.proposal.proposalHash !== request.proposalHash ||
      current.duplicate ||
      !current.proposal.withinProposedBudget ||
      current.proposal.requiredReconciliations.length
    )
      throw new Error("budget-approval-request-invalid");
    const approval = approvalSchema.parse({
      version: "campaign-budget-approval-v1",
      campaign: request.campaign,
      historyDigest: request.historyDigest,
      proposalHash: request.proposalHash,
      sourceRevision: input.sourceRevision,
      codeRevision: current.proposal.codeRevision,
      priorLimitUSD: experimentLimits.usd,
      approvedLimitUSD: request.limitUSD,
      historicalReservedUSD: current.history.reservedUSD,
      newReservationUSD: current.estimate.totalUSD,
      approvedBy: request.approvedBy,
      reason: request.reason,
      approvedAt: new Date().toISOString(),
      paidExecutionAuthorized: false,
    });
    await mkdir(join(root, "budget-approvals"), { recursive: true });
    await exclusive(join(root, "budget-approvals", `${request.campaign}.json`), approval);
    return approval;
  });
}
