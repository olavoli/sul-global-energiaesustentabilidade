import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  assemble,
  cacheKey,
  verifyAndDecide,
  hash,
  policy,
  prepare,
  syntheticMdx,
  type Locale,
} from "./pipeline";
import { context, FixtureProvider, fixtureSemantic, sourceBody } from "./fixtures";
import { SimulationStore } from "./cache";

// Fixed output under ignored test-results, never content/, generated indices or an arbitrary CLI path.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const output = join(root, "test-results/i18n-simulation");
const store = new SimulationStore(join(output, "cache"));
const runId = randomUUID();
const provider = new FixtureProvider();
const source = prepare(sourceBody);
await mkdir(output, { recursive: true });
const reports = [];
for (const locale of ["en", "es"] as const) {
  const key = cacheKey(sourceBody, locale, provider, "text-leaves-v1");
  const cached = await store.cached(
    key,
    (v) => z.record(z.string(), z.string()).parse(v),
    () => provider.translate(source.segments, locale),
  );
  const translated = assemble(source, cached.value);
  const cases = [
    { name: "valid-fixture", body: translated, expected: "PASS", semantic: true },
    { name: "model-unavailable", body: translated, expected: "REVIEW_REQUIRED", semantic: false },
    {
      name: "number-altered",
      body: translated.replace("21 Mt", "22 Mt"),
      expected: "BLOCK",
      semantic: true,
    },
    {
      name: "citation-removed",
      body: translated.replace("[1]", ""),
      expected: "BLOCK",
      semantic: true,
    },
    {
      name: "negation-inverted",
      body: translated.replace(
        locale === "en" ? "does not prove" : "no demuestra",
        locale === "en" ? "does prove" : "demuestra",
      ),
      expected: "BLOCK",
      semantic: true,
    },
    {
      name: "certainty-increased",
      body: translated.replace(
        locale === "en" ? "The estimate" : "La estimación",
        locale === "en" ? "The fact" : "El hecho",
      ),
      expected: "BLOCK",
      semantic: true,
    },
    {
      name: "reference-fabricated",
      body: translated + "\n[2] Fabricated fixture.\n",
      expected: "BLOCK",
      semantic: true,
    },
    {
      name: "caveat-omitted",
      body: translated.replace(
        locale === "en" ? "documentary caveat" : "salvedad documental",
        "documentation",
      ),
      expected: "BLOCK",
      semantic: true,
    },
  ];
  for (const c of cases) {
    const target = prepare(c.body);
    // Separate synthetic IDs for distinct test scenarios; retries of each scenario stay sticky.
    const decisionKey = hash(
      JSON.stringify([context.articleId, c.name, hash(sourceBody), hash(c.body), locale]),
    );
    const decision = await verifyAndDecide(
      source,
      target,
      locale,
      context,
      provider,
      c.semantic ? { verify: async () => fixtureSemantic(source, target, locale) } : null,
      await store.previous(decisionKey),
    );
    await store.record(decisionKey, decision.outcome);
    if (decision.outcome !== c.expected)
      throw new Error(`Unexpected decision for ${locale}/${c.name}`);
    const translatedFile = `${locale}-${c.name}.mdx`;
    await writeFile(join(output, translatedFile), syntheticMdx(c.body, locale, hash(sourceBody)));
    const log = {
      runId,
      articleId: `${context.articleId}-${c.name}`,
      sourceHash: hash(sourceBody),
      targetHash: hash(c.body),
      locale,
      provider: provider.id,
      modelVersion: provider.modelVersion,
      policyVersion: policy.version,
      policyHash: hash(JSON.stringify(policy)),
      scenario: c.name,
      outcome: decision.outcome,
      reasons: decision.reasons,
      cacheHit: cached.hit,
      wouldPublish: false,
    };
    console.log(JSON.stringify(log));
    reports.push({
      ...log,
      translatedFile,
      comparison: source.segments.map((s, i) => ({
        id: s.id,
        source: s.text,
        target: target.segments[i]?.text,
      })),
      evidence: decision.findings,
      semantic: decision.semantic,
    });
  }
}
const slug = "terras-raras-os-17-elementos-que-movem-a-tecnologia-parte-1";
const original = await readFile(join(root, `content/articles/${slug}.mdx`), "utf8");
const brief = await readFile(join(root, `content/research/${slug}.yml`), "utf8");
if (!brief.includes("pending"))
  throw new Error("ART033 documentary risk needs fresh human investigation; never auto-release");
const art033 = {
  articleId: "ART-033",
  sourceHash: hash(original),
  outcome: "REVIEW_REQUIRED",
  wouldPublish: false,
  reasons: [
    "explicit-exclusion",
    "21-Mt-documentary-caveat",
    "ANM-administrative-records-not-production",
    "resources-reserves-are-distinct",
    "pending-research-factchecks",
  ],
  evidencePath: `content/research/${slug}.yml`,
  semanticModelExecuted: false,
};
const report = {
  runId,
  mode: "offline-synthetic-only",
  policy,
  reports,
  art033,
  consumption: {
    paidApiCalls: 0,
    fixtureProviderCalls: provider.requests,
    actualApiTokens: null,
    actualTotalCost: null,
    explanation:
      "No external inference was called. Codex, CI and compute costs are not measured here; fixture calls are not model usage.",
  },
  estimate: {
    assumedInputTokens: 28000,
    assumedOutputTokens: 10000,
    workersAiIllustrationUSD: 0.030734,
    model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    pricingConsulted: "2026-10-25",
    measured: false,
  },
  nextAction: "Retain pending human review; simulation has no publishing capability",
};
await writeFile(join(output, "report.json"), JSON.stringify(report, null, 2));
await writeFile(join(output, "source.mdx"), sourceBody);
console.log(
  JSON.stringify({ runId, articleId: "ART-033", outcome: art033.outcome, wouldPublish: false }),
);
