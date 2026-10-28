import { readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { runPolicyCycle } from "./policy-cycle";
import {
  PrivateGitState,
  verifyPrivateRepository,
  verifyCloudflare,
  verifyModelAccess,
} from "./automatic-state";
import { cloudflareFreeQuota } from "./free-provider";
/** Activation requires existing private history, explicit Free mode and provider evidence; no paid authorization is used. */
export async function policyCycleMain() {
  if (
    !process.argv.includes("--apply") ||
    process.env.I18N_AUTOMATION_ENABLED !== "true" ||
    process.env.I18N_EXECUTION_MODE !== "free-only" ||
    process.env.I18N_OPERATIONS_ALLOW_PAID !== undefined ||
    process.env.I18N_AUTO_ALLOW_PAID !== undefined
  )
    throw Error("editorial-cycle-disabled");
  const root = resolve(import.meta.dir, "../.."),
    repository = process.env.I18N_AUTO_STATE_REPOSITORY,
    checkout = process.env.I18N_AUTO_STATE_CHECKOUT,
    stateToken = process.env.I18N_AUTO_STATE_TOKEN,
    anchor = process.env.I18N_FREE_HISTORY_ANCHOR;
  const account = process.env.I18N_OPERATIONS_CF_ACCOUNT_ID,
    token = process.env.I18N_OPERATIONS_CF_API_TOKEN,
    file = process.env.I18N_FREE_PLAN_CONFIRMATION_FILE;
  if (
    !repository ||
    !checkout ||
    !stateToken ||
    !anchor ||
    !/^[a-f0-9]{64}$/.test(anchor) ||
    !account ||
    !token ||
    !file
  )
    throw Error("automatic-activation-incomplete");
  await verifyPrivateRepository(repository, stateToken);
  await verifyCloudflare(account, token);
  await verifyModelAccess(account, token);
  const store = new PrivateGitState(resolve(checkout), repository);
  await store.restore(root, anchor);
  const confirmation = JSON.parse(await readFile(file, "utf8"));
  const report = await runPolicyCycle(root, {
    simulation: false,
    externalEnabled: true,
    credentialsVerified: true,
    historyAnchor: anchor,
    credentials: { account, token },
    freeQuota: cloudflareFreeQuota({ account, token }, undefined, confirmation),
    persist: (dir) => store.persist(dir),
  });
  console.log(
    JSON.stringify({ report, publication: "await-required-ci-and-controlled-deploy", paid: false }),
  );
  // Nothing is deployed or merged here; existing workflows run CI before proposing content.
}
