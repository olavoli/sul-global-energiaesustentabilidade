import { test, expect } from "bun:test";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compile } from "@mdx-js/mdx";
import remarkFrontmatter from "remark-frontmatter";
import { remarkEditorialSlots } from "../../src/content/remark-editorial-slots";
import {
  loadInput,
  plan,
  protectedEquation,
  experimentPayload,
  runExperiment,
  experimentLimits,
} from "./experiment";
import { batches } from "../i18n-real-pilot/sample";
import { parseEditorialFile } from "../generate-content";
import translations from "./complete-translations.fixture.json";
test("v6 offline estimate preserves synthetic historical baseline and does not inherit approval", async () => {
  const input = await loadInput(process.cwd()),
    estimate = plan(input);
  expect(estimate.calls).toHaveLength(6);
  expect(estimate.totalUSD).toBeCloseTo(0.0412665, 12);
  const historical = 0.087948094;
  expect(historical + estimate.totalUSD).toBeCloseTo(0.129214594, 12);
  expect(0.15 - historical - estimate.totalUSD).toBeCloseTo(0.020785406, 12);
  expect(historical + estimate.totalUSD).toBeGreaterThan(0.1);
  expect(experimentLimits.usd).toBe(0.05);
  const budgetCalls = estimate.calls.map((c) => c.reservedUSD);
  expect(budgetCalls.every((c) => c > 0)).toBe(true);
});
test("hypothetical protected-first regrouping saves calls with same engine, but is NOT activated or model quality evidence", async () => {
  const input = await loadInput(process.cwd()),
    all = [...input.source.segments, ...input.metadata];
  // Analysis fixture only: use the existing batcher; no change to loadInput or live campaign planning.
  const chunks = batches(all.filter((s) => !protectedEquation(s)));
  chunks[0].push(...all.filter(protectedEquation));
  const candidate = { ...input, chunks };
  expect(plan(input).calls).toHaveLength(6);
  expect(plan(candidate).calls).toHaveLength(4);
  expect(plan(candidate).totalUSD).toBeCloseTo(0.028971312, 12);
  expect(
    chunks
      .flat()
      .map((s) => s.id)
      .sort(),
  ).toEqual(all.map((s) => s.id).sort());
  for (const chunk of chunks) {
    const sent = JSON.parse(experimentPayload(chunk, "en").messages[1].content) as {
      id: string;
      text: string;
    }[];
    expect(Buffer.byteLength(JSON.stringify(sent))).toBeLessThanOrEqual(3500);
    expect(sent.some(protectedEquation)).toBe(false);
  }
  const directory = await mkdtemp(join(tmpdir(), "sg-c004-analysis-"));
  let calls = 0;
  try {
    const report = await runExperiment(candidate, directory, {
      execute: true,
      authorized: true,
      auth: { account: "a".repeat(32), token: "synthetic-analysis-only" },
      transport: async (_url, init) => {
        calls++;
        const payload = JSON.parse(String(init.body));
        const locale = payload.messages[0].content.includes("Target language: English")
          ? "en"
          : "es";
        const targets: Record<string, string> = translations[locale];
        const sent = JSON.parse(payload.messages[1].content) as { id: string }[];
        return Response.json({
          success: true,
          result: {
            response: { translations: sent.map((s) => ({ id: s.id, text: targets[s.id] })) },
            usage: { prompt_tokens: 100, completion_tokens: 100 },
          },
        });
      },
    });
    expect(calls).toBe(4);
    expect(report.state).toBe("TRANSLATED_AWAITING_REVIEW");
    expect(report.publishable).toBe(false);
    expect(report.independentReviewPerformed).toBe(false);
    for (const row of report.results) {
      expect(row.decision).toBe("REVIEW_REQUIRED");
      const raw = await readFile(join(directory, `NONPUBLISHABLE-${row.locale}.mdx`), "utf8");
      expect(parseEditorialFile(raw).frontmatter.status).toBe("draft");
      expect(
        String(await compile(raw, { remarkPlugins: [remarkFrontmatter, remarkEditorialSlots] })),
      ).toContain("MDXContent");
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
  expect(plan(await loadInput(process.cwd())).calls).toHaveLength(6);
});
