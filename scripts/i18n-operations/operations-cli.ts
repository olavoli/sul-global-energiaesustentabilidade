import { readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { parseArgs } from "node:util";
import { summary, reconcile, confirmBilling } from "./operations-finance";
import { loadBook } from "./ledger";
import { plan, execute } from "./run";
import type { Pool } from "./policy";
export async function main() {
  const { values: v } = parseArgs({
    options: {
      article: { type: "string" },
      execute: { type: "boolean" },
      "authorize-plan": { type: "string" },
      pool: { type: "string", default: "regular" },
      "authorize-contingency": { type: "string" },
      status: { type: "boolean" },
      reconcile: { type: "string" },
      "confirm-billing": { type: "string" },
      history: { type: "string" },
      operator: { type: "string" },
      reason: { type: "string" },
      "confirmed-usd": { type: "string" },
      evidence: { type: "string" },
    },
  });
  const root = resolve(import.meta.dir, "../..");
  if ([!!v.execute, !!v.status, !!v.reconcile, !!v["confirm-billing"]].filter(Boolean).length > 1)
    throw new Error("conflicting-modes");
  if (v["confirm-billing"]) {
    if (!v.history || !v.operator || !v.reason || !v.evidence || v["confirmed-usd"] === undefined)
      throw new Error("billing-fields-required");
    await confirmBilling(
      root,
      v["confirm-billing"],
      v.history,
      v.operator,
      v.reason,
      Number(v["confirmed-usd"]),
      v.evidence,
    );
    console.log("Billing confirmation recorded; reservations retained.");
    return;
  }
  if (v.status) {
    console.log(JSON.stringify(summary(await loadBook(join(root, "i18n/storage"))), null, 2));
    return;
  }
  if (v.reconcile) {
    if (!v.history || !v.operator || !v.reason) throw new Error("reconciliation-fields-required");
    await reconcile(
      root,
      v.reconcile,
      v.history,
      v.operator,
      v.reason,
      v["confirmed-usd"] === undefined ? null : Number(v["confirmed-usd"]),
      v.evidence,
    );
    console.log("Reconciliation recorded; reservation retained.");
    return;
  }
  if (!v.article || !["regular", "contingency"].includes(v.pool))
    throw new Error("article-and-valid-pool-required");
  const pool = v.pool as Pool;
  if (!v.execute) {
    console.log(JSON.stringify(await plan(root, v.article, pool), null, 2));
    return;
  }
  const account = process.env.I18N_OPERATIONS_CF_ACCOUNT_ID,
    token = process.env.I18N_OPERATIONS_CF_API_TOKEN;
  if (!account || !token) throw new Error("credentials-required");
  console.log(
    JSON.stringify(
      await execute(root, v.article, {
        pool,
        authorization: v["authorize-plan"],
        paid: process.env.I18N_OPERATIONS_ALLOW_PAID,
        contingency: v["authorize-contingency"],
        credentials: { account, token },
      }),
    ),
  );
}
