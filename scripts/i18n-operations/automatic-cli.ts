import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { discover } from "./automatic-discovery";
import { loadBook } from "./ledger";
import { financialExposure, authorizeContinuous } from "./automation-policy";
import { runAutomaticCycle } from "./automatic-cycle";
import {
  PrivateGitState,
  verifyPrivateRepository,
  verifyCloudflare,
  verifyModelAccess,
} from "./automatic-state";
import { failure } from "./errors";
async function main() {
  const root = resolve(import.meta.dir, "../.."),
    apply = process.argv.includes("--apply");
  if (!apply) {
    const book = await loadBook(resolve(root, "i18n/storage"));
    console.log(
      JSON.stringify(
        {
          externalEnabled: false,
          candidates: await discover(root),
          retainedExposureUSD:
            [...book.runs.values()].reduce((n, r) => n + financialExposure(r), 0) / 1e9,
          requiresContinuousAuthorization: true,
        },
        null,
        2,
      ),
    );
    return;
  }
  if (process.env.I18N_AUTOMATION_ENABLED !== "true" || process.env.I18N_AUTO_ALLOW_PAID !== "1")
    throw Error("automatic-external-disabled");
  const policyPath = process.env.I18N_AUTO_AUTHORIZATION_FILE,
    privateRepo = process.env.I18N_AUTO_STATE_REPOSITORY,
    stateToken = process.env.I18N_AUTO_STATE_TOKEN,
    checkout = process.env.I18N_AUTO_STATE_CHECKOUT;
  const account = process.env.I18N_OPERATIONS_CF_ACCOUNT_ID,
    token = process.env.I18N_OPERATIONS_CF_API_TOKEN;
  if (!policyPath || !privateRepo || !stateToken || !checkout || !account || !token)
    throw Error("automatic-activation-incomplete");
  const authorization = JSON.parse(await readFile(policyPath, "utf8")),
    auth = authorizeContinuous(authorization);
  await verifyPrivateRepository(privateRepo, stateToken);
  await verifyCloudflare(account, token);
  await verifyModelAccess(account, token);
  const store = new PrivateGitState(resolve(checkout), privateRepo);
  await store.restore(root, auth.policy.historyAnchor);
  const report = await runAutomaticCycle(root, authorization, {
    simulation: false,
    externalEnabled: true,
    credentialsVerified: true,
    credentials: { account, token },
    persist: (directory) => store.persist(directory),
  });
  console.log(
    JSON.stringify({ report, publication: "materialized-only-await-ci-and-deploy" }, null, 2),
  );
}
if (import.meta.main)
  main().catch((e) => {
    console.error(JSON.stringify({ status: "BLOCKED", ...failure(e, "preflight").diagnostic }));
    process.exitCode = 1;
  });
