import type { Run, Book } from "./ledger-types";
import { money } from "./ledger-types";
import { policy, type Pool } from "./policy";
import type { BatchPlan } from "./batch-schema";
const amount = (value: unknown) => money.parse(value);
export const held = (r: Run) => Math.max(r.reserved, r.calculated, r.confirmed ?? 0);
export function checkBudget(
  book: Book,
  article: string,
  month: string,
  pool: Pool,
  reserve: number,
) {
  amount(reserve);
  const runs = [...book.runs.values()];
  if (runs.some((r) => !r.reconciled && !["complete", "cancelled"].includes(r.state)))
    throw new Error("reconcile-before-retry");
  const sum = (rs: Run[]) => rs.reduce((n, r) => n + held(r), 0);
  if (sum(runs.filter((r) => r.article === article)) + reserve > policy.article)
    throw new Error("article-budget-exceeded");
  if (sum(runs.filter((r) => r.month === month)) + reserve > policy.monthly)
    throw new Error("monthly-budget-exceeded");
  if (sum(runs.filter((r) => r.month === month && r.pool === pool)) + reserve > policy[pool])
    throw new Error("pool-budget-exceeded");
}
export function checkBatchBudget(book: Book, plan: BatchPlan) {
  const runs = [...book.runs.values()];
  if (runs.some((r) => r.calls.size > r.usage.size && r.confirmed === null))
    throw new Error("batch-unknown-billing");
  if (JSON.stringify(plan.policy) !== JSON.stringify(policy)) throw new Error("batch-policy-stale");
  if (new Set(plan.articles.map((a) => a.article)).size !== plan.articles.length)
    throw new Error("batch-duplicate-article");
  for (const a of plan.articles) {
    if (
      a.reserved !== a.calls.reduce((n, c) => n + c.reserved, 0) ||
      new Set(a.calls.map((c) => `${c.locale}:${c.index}`)).size !== a.calls.length ||
      !a.calls.some((c) => c.locale === "en") ||
      !a.calls.some((c) => c.locale === "es")
    )
      throw new Error("batch-cost-invalid");
    checkBudget(book, a.article, plan.month, plan.pool, a.reserved);
  }
  const total = plan.articles.reduce((n, a) => n + a.reserved, 0);
  if (!Number.isSafeInteger(total) || total !== plan.reserved)
    throw new Error("batch-cost-invalid");
  const sum = (rs: Run[]) => rs.reduce((n, r) => n + held(r), 0);
  if (sum(runs.filter((r) => r.month === plan.month)) + total > policy.monthly)
    throw new Error("monthly-budget-exceeded");
  if (
    sum(runs.filter((r) => r.month === plan.month && r.pool === plan.pool)) + total >
    policy[plan.pool]
  )
    throw new Error("pool-budget-exceeded");
}
