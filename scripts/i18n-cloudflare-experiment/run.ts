import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cloudflareCredentials, loadInput } from "./experiment";
import {
  campaignPlan,
  executeCampaign,
  reconcileCampaign,
  proposedCampaignPlan,
  approveBudget,
  verifyBudgetApproval,
} from "./campaigns";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const directory = join(root, "test-results/i18n-cloudflare-experiment");
const args = process.argv.slice(2);
const values = new Map<string, string>();
for (let i = 0; i < args.length; i++) {
  const key = args[i];
  if (
    ![
      "--campaign",
      "--history",
      "--reconcile",
      "--reason",
      "--execute",
      "--proposed-limit",
      "--approve-budget",
      "--verify-budget",
      "--proposal",
      "--limit",
      "--approved-by",
    ].includes(key) ||
    values.has(key)
  )
    throw new Error("unsupported-argument");
  if (["--execute", "--approve-budget", "--verify-budget"].includes(key)) values.set(key, "1");
  else {
    const value = args[++i];
    if (!value || value.startsWith("--")) throw new Error("missing-argument-value");
    values.set(key, value);
  }
}
if (
  values.has("--proposed-limit") &&
  (values.has("--execute") ||
    values.has("--reconcile") ||
    values.has("--reason") ||
    values.has("--history"))
)
  throw new Error("proposal-is-offline-only");
const budgetMode = values.has("--approve-budget") || values.has("--verify-budget");
if (
  budgetMode &&
  (values.has("--execute") ||
    values.has("--reconcile") ||
    values.has("--proposed-limit") ||
    (values.has("--approve-budget") && values.has("--verify-budget")))
)
  throw new Error("budget-approval-is-offline-only");
if (
  !values.has("--approve-budget") &&
  ["--proposal", "--limit", "--approved-by"].some((key) => values.has(key))
)
  throw new Error("incompatible-arguments");
const input = await loadInput(root);
if (budgetMode) {
  const campaign = values.get("--campaign") ?? "campaign-003";
  if (values.has("--approve-budget"))
    console.log(
      JSON.stringify(
        await approveBudget(directory, input, {
          campaign,
          historyDigest: values.get("--history") ?? "",
          proposalHash: values.get("--proposal") ?? "",
          limitUSD: Number(values.get("--limit")),
          approvedBy: values.get("--approved-by") ?? "",
          reason: values.get("--reason") ?? "",
        }),
      ),
    );
  else
    console.log(
      JSON.stringify({
        campaign,
        approval: await verifyBudgetApproval(directory, input, campaign),
        paidExecutionAuthorized: false,
      }),
    );
  process.exit(0);
}
if (values.has("--reconcile")) {
  if (values.has("--execute") || values.has("--campaign"))
    throw new Error("incompatible-arguments");
  console.log(
    JSON.stringify(
      await reconcileCampaign(
        directory,
        input,
        values.get("--reconcile") ?? "",
        values.get("--history") ?? "",
        values.get("--reason") ?? "",
      ),
    ),
  );
} else {
  const campaign = values.get("--campaign") ?? "campaign-002";
  if (values.has("--reason")) throw new Error("incompatible-arguments");
  if (values.has("--execute")) {
    const result = await executeCampaign(
      directory,
      input,
      campaign,
      values.get("--history") ?? "",
      {
        execute: true,
        authorized: process.env.I18N_CF_EXPERIMENT_ALLOW_PAID === "1",
        auth: cloudflareCredentials(process.env),
      },
    );
    console.log(JSON.stringify(result));
    if (result.report.state !== "TRANSLATED_AWAITING_REVIEW") process.exitCode = 1;
  } else
    console.log(
      JSON.stringify(
        values.has("--proposed-limit")
          ? await proposedCampaignPlan(
              directory,
              input,
              campaign,
              Number(values.get("--proposed-limit")),
            )
          : await campaignPlan(directory, input, campaign),
        null,
        2,
      ),
    );
}
