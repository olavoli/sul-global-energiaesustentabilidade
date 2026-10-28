import { translationFile } from "./translation-file";
import { publishCheck } from "../editorial-operations";
import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { parseEditorialFile } from "../../src/content/editorial-parser";
import { translationSchema } from "../../src/content/translation-schema";
import { discover } from "./automatic-discovery";
import { execute } from "./run";
import { loadBook, durableCheckpoints } from "./ledger";
import { executeMeaning } from "./meaning-execution";
import { editorialPlan } from "./editorial-policy-plan";
import { installPolicyPlan } from "./editorial-policy-install";
import { editorialPolicySchema } from "./editorial-policy";
import { failure } from "./errors";
import { hash, type Locale } from "../i18n-simulation/pipeline";
import type { FreeQuotaSource } from "./free-policy";
import type { Transport } from "../i18n-real-pilot/adapters";
async function existing(root: string, slug: string, locale: Locale) {
  return (await translationFile(root, slug, locale))?.raw ?? null;
}
/** Copy completed free-only drafts without overwriting manually managed editions. */
async function recoverDraft(root: string, slug: string, locale: Locale, sourceRevision: string) {
  const dir = join(root, "i18n/storage"),
    book = await loadBook(dir);
  for (const run of [...book.runs.values()].reverse()) {
    if (run.article !== slug || run.state !== "complete" || run.executionMode !== "free-only")
      continue;
    try {
      const raw = await readFile(join(dir, "review", run.id, locale + ".mdx"), "utf8"),
        f = translationSchema.parse(parseEditorialFile(raw).frontmatter);
      if (
        f.translationOf !== slug ||
        f.sourceRevision !== sourceRevision ||
        f.locale !== locale ||
        f.status !== "draft" ||
        f.translationReview.status !== "pending"
      )
        continue;
      const previous = await translationFile(root, slug, locale),
        old = previous?.raw;
      let staged = raw;
      if (old) {
        const before = translationSchema.parse(parseEditorialFile(old).frontmatter);
        if (before.translationReview.status !== "automatic")
          throw Error("editorial-manual-edition-protected");
        const revised = parseEditorialFile(raw);
        revised.frontmatter.slug = before.slug;
        revised.frontmatter.canonicalUrl = before.canonicalUrl;
        staged = `---
${JSON.stringify(revised.frontmatter, null, 2)}
---
${revised.body}`;
        const backup = join(dir, "editorial-prior", slug, hash(old) + ".mdx");
        await mkdir(join(backup, ".."), { recursive: true });
        try {
          await writeFile(backup, old, { flag: "wx", mode: 0o600 });
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
          if ((await readFile(backup, "utf8")) !== old) throw Error("editorial-backup-conflict");
        }
      }
      await mkdir(join(root, "content/translations", locale), { recursive: true });
      await writeFile(
        join(root, previous?.path ?? `content/translations/${locale}/${slug}.mdx`),
        staged,
        { ...(old ? {} : { flag: "wx" }) },
      );
      return true;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
  }
  return false;
}
export interface PolicyCycleOptions {
  simulation: boolean;
  externalEnabled?: boolean;
  credentialsVerified?: boolean;
  historyAnchor?: string;
  articles?: string[];
  credentials: { account: string; token: string };
  freeQuota: FreeQuotaSource;
  transport?: Transport;
  persist: (directory: string) => Promise<void>;
}
/** Hosted orchestrator: sequential, free-only, reuse before inference, materialize only policy-READY pairs. */
export async function runPolicyCycle(root: string, opts: PolicyCycleOptions) {
  if (
    (!opts.simulation && !opts.externalEnabled) ||
    (opts.simulation && !opts.transport) ||
    process.env.I18N_OPERATIONS_ALLOW_PAID !== undefined
  )
    throw Error("editorial-cycle-disabled");
  editorialPolicySchema.parse(
    JSON.parse(
      await readFile(join(root, "content/translation-policies/automatic-v1.json"), "utf8"),
    ),
  );
  const lock = join(root, ".i18n-private-state/policy-cycle.lock");
  await mkdir(join(lock, ".."), { recursive: true });
  await mkdir(lock);
  try {
    return await durableCheckpoints.run(opts.persist, async () => {
      const initial = await loadBook(join(root, "i18n/storage"));
      if (
        !opts.simulation &&
        (!opts.credentialsVerified ||
          !initial.events.length ||
          !initial.events.some((e) => e.digest === opts.historyAnchor))
      )
        throw Error("automatic-history-anchor-mismatch");
      const found = await discover(root),
        selected = opts.articles ?? found.filter((a) => a.state !== "CURRENT").map((a) => a.slug);
      const report: { article: string; state: string; code?: string }[] = [];
      const ready = [];
      let attempts = 0;
      const preliminary = selected.length ? await editorialPlan(root, selected) : undefined;
      selected.sort(
        (a, b) =>
          Number(preliminary?.results.find((r) => r.slug === b)?.state === "READY") -
          Number(preliminary?.results.find((r) => r.slug === a)?.state === "READY"),
      );
      for (const slug of selected) {
        try {
          if (found.some((a) => a.slug === slug && a.state === "CURRENT")) {
            report.push({ article: slug, state: "CURRENT" });
            continue;
          }
          const source = await readFile(join(root, "content/articles", slug + ".mdx"), "utf8"),
            sourceRevision = hash(source);
          const original = parseEditorialFile(source);
          if (
            publishCheck(original.frontmatter, { officialProduction: true, now: new Date() })
              .blockers.length
          ) {
            report.push({
              article: slug,
              state: "REVIEW_REQUIRED",
              code: "editorial-source-publish-check-blocked",
            });
            continue;
          }
          const missing: Locale[] = [];
          let protectedEdition = false,
            counted = false;
          for (const locale of ["en", "es"] as const) {
            const raw = await existing(root, slug, locale);
            if (raw) {
              const f = translationSchema.parse(parseEditorialFile(raw).frontmatter);
              if (
                f.translationReview.status === "approved" ||
                (f.sourceRevision !== sourceRevision && f.translationReview.status !== "automatic")
              ) {
                protectedEdition = true;
                break;
              }
              if (f.sourceRevision === sourceRevision) continue;
            }
            if (!(await recoverDraft(root, slug, locale, sourceRevision))) missing.push(locale);
          }
          if (protectedEdition) {
            report.push({ article: slug, state: "PROTECTED" });
            continue;
          }
          if (missing.length) {
            if (attempts >= 3) {
              report.push({ article: slug, state: "PENDING" });
              continue;
            }
            attempts++;
            counted = true;
            await execute(root, slug, {
              executionMode: "free-only",
              credentials: opts.credentials,
              freeQuota: opts.freeQuota,
              transport: opts.transport,
              locales: missing,
            });
            for (const locale of missing)
              if (!(await recoverDraft(root, slug, locale, sourceRevision)))
                throw Error("editorial-draft-recovery-failed");
          }
          let pending = false;
          for (const locale of ["en", "es"] as const) {
            try {
              await readFile(
                join(root, "content/translation-evidence", locale, slug + ".json"),
                "utf8",
              );
            } catch (e) {
              if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
              if (!counted) {
                if (attempts >= 3) {
                  pending = true;
                  break;
                }
                attempts++;
                counted = true;
              }
              const result = await executeMeaning(root, slug, locale, {
                executionMode: "free-only",
                credentials: opts.credentials,
                freeQuota: opts.freeQuota,
                transport: opts.transport,
                persist: opts.persist,
              });
              if (result.state !== "EVIDENCE_READY") pending = true;
            }
          }
          if (pending) {
            report.push({ article: slug, state: "ASSESSMENT_PENDING" });
            continue;
          }
          const plan = await editorialPlan(root, [slug]);
          if (plan.results[0].state === "READY") ready.push(slug);
          else
            report.push({
              article: slug,
              state: plan.results[0].state,
              code: plan.results[0].code,
            });
        } catch (e) {
          const d = failure(e, "preflight").diagnostic;
          if (d.code === "article-budget-exceeded" && d.dispatch === "not-attempted") {
            report.push({ article: slug, state: "BLOCKED_BUDGET", code: d.code });
            continue;
          }
          if (d.code === "free-quota-exhausted" && d.dispatch === "not-attempted") {
            report.push({ article: slug, state: "WAITING_QUOTA", code: d.code });
            break;
          }
          if (
            d.dispatch !== "not-attempted" ||
            /^(?:provider|free|ledger|reconcile|monthly-budget|pool-budget|state-persistence)/.test(
              d.code,
            ) ||
            d.failureRecordCode ||
            ["invalid-credentials", "credentials-required"].includes(d.code) ||
            (e instanceof Error && /^(?:meaning-reconcile|meaning-checkpoint)/.test(e.message))
          )
            throw e;
          report.push({ article: slug, state: "REVIEW_REQUIRED", code: d.code });
        }
      }
      if (ready.length) {
        const plan = await editorialPlan(root, ready);
        await installPolicyPlan(root, plan, plan.id);
        await opts.persist(join(root, "i18n/storage"));
        report.push(
          ...ready.map((article) => ({
            article,
            state: opts.simulation ? "SIMULATED_PUBLICATION" : "MATERIALIZED_AWAIT_CI",
          })),
        );
      }
      const dir = join(root, "i18n/storage/editorial-reports");
      await mkdir(dir, { recursive: true });
      await writeFile(
        join(dir, randomUUID() + ".json"),
        JSON.stringify({ simulation: opts.simulation, report }),
        { flag: "wx", mode: 0o600 },
      );
      await opts.persist(join(root, "i18n/storage"));
      return report;
    });
  } finally {
    await rm(lock, { recursive: true });
  }
}
