import { readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { meaningPlan } from "./meaning";
import { executeMeaning } from "./meaning-execution";
import { cloudflareFreeQuota } from "./free-provider";
import { policyHash } from "./editorial-policy";
import { discover } from "./automatic-discovery";
import { editorialPlan, demonstrate } from "./editorial-policy-plan";
import { installPolicyPlan, rollbackPolicyPlan } from "./editorial-policy-install";
import { failure } from "./errors";
function diagnostic(error: unknown) {
  const d = failure(error, "preflight").diagnostic;
  if (error instanceof Error && /^(?:editorial|meaning)-[a-z-]+$/.test(error.message))
    d.code = error.message;
  return d;
}
/** Default is offline; inference and content materialization are distinct explicit operations. */
export async function main() {
  const args = process.argv.slice(2),
    root = resolve(import.meta.dir, "../..");
  const value = (flag: string) => {
    const i = args.indexOf(flag);
    if (i < 0 || !args[i + 1] || args[i + 1].startsWith("--"))
      throw Error("editorial-missing-argument");
    return args[i + 1];
  };
  if (["--rollback", "--install", "--assess-missing"].filter((f) => args.includes(f)).length > 1)
    throw Error("editorial-conflicting-modes");
  if (args.includes("--execute-free") && !args.includes("--assess-missing"))
    throw Error("editorial-conflicting-modes");
  if (args.includes("--rollback")) {
    console.log(await rollbackPolicyPlan(root, value("--rollback")));
    return;
  }
  if (!args.includes("--articles") && !args.includes("--discover"))
    throw Error("editorial-articles-required");
  const slugs = args.includes("--discover")
    ? (await discover(root)).map((a) => a.slug)
    : value("--articles").split(",");
  if (args.includes("--assess-missing")) {
    policyHash(
      JSON.parse(
        await readFile(join(root, "content/translation-policies/automatic-v1.json"), "utf8"),
      ),
    );
    const summary = [];
    for (const slug of slugs)
      for (const locale of ["en", "es"] as const) {
        try {
          try {
            await readFile(
              join(root, "content/translation-evidence", locale, slug + ".json"),
              "utf8",
            );
            summary.push({ slug, locale, state: "EXISTING_EVIDENCE_AWAIT_VALIDATION" });
            continue;
          } catch (e) {
            if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
          }
          const p = await meaningPlan(root, slug, locale);
          if (!args.includes("--execute-free")) {
            summary.push({
              slug,
              locale,
              state: "OFFLINE_PLAN",
              id: p.id,
              calls: p.batches.length,
              reservedUSD: p.reserved / 1e9,
            });
            continue;
          }
          if (
            process.env.I18N_EXECUTION_MODE !== "free-only" ||
            process.env.I18N_OPERATIONS_ALLOW_PAID !== undefined
          )
            throw Error("meaning-free-only-required");
          const account = process.env.I18N_OPERATIONS_CF_ACCOUNT_ID,
            token = process.env.I18N_OPERATIONS_CF_API_TOKEN,
            file = process.env.I18N_FREE_PLAN_CONFIRMATION_FILE;
          if (!account || !token || !file) throw Error("meaning-activation-incomplete");
          const confirmation = JSON.parse(await readFile(file, "utf8"));
          summary.push({
            slug,
            locale,
            ...(await executeMeaning(root, slug, locale, {
              executionMode: "free-only",
              credentials: { account, token },
              freeQuota: cloudflareFreeQuota({ account, token }, undefined, confirmation),
            })),
          });
        } catch (e) {
          const d = diagnostic(e);
          if (
            d.dispatch !== "not-attempted" ||
            /^(?:provider|free|ledger|reconcile|article-budget|monthly-budget|pool-budget|state-persistence)/.test(
              d.code,
            ) ||
            [
              "meaning-reconcile-before-retry",
              "meaning-free-only-required",
              "meaning-activation-incomplete",
              "meaning-durable-state-required",
              "meaning-checkpoint-invalid",
            ].includes(d.code)
          )
            throw e;
          summary.push({ slug, locale, state: "REVIEW_REQUIRED", code: d.code });
        }
      }
    console.log(
      JSON.stringify(
        {
          mode: "meaning-assessment",
          summary,
          publication: false,
          execution: args.includes("--execute-free") ? "explicit-free-only" : "not-attempted",
        },
        null,
        2,
      ),
    );
    return;
  }
  const p = await editorialPlan(root, slugs),
    ready = p.results.filter((r) => r.state === "READY").length;
  const output = args.includes("--demonstrate") ? await demonstrate(root, p) : undefined;
  const installed =
    args.includes("--install") && ready > 0
      ? await installPolicyPlan(root, p, value("--confirm-plan"))
      : false;
  console.log(
    JSON.stringify(
      {
        status: p.results.every((r) => r.state === "CURRENT")
          ? "CURRENT"
          : ready === p.results.length
            ? "READY"
            : ready
              ? "PARTIAL_READY"
              : "REVIEW_REQUIRED",
        planHash: p.id,
        policyId: p.policyId,
        codeRevision: p.codeRevision,
        results: p.results.map((r) => ({ article: r.slug, state: r.state, code: r.code })),
        output,
        installed,
        inference: "not-attempted",
        deployment: "disabled",
      },
      null,
      2,
    ),
  );
  if (!ready && p.results.some((r) => r.state !== "CURRENT")) process.exitCode = 2;
}
if (import.meta.main)
  main().catch((e) => {
    console.error(
      JSON.stringify({
        status: "BLOCKED",
        ...diagnostic(e),
        publication: false,
        retryAutomatically: false,
      }),
    );
    process.exitCode = 1;
  });
