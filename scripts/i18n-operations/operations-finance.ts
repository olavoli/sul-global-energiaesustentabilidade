import { join } from "node:path";
import { locked, loadBook, append, held, type Book } from "./ledger";
import { nanos, usd } from "./policy";
export async function reconcile(
  root: string,
  run: string,
  history: string,
  operator: string,
  reason: string,
  confirmed: number | null,
  evidence?: string,
) {
  const dir = join(root, "i18n/storage");
  return locked(dir, async () => {
    const book = await loadBook(dir);
    if (book.digest !== history) throw new Error("stale-history");
    return append(dir, book, "reconcile", run, {
      operator,
      reason,
      confirmed: confirmed === null ? null : nanos(confirmed),
      evidence: evidence ?? null,
    });
  });
}
export async function confirmBilling(
  root: string,
  run: string,
  history: string,
  operator: string,
  reason: string,
  confirmed: number,
  evidence: string,
) {
  const dir = join(root, "i18n/storage");
  return locked(dir, async () => {
    const book = await loadBook(dir);
    if (book.digest !== history) throw new Error("stale-history");
    return append(dir, book, "billing", run, {
      operator,
      reason,
      confirmed: nanos(confirmed),
      evidence,
    });
  });
}
export function summary(book: Book) {
  return {
    digest: book.digest,
    runs: [...book.runs.values()].map((r) => ({
      id: r.id,
      batch: r.batch ?? null,
      article: r.article,
      month: r.month,
      pool: r.pool,
      reservedUSD: usd(r.reserved),
      calculatedUSD: usd(r.calculated),
      usageComplete: r.calls.size === r.usage.size,
      unaccountedDispatches: r.calls.size - r.usage.size,
      confirmedUSD: r.confirmed === null ? null : usd(r.confirmed),
      billingStatus:
        r.confirmed !== null
          ? "confirmed"
          : r.calls.size > r.usage.size
            ? "unknown"
            : "unconfirmed",
      heldUSD: usd(held(r)),
      state: r.state,
      needsReconciliation: !r.reconciled && !["complete", "cancelled"].includes(r.state),
    })),
  };
}
