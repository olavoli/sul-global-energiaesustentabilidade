import { mkdtemp, mkdir, cp, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runAutomaticCycle } from "./automatic-cycle";
import { discover } from "./automatic-discovery";
import { loadBook, append, replay } from "./ledger";
import {
  financialExposure,
  continuousBudget,
  maximumCallReserve,
  type AutomaticPolicy,
} from "./automation-policy";
import { validateAutomaticRecord } from "./automatic-attestation";
import { parseEditorialFile } from "../generate-content";
import { translationSchema, translationReviewAccepted } from "../../src/content/translation-schema";
import fixture from "../i18n-cloudflare-experiment/complete-translations.fixture.json";
import type { Transport } from "../i18n-real-pilot/adapters";
import { verifyPrivateRepository, verifyCloudflare } from "./automatic-state";
export const root = process.cwd(),
  slug = "o-que-e-potencia",
  credentials = { account: "a".repeat(32), token: "SYNTHETIC-NOT-REAL" };
export const policy = (anchor = "0".repeat(64)): AutomaticPolicy => ({
  version: "continuous-v1",
  historyAnchor: anchor,
  enabled: true,
  authorizedBy: "SYNTHETIC TEST AUTHORIZATION",
  validUntil: "2099-01-01T00:00:00Z",
  monthlyNanoUSD: 10_000_000_000,
  regularNanoUSD: 8_000_000_000,
  contingencyNanoUSD: 2_000_000_000,
  articleNanoUSD: 150_000_000,
  externalMonthlyReserveNanoUSD: 0,
  maxAttempts: 2,
  unknownBilling: "retain-and-cover-worst-case",
  exclusiveProviderBudget: true,
  providerBudgetEvidence: "SYNTHETIC PROVIDER LIMIT EVIDENCE",
  model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  pricing: { input: 0.293, output: 2.253 },
  maxInputTokens: 24000,
  maxOutputTokens: 2500,
});
export async function temporary(fn: (dir: string) => Promise<void>) {
  const dir = await mkdtemp(join(tmpdir(), "sg-auto-"));
  try {
    for (const path of [
      "scripts/i18n-operations",
      "scripts/i18n-simulation/pipeline.ts",
      "scripts/i18n-real-pilot/adapters.ts",
      "scripts/i18n-real-pilot/budget.ts",
      "scripts/i18n-real-pilot/sample.ts",
      "scripts/i18n-cloudflare-experiment/experiment.ts",
      "scripts/generate-content.ts",
      "src/content/schema.ts",
      "src/content/translation-schema.ts",
      "src/content/remark-editorial-slots.ts",
      "bun.lock",
      "package.json",
      "content/articles/o-que-e-potencia.mdx",
    ]) {
      await mkdir(join(dir, path, ".."), { recursive: true });
      await cp(join(root, path), join(dir, path), { recursive: true });
    }
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
export function mock(transportOverride?: (count: number) => Response | undefined) {
  let calls = 0;
  const transport: Transport = async (_url, init) => {
    calls++;
    const override = transportOverride?.(calls);
    if (override) return override;
    const payload = JSON.parse(String(init.body));
    const locale = payload.messages[0].content.includes("Target language: English") ? "en" : "es";
    const leaves = JSON.parse(payload.messages[1].content) as { id: string }[];
    return Response.json({
      success: true,
      result: {
        response: {
          translations: leaves.map((s) => ({
            id: s.id,
            text: fixture[locale][s.id as keyof typeof fixture.en],
          })),
        },
        usage: { prompt_tokens: 100, completion_tokens: 100, neurons: 1 },
      },
    });
  };
  return { transport, count: () => calls };
}
export const deps = (transport: Transport) => ({
  simulation: true,
  credentials,
  transport,
  persist: async () => {},
});
