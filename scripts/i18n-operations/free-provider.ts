import { z } from "zod";
import { fingerprint } from "./policy";
import { models, type Transport } from "../i18n-real-pilot/adapters";
import type { FreeQuotaSource } from "./free-policy";
export const freeConfirmationSchema = z
  .object({
    version: z.literal("owner-free-plan-v1"),
    accountHash: z.string().regex(/^[a-f0-9]{64}$/),
    plan: z.literal("workers-free"),
    evidence: z.string().min(10),
    recordedAt: z.iso.datetime(),
  })
  .strict();
/** Owner-attested Free plan + provider hard-stop, never a claim of exact shared usage. */
export function cloudflareFreeQuota(
  credentials: { account: string; token: string },
  transport: Transport = fetch,
  confirmation?: unknown,
): FreeQuotaSource {
  return {
    async read() {
      const proof = freeConfirmationSchema.safeParse(confirmation),
        now = new Date();
      if (
        !proof.success ||
        proof.data.accountHash !== fingerprint(credentials.account) ||
        now.getTime() - new Date(proof.data.recordedAt).getTime() < 0 ||
        now.getTime() - new Date(proof.data.recordedAt).getTime() > 86400000
      )
        throw Error("free-plan-confirmation-required");
      const day = now.toISOString().slice(0, 10);
      const query = `query { viewer { accounts(filter: {accountTag: ${JSON.stringify(credentials.account)}}) {
      aiInferenceAdaptiveGroups(limit: 100, filter: {datetime_geq: "${day}T00:00:00Z",
      datetime_lt: "${now.toISOString()}"}) { dimensions {modelId} sum {totalInputTokens totalOutputTokens} } } } }`;
      let observed: number | null = null;
      try {
        const r = await transport("https://api.cloudflare.com/client/v4/graphql", {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(25000),
          headers: {
            Authorization: `Bearer ${credentials.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
        });
        if (r.status === 401 || r.status === 403) throw Error("free-analytics-auth-rejected");
        if (r.ok) {
          const data = z
            .object({
              data: z.object({
                viewer: z.object({
                  accounts: z.array(
                    z.object({
                      aiInferenceAdaptiveGroups: z.array(
                        z.object({
                          dimensions: z.object({ modelId: z.string() }),
                          sum: z.object({
                            totalInputTokens: z.number().nonnegative(),
                            totalOutputTokens: z.number().nonnegative(),
                          }),
                        }),
                      ),
                    }),
                  ),
                }),
              }),
            })
            .safeParse(await r.json());
          const rows = data.success
            ? data.data.data.viewer.accounts.flatMap((x) => x.aiInferenceAdaptiveGroups)
            : null;
          if (rows && rows.length && rows.every((x) => x.dimensions.modelId === models.cloudflare))
            observed = rows.reduce(
              (n, x) =>
                n + (x.sum.totalInputTokens * 26668 + x.sum.totalOutputTokens * 204805) / 1e6,
              0,
            );
        }
      } catch (e) {
        if (e instanceof Error && e.message === "free-analytics-auth-rejected") throw e;
      }
      return {
        accountHash: proof.data.accountHash,
        day,
        asOf: new Date().toISOString(),
        plan: "workers-free",
        planEvidence: proof.data.evidence,
        enforcement: "cloudflare-429-3036",
        model: models.cloudflare,
        observedNeuronsEstimate: observed,
        sharedUsage: "unknown-provider-enforced",
      };
    },
  };
}
