import { mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { PilotAdapters, credentials, models, promptVersion } from "./adapters";
import { Budget, limits, rates, type Ledger } from "./budget";
import { estimateArticle, loadSample } from "./sample";
import { summarize, project } from "./metrics";
import {
  assemble,
  decide,
  deterministic,
  hash,
  policy,
  prepare,
  type SemanticReport,
} from "../i18n-simulation/pipeline";
import { parseEditorialFile } from "../generate-content";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const directory = join(root, "test-results/i18n-real-cost-pilot");
await mkdir(directory, { recursive: true });
const execute = process.argv.includes("--execute");
if (process.argv.slice(2).some((a) => a !== "--execute")) throw new Error("unsupported-argument");
const articles = await loadSample(root);
const auth = credentials(process.env);
const plan = articles.map((a) => ({
  ...a,
  ...{ estimates: (["en", "es"] as const).map((l) => estimateArticle(a.chunks, l)) },
}));
const totalProjectedUSD = plan.reduce(
  (n, a) => n + a.estimates.reduce((s, e) => s + e.translationUSD + e.reviewUSD, 0),
  0,
);
const limitsPass =
  totalProjectedUSD <= limits.usd &&
  plan.every(
    (a) =>
      a.estimates.reduce((n, e) => n + e.translationUSD + e.reviewUSD, 0) <= limits.articleUSD &&
      a.estimates.reduce((n, e) => n + e.calls, 0) <= limits.callsPerArticle &&
      a.estimates.reduce((n, e) => n + e.inputTokenCeiling, 0) <= limits.inputPerArticle &&
      a.estimates.reduce((n, e) => n + e.outputTokenCeiling, 0) <= limits.outputPerArticle,
  );
const report = {
  runId: randomUUID(),
  createdAt: new Date().toISOString(),
  mode: execute ? "real-requested" : "plan-only",
  automaticPublication: false,
  models,
  promptVersion,
  limits,
  rates,
  pricingConsulted: "2026-10-25",
  credentialsAvailable: !!auth,
  totalProjectedUSD,
  limitsPass,
  state: !limitsPass
    ? "BLOCK_BUDGET"
    : !auth
      ? "NOT_RUN_MISSING_CREDENTIALS"
      : "PREPARED_NOT_EXECUTED",
  results: plan.flatMap((a) =>
    a.estimates.map((estimate) => ({
      article: a.slug,
      sourceRevision: a.sourceRevision,
      complexity: a.complexity,
      publicUrl: a.publicUrl,
      bodyBytes: a.bodyBytes,
      locale: estimate.locale,
      estimated: estimate,
      actual: null as unknown,
      decision: "REVIEW_REQUIRED",
      reasons: ["pilot-not-executed"],
      wouldPublish: false,
    })),
  ),
  billingReconciled: false,
  actualMeanTranslationUSD: null as number | null,
  actualMeanReviewUSD: null as number | null,
  projectionsMeasured: project(null),
  notes: [
    "Local estimates and reservations are not an absolute billing cap.",
    "Null usage/cost means unmeasured, never free.",
    "ART-033 is excluded.",
  ],
};
const saveReport = () =>
  writeFile(
    join(directory, execute ? `execution-${report.runId}.json` : "plan-report.json"),
    JSON.stringify(report, null, 2),
    { mode: 0o600 },
  );
await saveReport();
console.log(
  JSON.stringify({
    mode: report.mode,
    state: report.state,
    credentialsAvailable: !!auth,
    totalProjectedUSD,
    limitsPass,
    automaticPublication: false,
  }),
);
if (!execute) process.exit(0);
if (!limitsPass || !auth || process.env.I18N_PILOT_ALLOW_PAID !== "1")
  throw new Error("pilot-not-authorized-or-not-ready; no provider request sent");
// One persistent campaign and one process. No flag resets the budget or retries a paid call.
const lock = await open(join(directory, "campaign.lock"), "wx", 0o600);
try {
  const ledgerPath = join(directory, "ledger.json");
  let exists = false;
  try {
    await readFile(ledgerPath);
    exists = true;
  } catch (e) {
    if (!(e instanceof Error && "code" in e && e.code === "ENOENT")) throw e;
  }
  if (exists) throw new Error("existing-campaign-reconcile-before-any-new-experiment");
  const ledger: Ledger = { version: "real-pilot-v1", calls: [] };
  const budget = new Budget(ledger, async (value) => {
    await writeFile(join(directory, "ledger.tmp"), JSON.stringify(value, null, 2), { mode: 0o600 });
    await rename(join(directory, "ledger.tmp"), ledgerPath);
  });
  const adapters = new PilotAdapters(auth, budget);
  report.state = "RUNNING";
  await saveReport();
  for (const a of plan) {
    // Public route check uses no credentials; no browser/advertisement execution.
    const publicResponse = await fetch(a.publicUrl, {
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    if (publicResponse.status !== 200) throw new Error("sample-public-route-unavailable");
    await publicResponse.body?.cancel();
    for (const locale of ["en", "es"] as const) {
      const row = report.results.find((r) => r.article === a.slug && r.locale === locale);
      if (!row) throw new Error("missing-report-row");
      const translated: Record<string, string> = {};
      const semantic: SemanticReport[] = [];
      for (let i = 0; i < a.chunks.length; i++) {
        Object.assign(translated, await adapters.translate(a.chunks[i], locale, a.slug, i));
        const partialBody = assemble(
          a.source,
          Object.fromEntries(a.source.segments.map((s) => [s.id, translated[s.id] ?? s.text])),
        );
        const early = deterministic(a.source.body, partialBody, locale).filter(
          (f) => f.severity === "critical",
        );
        if (early.length) {
          row.actual = { deterministic: early };
          row.decision = "BLOCK";
          row.reasons = ["deterministic-divergence-stop"];
          throw new Error("deterministic-divergence-stop");
        }
      }
      const body = assemble(
        a.source,
        Object.fromEntries(a.source.segments.map((s) => [s.id, translated[s.id]])),
      );
      const target = prepare(body);
      for (let i = 0; i < a.chunks.length; i++) {
        semantic.push(
          await adapters.review(a.source, target, a.chunks[i], translated, locale, a.slug, i),
        );
        if (semantic[semantic.length - 1].checks.some((c) => c.result === "contradiction")) {
          row.actual = { semantic };
          row.decision = "BLOCK";
          row.reasons = ["semantic-divergence-stop"];
          throw new Error("semantic-divergence-stop");
        }
      }
      const frontmatter = { ...a.article.frontmatter, cover: { ...a.article.frontmatter.cover } };
      for (const m of a.metadata) {
        const [kind, key] = m.id.split(":");
        if (kind === "cover") Object.assign(frontmatter.cover, { [key]: translated[m.id] });
        else Object.assign(frontmatter, { [key]: translated[m.id] });
      }
      for (const key of [
        "publishedAt",
        "approvedAt",
        "reviewedAt",
        "updatedAt",
        "scheduledAt",
      ] as const)
        delete frontmatter[key];
      const artifact = {
        ...frontmatter,
        slug: `pilot-${locale}-${a.slug}`,
        status: "draft",
        draftStage: "writing",
        featured: false,
        isDemo: true,
        locale,
        translationOf: a.slug,
        sourceRevision: a.sourceRevision,
        translationReview: { status: "pending" },
        canonicalUrl: `/${locale}/${locale === "en" ? "article" : "articulo"}/pilot-${locale}-${a.slug}`,
      };
      const mdx = `---\n${JSON.stringify(artifact, null, 2)}\n---\n${body}`;
      parseEditorialFile(mdx, "non-public-pilot-artifact.mdx");
      const metadataFindings = a.metadata.flatMap((m) =>
        deterministic(
          `Metadata\n\n${m.text}\n\n## Referências\n`,
          `Metadata\n\n${translated[m.id]}\n\n## Referências\n`,
          locale,
        ),
      );
      const bodyChecks = semantic
        .flatMap((s) => s.checks)
        .filter((c) => a.source.body.includes(c.sourceQuote) && body.includes(c.targetQuote));
      const combined = { ...semantic[0], checks: bodyChecks };
      const decision = decide(
        a.source,
        target,
        locale,
        {
          articleId: a.slug,
          synthetic: false,
          category: frontmatter.category,
          contentType: frontmatter.contentType,
          documentaryCaveat: false,
          pendingEvidence: false,
        },
        { id: "cloudflare", modelVersion: models.cloudflare },
        combined,
      );
      if (
        metadataFindings.some((f) => f.severity === "critical") ||
        semantic.some((s) => s.checks.some((c) => c.result === "contradiction"))
      )
        decision.outcome = "BLOCK";
      const calls = ledger.calls.filter((c) => c.article === a.slug && c.locale === locale);
      row.actual = {
        calls,
        summary: summarize(calls),
        translationDurationMs: calls
          .filter((c) => c.stage === "translation")
          .reduce((n, c) => n + (c.durationMs ?? 0), 0),
        reviewDurationMs: calls
          .filter((c) => c.stage === "review")
          .reduce((n, c) => n + (c.durationMs ?? 0), 0),
        deterministic: [...decision.findings, ...metadataFindings],
        semantic,
        usageCalculatedUSD: calls.reduce((n, c) => n + (c.usageCalculatedUSD ?? 0), 0),
        providerReportedCostUSD: null,
        billingReconciled: false,
      };
      row.decision = decision.outcome;
      row.reasons = decision.reasons;
      await writeFile(join(directory, `${locale}-${a.slug}.mdx`), mdx, { mode: 0o600 });
      await saveReport();
      if (decision.outcome === "BLOCK") throw new Error("scientific-or-structural-divergence-stop");
    }
  }
  const total = summarize(ledger.calls);
  report.actualMeanTranslationUSD =
    total.translation.usageCalculatedUSD === null
      ? null
      : total.translation.usageCalculatedUSD / plan.length;
  report.actualMeanReviewUSD =
    total.review.usageCalculatedUSD === null ? null : total.review.usageCalculatedUSD / plan.length;
  report.projectionsMeasured = project(
    report.actualMeanTranslationUSD === null || report.actualMeanReviewUSD === null
      ? null
      : report.actualMeanTranslationUSD + report.actualMeanReviewUSD,
  );
  report.state = "COMPLETED_NOT_PUBLISHABLE";
  await saveReport();
} catch (error) {
  report.state = "STOPPED_RECONCILE_LEDGER";
  try {
    const ledger = JSON.parse(await readFile(join(directory, "ledger.json"), "utf8")) as Ledger;
    for (const row of report.results) {
      const calls = ledger.calls.filter(
        (c) => c.article === row.article && c.locale === row.locale,
      );
      if (calls.length) {
        if (row.reasons.includes("pilot-not-executed"))
          row.reasons = ["pilot-incomplete-reconcile-recorded-usage"];
        row.actual = {
          ...(typeof row.actual === "object" && row.actual !== null ? row.actual : {}),
          calls,
          summary: summarize(calls),
        };
      }
    }
  } catch {
    /* Missing/invalid ledger remains unmeasured; never fabricate consumption. */
  }
  await saveReport();
  console.error(
    JSON.stringify({
      state: report.state,
      reason:
        error instanceof Error && /^[a-z0-9-]+$/.test(error.message)
          ? error.message
          : "pilot-failure",
      automaticPublication: false,
    }),
  );
  process.exitCode = 1;
} finally {
  await lock.close();
  await unlink(join(directory, "campaign.lock"));
}
