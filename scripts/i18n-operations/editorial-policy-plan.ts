import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseEditorialFile } from "../generate-content";
import { hash, type Locale } from "../i18n-simulation/pipeline";
import { editorialPolicySchema, policyHash } from "./editorial-policy";
import { publicationCandidate } from "./automatic-publication";
import { revision } from "./run";
/** No provider, credentials, financial ledger, content writes or deployment in planning. */
export async function editorialPlan(root: string, articles: string[], now = new Date()) {
  if (
    !articles.length ||
    new Set(articles).size !== articles.length ||
    articles.some((s) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s))
  )
    throw Error("editorial-invalid-selection");
  const policy = editorialPolicySchema.parse(
    JSON.parse(
      await readFile(join(root, "content/translation-policies/automatic-v1.json"), "utf8"),
    ),
  );
  const codeRevision = await revision(root),
    policyId = policyHash(policy);
  const snapshot: {
    slug: string;
    sourceRevision: string | null;
    error?: string;
    editions: { locale: Locale; raw: string; evidence: unknown }[];
  }[] = [];
  for (const slug of [...articles].sort()) {
    try {
      const source = await readFile(join(root, "content/articles", slug + ".mdx"), "utf8");
      const editions = [];
      for (const locale of ["en", "es"] as const) {
        const raw = await readFile(
          join(root, "content/translations", locale, slug + ".mdx"),
          "utf8",
        );
        const evidence = JSON.parse(
          await readFile(
            join(root, "content/translation-evidence", locale, slug + ".json"),
            "utf8",
          ),
        );
        editions.push({ locale, raw, evidence });
      }
      snapshot.push({ slug, sourceRevision: hash(source), editions });
    } catch (e) {
      snapshot.push({
        slug,
        sourceRevision: null,
        editions: [],
        error:
          (e as NodeJS.ErrnoException).code === "ENOENT"
            ? "editorial-input-or-evidence-missing"
            : "editorial-input-invalid",
      });
    }
  }
  const id = hash(
    JSON.stringify({ policyId, codeRevision, day: now.toISOString().slice(0, 10), snapshot }),
  );
  const results: {
    slug: string;
    state: "READY" | "REVIEW_REQUIRED" | "BLOCK";
    code?: string;
    editions: { locale: Locale; before: string; candidate: string }[];
  }[] = [];
  for (const item of snapshot) {
    const editions = [];
    try {
      if (item.error) throw Error(item.error);
      for (const e of item.editions)
        editions.push({
          locale: e.locale,
          before: e.raw,
          candidate: await publicationCandidate(
            root,
            item.slug,
            e.locale,
            e.raw,
            policyId,
            id,
            now,
            { policy, evidence: e.evidence },
          ),
        });
      results.push({ slug: item.slug, state: "READY", editions });
    } catch (e) {
      const message =
        e instanceof Error && /^[a-z][a-z0-9-]+$/.test(e.message)
          ? e.message
          : "editorial-validation-failed";
      results.push({
        slug: item.slug,
        state: [
          "editorial-scientific-divergence",
          "editorial-structural-divergence",
          "editorial-meaning-contradiction",
          "automatic-attribution-changed",
        ].includes(message)
          ? "BLOCK"
          : "REVIEW_REQUIRED",
        code: message,
        editions: [],
      });
    }
  }
  return {
    id,
    policyId,
    codeRevision,
    generatedAt: now.toISOString(),
    externalEnabled: false,
    results,
  };
}
/** Demonstration artifacts are outside content/ and never enter public routes or indexes. */
export async function demonstrate(root: string, plan: Awaited<ReturnType<typeof editorialPlan>>) {
  const output = join(root, "test-results/i18n-editorial-policy", plan.id);
  await mkdir(output, { recursive: true });
  for (const result of plan.results)
    for (const e of result.editions) {
      const parsed = parseEditorialFile(e.candidate);
      if (parsed.frontmatter.status !== "published") throw Error("editorial-candidate-invalid");
      await writeFile(join(output, result.slug + "." + e.locale + ".mdx"), e.candidate);
    }
  await writeFile(
    join(output, "report.json"),
    JSON.stringify(
      {
        ...plan,
        results: plan.results.map((r) => ({
          slug: r.slug,
          state: r.state,
          code: r.code,
          editions: r.editions.map((e) => ({
            locale: e.locale,
            targetRevision: hash(e.candidate),
          })),
        })),
        productionPublished: false,
        demonstrationOnly: true,
      },
      null,
      2,
    ),
  );
  return output;
}
