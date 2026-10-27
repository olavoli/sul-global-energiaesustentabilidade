import { readFile, mkdir, open } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { batchPlanSchema, batchRunId, type BatchPlan } from "./batch-schema";
import { plan, revision, executeReserved } from "./run";
import { input } from "./translation";
import { loadBook, append, locked, checkBatchBudget, held, type Book } from "./ledger";
import { fingerprint, policy, pricing, usd, type Pool } from "./policy";
import { failure } from "./errors";
import type { Transport } from "../i18n-real-pilot/adapters";
const dir = (root: string) => join(root, "i18n/storage");
const planFile = (root: string, id: string) => {
  if (!/^[a-f0-9]{64}$/.test(id)) throw new Error("batch-id-invalid");
  return join(dir(root), "batches/plans", id + ".json");
};
export async function planBatch(root: string, articles: string[], pool: Pool = "regular") {
  if (!articles.length || new Set(articles).size !== articles.length)
    throw new Error("batch-duplicate-or-empty-selection");
  const book = await loadBook(dir(root));
  const entries = [];
  for (const slug of articles) {
    let p;
    try {
      p = await plan(root, slug, pool);
    } catch (e) {
      const error = failure(e, "source");
      if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) error.diagnostic.article = slug;
      throw error;
    }

    entries.push({
      article: slug,
      sourceRevision: p.sourceRevision,
      calls: p.calls,
      reserved: p.reserved,
    });
  }
  const descriptor = batchPlanSchema.parse({
    version: "batch-v1",
    month: new Date().toISOString().slice(0, 7),
    pool,
    history: book.digest,
    codeRevision: await revision(root),
    policy,
    pricing,
    articles: entries,
    reserved: entries.reduce((n, a) => n + a.reserved, 0),
  });
  if ((await loadBook(dir(root))).digest !== book.digest) throw new Error("batch-history-changed");
  let blocked: string | null = null;
  try {
    checkBatchBudget(book, descriptor);
  } catch (e) {
    blocked = (e as Error).message;
  }
  return {
    id: fingerprint(descriptor),
    plan: descriptor,
    allowed: blocked === null,
    blocked,
    summary: {
      articles: entries.map((a) => ({
        article: a.article,
        locales: ["en", "es"],
        calls: a.calls.length,
        reservedUSD: usd(a.reserved),
      })),
      calls: entries.reduce((n, a) => n + a.calls.length, 0),
      reservedUSD: usd(descriptor.reserved),
    },
  };
}
export async function saveBatchPlan(root: string, proposal: Awaited<ReturnType<typeof planBatch>>) {
  if (fingerprint(batchPlanSchema.parse(proposal.plan)) !== proposal.id)
    throw new Error("batch-plan-invalid");
  const file = planFile(root, proposal.id),
    text = JSON.stringify(proposal.plan, null, 2) + "\n";
  await mkdir(join(dir(root), "batches/plans"), { recursive: true });
  try {
    const handle = await open(file, "wx", 0o600);
    try {
      await handle.writeFile(text);
      await handle.sync();
    } finally {
      await handle.close();
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    if ((await readFile(file, "utf8")) !== text) throw new Error("batch-plan-integrity");
  }
  return file;
}
async function readPlan(root: string, id: string) {
  const plan = batchPlanSchema.parse(JSON.parse(await readFile(planFile(root, id), "utf8")));
  if (fingerprint(plan) !== id) throw new Error("batch-plan-integrity");
  return plan;
}
function unknownBilling(book: Book) {
  return [...book.runs.values()].some((r) => r.confirmed === null && r.calls.size > r.usage.size);
}
export async function batchStatus(root: string, id: string) {
  const descriptor = await readPlan(root, id),
    book = await loadBook(dir(root));
  const started = book.events.some((e) => e.kind === "batch-reserve" && e.run === id);
  const articles = descriptor.articles.map((a) => {
    const r = book.runs.get(batchRunId(id, a.article));
    return {
      article: a.article,
      run: r?.id ?? null,
      state: !r
        ? "PENDING"
        : r.state === "complete"
          ? "REVIEW_REQUIRED"
          : r.state === "cancelled"
            ? "CANCELLED"
            : ["pending", "reserved"].includes(r.state) && !r.calls.size
              ? "PENDING"
              : "BLOCKED",
      reservedUSD: usd(r?.reserved ?? a.reserved),
      calculatedUSD: r && r.usage.size > 0 ? usd(r.calculated) : null,
      billingStatus:
        r?.confirmed !== null && r?.confirmed !== undefined
          ? "confirmed"
          : r && r.calls.size > r.usage.size
            ? "unknown"
            : "unconfirmed",
      confirmedUSD: r?.confirmed === null || !r ? null : usd(r.confirmed),
      usageComplete: r ? r.calls.size === r.usage.size : null,
      dispatchedCalls: r?.calls.size ?? 0,
      output: r?.state === "complete" ? join(dir(root), "review", r.id) : null,
    };
  });
  return {
    id,
    ledgerDigest: book.digest,
    state: articles.some((a) => a.state === "BLOCKED")
      ? "BLOCKED"
      : articles.every((a) => a.state === "REVIEW_REQUIRED")
        ? "REVIEW_REQUIRED"
        : articles.some((a) => a.state === "PENDING")
          ? started
            ? "PAUSED"
            : "PLANNED"
          : "CANCELLED",
    executionBlock: unknownBilling(book) ? "batch-unknown-billing" : null,
    articles,
    publishable: false,
  };
}
async function verifySnapshot(root: string, descriptor: BatchPlan) {
  if (
    descriptor.month !== new Date().toISOString().slice(0, 7) ||
    descriptor.codeRevision !== (await revision(root)) ||
    JSON.stringify(descriptor.policy) !== JSON.stringify(policy) ||
    JSON.stringify(descriptor.pricing) !== JSON.stringify(pricing)
  )
    throw new Error("batch-plan-stale");
  for (const a of descriptor.articles)
    if ((await input(root, a.article)).sourceRevision !== a.sourceRevision)
      throw new Error("batch-source-stale");
}
export async function executeBatch(
  root: string,
  id: string,
  opts: {
    authorization?: string;
    paid?: string;
    operator: string;
    contingency?: string;
    credentials: { account: string; token: string };
    transport?: Transport;
    resume?: boolean;
    maxArticles?: number;
  },
) {
  if (opts.authorization !== id || opts.paid !== "1" || !opts.operator.trim())
    throw new Error("batch-authorization-required");
  if (
    !/^[a-f0-9]{32}$/i.test(opts.credentials.account) ||
    !opts.credentials.token.trim() ||
    opts.credentials.token.trim() !== opts.credentials.token ||
    /[\r\n]/.test(opts.credentials.token)
  )
    throw new Error("invalid-credentials");
  if (
    opts.maxArticles !== undefined &&
    (!Number.isSafeInteger(opts.maxArticles) || opts.maxArticles < 1)
  )
    throw new Error("batch-invalid-step-limit");
  return locked(dir(root), async () => {
    const descriptor = await readPlan(root, id);
    await verifySnapshot(root, descriptor);
    if (descriptor.pool === "contingency" && !opts.contingency?.trim())
      throw new Error("contingency-authorization-required");
    let book = await loadBook(dir(root));
    const prior = book.events.find((e) => e.kind === "batch-reserve" && e.run === id);
    if (!prior) {
      if (opts.resume) throw new Error("batch-not-started");
      const fresh = await planBatch(
        root,
        descriptor.articles.map((a) => a.article),
        descriptor.pool,
      );
      if (fresh.id !== id) throw new Error("batch-plan-stale");
      if (!fresh.allowed) throw new Error(fresh.blocked ?? "batch-budget-blocked");
      book = await append(dir(root), book, "batch-reserve", id, {
        plan: descriptor,
        operator: opts.operator,
        contingency: opts.contingency ?? null,
      });
    } else {
      if (!opts.resume) throw new Error("batch-already-started-use-resume");
      const owned = new Set([id, ...descriptor.articles.map((a) => batchRunId(id, a.article))]);
      if (book.events.slice(prior.sequence).some((e) => !owned.has(e.run)))
        throw new Error("batch-history-changed");
    }
    if (unknownBilling(book)) throw new Error("batch-unknown-billing");
    const all = [...book.runs.values()];
    if (
      all.some(
        (r) => r.batch !== id && !r.reconciled && !["complete", "cancelled"].includes(r.state),
      )
    )
      throw new Error("reconcile-before-retry");
    if (
      all.some(
        (r) =>
          r.batch === id &&
          !["complete", "cancelled", "pending"].includes(r.state) &&
          !(r.state === "reserved" && r.calls.size === 0),
      )
    )
      throw new Error("batch-dispatched-run-not-resumable");
    let completed = 0;
    for (const a of descriptor.articles) {
      book = await loadBook(dir(root));
      if (unknownBilling(book)) throw new Error("batch-unknown-billing");
      const runId = batchRunId(id, a.article),
        r = book.runs.get(runId);
      if (!r) throw new Error("batch-reservation-missing");
      if (["complete", "cancelled"].includes(r.state)) continue;
      if (completed === (opts.maxArticles ?? Infinity)) break;
      await verifySnapshot(root, descriptor);
      const currentMonth = [...book.runs.values()].filter((r) => r.month === descriptor.month);
      if (
        currentMonth.reduce((n, r) => n + held(r), 0) > policy.monthly ||
        currentMonth.filter((r) => r.pool === descriptor.pool).reduce((n, r) => n + held(r), 0) >
          policy[descriptor.pool] ||
        [...book.runs.values()]
          .filter((r) => r.article === a.article)
          .reduce((n, r) => n + held(r), 0) > policy.article
      )
        throw new Error("batch-budget-exceeded");
      if (r.state === "pending") book = await append(dir(root), book, "batch-start", runId, {});
      const individual = {
        article: a.article,
        month: descriptor.month,
        pool: descriptor.pool,
        sourceRevision: a.sourceRevision,
        codeRevision: descriptor.codeRevision,
        policy,
        pricing,
        history: book.digest,
        calls: a.calls,
        reserved: a.reserved,
        planHash: runId,
        allowed: true,
        blocked: null,
        reservedUSD: usd(a.reserved),
        articleHeldUSD: usd(held(r)),
        billingConfirmed: false,
      };
      await executeReserved(root, a.article, opts, individual, runId, book);
      completed++;
    }
    return batchStatus(root, id);
  });
}
export async function cancelUnusedBatch(
  root: string,
  id: string,
  history: string,
  operator: string,
  reason: string,
) {
  return locked(dir(root), async () => {
    const book = await loadBook(dir(root));
    if (book.digest !== history) throw new Error("stale-history");
    await readPlan(root, id);
    return append(dir(root), book, "batch-cancel", id, { operator, reason });
  });
}
async function main() {
  const { values: v, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      articles: { type: "string" },
      pool: { type: "string", default: "regular" },
      plan: { type: "string" },
      "authorize-plan": { type: "string" },
      operator: { type: "string" },
      "authorize-contingency": { type: "string" },
      "max-articles": { type: "string" },
      history: { type: "string" },
      reason: { type: "string" },
    },
  });
  const root = resolve(import.meta.dir, "../.."),
    command = positionals[0];
  if (command === "plan") {
    if (!v.articles || !["regular", "contingency"].includes(v.pool))
      throw new Error("batch-selection-required");
    const proposal = await planBatch(
      root,
      v.articles.split(",").map((s) => s.trim()),
      v.pool as Pool,
    );
    await saveBatchPlan(root, proposal);
    console.log(JSON.stringify(proposal, null, 2));
    return;
  }
  if (!v.plan) throw new Error("batch-id-required");
  if (command === "status") {
    console.log(JSON.stringify(await batchStatus(root, v.plan), null, 2));
    return;
  }
  if (command === "cancel") {
    if (!v.history || !v.operator || !v.reason) throw new Error("batch-cancel-fields-required");
    await cancelUnusedBatch(root, v.plan, v.history, v.operator, v.reason);
    console.log("Unused reservations cancelled operationally; money retained.");
    return;
  }
  if (command !== "execute" && command !== "resume") throw new Error("batch-command-invalid");
  const account = process.env.I18N_OPERATIONS_CF_ACCOUNT_ID,
    token = process.env.I18N_OPERATIONS_CF_API_TOKEN;
  if (!account || !token) throw new Error("credentials-required");
  console.log(
    JSON.stringify(
      await executeBatch(root, v.plan, {
        authorization: v["authorize-plan"],
        paid: process.env.I18N_OPERATIONS_ALLOW_PAID,
        operator: v.operator ?? "",
        contingency: v["authorize-contingency"],
        credentials: { account, token },
        resume: command === "resume",
        maxArticles: v["max-articles"] === undefined ? undefined : Number(v["max-articles"]),
      }),
      null,
      2,
    ),
  );
}
if (import.meta.main)
  main().catch((e) => {
    console.error(
      JSON.stringify({
        status: "BLOCKED",
        ...failure(e, "preflight").diagnostic,
        retryAutomatically: false,
      }),
    );
    process.exitCode = 1;
  });
