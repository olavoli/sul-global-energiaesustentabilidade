import { mkdir, cp } from "node:fs/promises";
import { join } from "node:path";
import { temporary, root, slug, credentials } from "./automatic-fixtures.test";
import { fingerprint } from "./policy";
export const quota = {
  read: async () => ({
    accountHash: fingerprint(credentials.account),
    day: new Date().toISOString().slice(0, 10),
    asOf: new Date().toISOString(),
    plan: "workers-free",
    planEvidence: "SYNTHETIC TEST: not real provider evidence",
    enforcement: "cloudflare-429-3036",
    model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    observedNeuronsEstimate: null,
    sharedUsage: "unknown-provider-enforced",
  }),
};
export async function setup(fn: (dir: string) => Promise<void>) {
  await temporary(async (dir) => {
    for (const locale of ["en", "es"]) {
      const path = `content/translations/${locale}/${slug}.mdx`;
      await mkdir(join(dir, path, ".."), { recursive: true });
      await cp(join(root, path), join(dir, path));
    }
    await fn(dir);
  });
}
export function verdicts(pairs: { id: string }[]) {
  return {
    findings: pairs.map((p) => ({
      id: p.id,
      outcome: "equivalent",
      rationale: "SYNTHETIC MOCK verdict, not an actual linguistic evaluation.",
      resolvedSignals: [],
    })),
  };
}
