export type Stage =
  | "preflight"
  | "source"
  | "reserve"
  | "dispatch-record"
  | "request"
  | "usage-record"
  | "decode"
  | "mdx"
  | "write"
  | "complete-record";
export type Dispatch = "not-attempted" | "attempted-unconfirmed" | "response-received";
const freeCodes = [
  "free-plan-confirmation-required",
  "free-analytics-auth-rejected",
  "free-provider-rate-limited",
  "free-model-requires-paid",
  "translation-locales-invalid",
  "free-quota-unverifiable",
  "free-quota-stale",
  "free-quota-exhausted",
  "free-account-mismatch",
  "free-reservation-invalid",
  "free-quota-source-required",
  "free-paid-mode-conflict",
  "free-mode-mismatch",
  "free-dispatch-unreserved",
  "free-usage-unverifiable",
  "free-analytics-unavailable",
  "execution-mode-invalid",
];
const systemCodes = new Set([
  "EACCES",
  "EPERM",
  "ENOSPC",
  "EROFS",
  "EIO",
  "ENOENT",
  "EEXIST",
  "EMFILE",
  "ECONNRESET",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "ERR_INVALID_CHAR",
]);
const sourceAliases: Record<string, string> = {
  "Bibliography heading required": "source-bibliography-heading-missing",
  "Unsupported translatable attribute": "source-mdx-attribute-unsupported",
  "segment-too-long-review-required": "source-segment-too-large",
};
const known = new Set([
  "automatic-activation-incomplete",
  "automatic-attribution-changed",
  "automatic-credentials-unverified",
  "automatic-history-anchor-mismatch",
  "automatic-invalid-reserve",
  "automatic-local-state-exists",
  "automatic-mock-transport-required",
  "automatic-model-unverified",
  "automatic-pending-conflict",
  "automatic-private-state-required",
  "automatic-private-state-unverified",
  "automatic-scientific-token-divergence",

  "automatic-external-disabled",
  "automatic-durable-history-required",
  "automatic-authorization-expired",
  "automatic-pricing-stale",
  "automatic-attempt-limit",
  "automatic-uncertain-run-quarantined",
  "automatic-content-quarantined",
  "automatic-publish-check-blocked",
  "automatic-attestation-stale",
  "automatic-source-stale",
  "automatic-human-edition-protected",
  "state-persistence-failed",
  "batch-id-invalid",
  "batch-selection-required",
  "batch-id-required",
  "batch-command-invalid",
  "batch-cancel-fields-required",
  "batch-plan-invalid",
  "batch-run-duplicate",
  "batch-no-unused-reservations",
  "batch-cancel-invalid",
  "batch-start-invalid",
  "batch-cost-invalid",
  "batch-policy-stale",
  "batch-duplicate-article",
  "batch-reservation-missing",
  "invalid-reservation",
  "empty-reservation",
  "unknown-run",
  "duplicate-or-closed-call",
  "invalid-usage",
  "closed-run",
  "invalid-reconciliation",
  "billing-evidence-required",
  "invalid-billing-confirmation",
  "invalid-money",
  "input-limit",

  "batch-unknown-billing",
  "batch-plan-stale",
  "batch-source-stale",
  "batch-history-changed",
  "batch-authorization-required",
  "batch-already-started-use-resume",
  "batch-not-started",
  "batch-dispatched-run-not-resumable",
  "batch-plan-integrity",
  "batch-budget-exceeded",
  "batch-plan-invalid",
  "execution-reservation-invalid",
  "batch-invalid-step-limit",
  "batch-duplicate-or-empty-selection",
  "credentials-required",
  "invalid-credentials",
  "explicit-financial-authorization-required",
  "contingency-authorization-required",
  "reconcile-before-retry",
  "article-budget-exceeded",
  "monthly-budget-exceeded",
  "pool-budget-exceeded",
  "ledger-integrity",
  "ledger-head-mismatch",
  "missing-ledger",
  "source-changed",
  "plan-became-stale",
  "incomplete-response",
  "translation-json-invalid",
  "translation-response-type-invalid",
  "translation-incomplete-or-ids-invalid",
  "incomplete-translation",
  "untranslated-segment",
  "structural-divergence",
  "usage-exceeds-reservation",
  "empty-linguistic-core",
  "duplicate-id",
  "invalid-slug",
  "source-not-public",
  "stale-history",
  "conflicting-modes",
  "article-and-valid-pool-required",
  "reconciliation-fields-required",
  "billing-fields-required",
]);
export interface Diagnostic {
  code: string;
  stage: Stage;
  dispatch: Dispatch;
  billingStatus: "unknown" | "unconfirmed";
  httpStatus?: number;
  providerCode?: number;
  systemCode?: string;
  segment?: string;
  failureRecordCode?: string;
  article?: string;
}
export class OperationError extends Error {
  constructor(public readonly diagnostic: Diagnostic) {
    super(diagnostic.code);
    this.name = "OperationError";
  }
}
export function failure(
  error: unknown,
  stage: Stage,
  dispatch: Dispatch = "not-attempted",
): OperationError {
  if (error instanceof OperationError) return error;
  const e =
    error && typeof error === "object"
      ? (error as { message?: unknown; name?: unknown; code?: unknown; cause?: { code?: unknown } })
      : {};
  const message = typeof e.message === "string" ? e.message : "";
  const rawCode = e.code ?? e.cause?.code;
  const systemCode = typeof rawCode === "string" && systemCodes.has(rawCode) ? rawCode : undefined;
  let code =
    stage === "source" && Object.hasOwn(sourceAliases, message)
      ? sourceAliases[message]
      : known.has(message) || freeCodes.includes(message)
        ? message
        : stage === "request"
          ? "provider-network-error"
          : stage === "source"
            ? "source-validation-failed"
            : stage === "mdx"
              ? "mdx-validation-failed"
              : stage === "decode"
                ? "translation-validation-failed"
                : "local-operation-failed";
  if (e.name === "TimeoutError" || e.name === "AbortError") code = "provider-timeout";
  const segment = /^deterministic-divergence:(s\d+|meta:[a-zA-Z]+|cover:(alt|caption))$/.exec(
    message,
  )?.[1];
  if (segment) code = "deterministic-divergence";
  if (
    systemCode &&
    ["EACCES", "EPERM", "ENOSPC", "EROFS", "EIO", "ENOENT", "EEXIST", "EMFILE"].includes(systemCode)
  )
    code =
      systemCode === "EEXIST" && stage === "preflight"
        ? "execution-lock-or-pending-exists"
        : "local-filesystem-error";
  if (stage === "source" && systemCode === "ENOENT") code = "source-not-found";
  return new OperationError({
    code,
    stage,
    dispatch,
    billingStatus: dispatch === "not-attempted" ? "unconfirmed" : "unknown",
    ...(systemCode ? { systemCode } : {}),
    ...(segment ? { segment } : {}),
  });
}
export async function guard<T>(stage: Stage, dispatch: Dispatch, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    throw failure(e, stage, dispatch);
  }
}
export function providerError(
  code: string,
  dispatch: Dispatch,
  httpStatus?: number,
  providerCode?: number,
) {
  return new OperationError({
    code,
    stage: "request",
    dispatch,
    billingStatus: dispatch === "not-attempted" ? "unconfirmed" : "unknown",
    ...(httpStatus === undefined ? {} : { httpStatus }),
    ...(providerCode === undefined ? {} : { providerCode }),
  });
}
