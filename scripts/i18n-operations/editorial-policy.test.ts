import { test, expect } from "bun:test";
import { cp, readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { join } from "node:path";
import { temporary, root, slug } from "./automatic-fixtures.test";
import { editorialPlan, demonstrate } from "./editorial-policy-plan";
import { installPolicyPlan, rollbackPolicyPlan } from "./editorial-policy-install";
import {
  bodyRevision,
  evaluatePolicy,
  meaningMetadata,
  editorialPolicySchema,
  policyHash,
} from "./editorial-policy";
import { verifyPolicyRecord } from "./editorial-policy-record";
import { parseEditorialFile } from "../../src/content/editorial-parser";
import { hash } from "../i18n-simulation/pipeline";
import { translationSchema } from "../../src/content/translation-schema";
import { generateTranslations } from "../generate-translations";
const now = new Date("2026-10-28T12:00:00Z");
const rawSource = await readFile(join(root, "content/articles", slug + ".mdx"), "utf8");
const pt = parseEditorialFile(rawSource);
const policy = JSON.parse(
  await readFile(join(root, "content/translation-policies/automatic-v1.json"), "utf8"),
);
async function setup(fn: (dir: string) => Promise<void>) {
  await temporary(async (dir) => {
    for (const path of [
      "content/translation-policies",
      "content/translation-evidence",
      "content/translations/en/o-que-e-potencia.mdx",
      "content/translations/es/o-que-e-potencia.mdx",
    ]) {
      await mkdir(join(dir, path, ".."), { recursive: true });
      await cp(join(root, path), join(dir, path), { recursive: true });
    }
    await fn(dir);
  });
}
for (const locale of ["en", "es"] as const) {
  const raw = await readFile(join(root, "content/translations", locale, slug + ".mdx"), "utf8");
  const target = parseEditorialFile(raw);
  const evidence = JSON.parse(
    await readFile(join(root, "content/translation-evidence", locale, slug + ".json"), "utf8"),
  );
  const metadata = {
    source: meaningMetadata(pt.frontmatter),
    target: meaningMetadata(target.frontmatter),
  };
  test(`${locale}: real complete quote pairs and metadata pass without pretending human review`, () => {
    expect(
      evaluatePolicy(pt.body, target.body, locale, hash(rawSource), policy, evidence, metadata)
        .meaningRevision,
    ).toHaveLength(64);
    expect(evidence.humanReview).toBe(false);
    expect(evidence.certification).toBe(false);
  });
  for (const kind of [
    "missing",
    "duplicate",
    "uncertain",
    "contradiction",
    "ungrounded",
    "stale",
    "metadata",
  ] as const)
    test(`${locale}: rejects ${kind} meaning evidence`, () => {
      const e = structuredClone(evidence);
      if (kind === "missing") e.findings.pop();
      if (kind === "duplicate") e.findings[1] = e.findings[0];
      if (kind === "uncertain" || kind === "contradiction") e.findings[0].outcome = kind;
      if (kind === "ungrounded") e.findings[0].targetQuote = "Fabricated quote, not target text";
      if (kind === "stale") e.sourceRevision = "0".repeat(64);
      if (kind === "metadata") e.findings.at(-1).targetQuote = "Altered image meaning";
      expect(() =>
        evaluatePolicy(pt.body, target.body, locale, hash(rawSource), policy, e, metadata),
      ).toThrow();
    });
  test(`${locale}: critical numeric and formula divergence never accepted by a meaning report`, () => {
    for (const [from, to] of [
      ["10 segundos", "10 minutos"],
      ["1 W = 1 J/s", "1 W = 2 J/s"],
    ]) {
      const body = target.body.replace(
        locale === "en" && from === "10 segundos" ? "10 seconds" : from,
        locale === "en" && to === "10 minutos" ? "10 minutes" : to,
      );
      const e = { ...evidence, targetBodyRevision: bodyRevision(body) };
      expect(() =>
        evaluatePolicy(pt.body, body, locale, hash(rawSource), policy, e, metadata),
      ).toThrow();
    }
  });
}
test("editorial policy never authorizes paid execution or masquerades as a human", () => {
  expect(() => editorialPolicySchema.parse({ ...policy, executionMode: "paid" })).toThrow();
  expect(() => editorialPolicySchema.parse({ ...policy, continuousActivation: true })).toThrow();
  expect(() => editorialPolicySchema.parse({ ...policy, humanReview: "completed" })).toThrow();
});
test("batch is deterministic; unresolved article is isolated without blocking valid editions", () =>
  setup(async (dir) => {
    const a = await editorialPlan(dir, [slug, "missing-article"], now),
      b = await editorialPlan(dir, ["missing-article", slug], now);
    expect(a.id).toBe(b.id);
    expect(a.results.find((r) => r.slug === slug)?.state).toBe("READY");
    expect(a.results.find((r) => r.slug === "missing-article")?.code).toBe(
      "editorial-input-or-evidence-missing",
    );
  }));
test("end-to-end: candidates, build validation, local installation, idempotence and exact rollback", () =>
  setup(async (dir) => {
    const plan = await editorialPlan(dir, [slug], now);
    expect(plan.results[0].state).toBe("READY");
    const original = await readFile(join(dir, "content/translations/en", slug + ".mdx"), "utf8");
    const path = await demonstrate(dir, plan);
    expect(path).toContain("test-results/");
    expect(await readFile(join(dir, "content/translations/en", slug + ".mdx"), "utf8")).toBe(
      original,
    );
    for (const e of plan.results[0].editions) {
      const f = translationSchema.parse(parseEditorialFile(e.candidate).frontmatter);
      expect(f.translationReview.status).toBe("automatic");
      expect(f.translationReview.reviewer).toBeUndefined();
      expect(f.translationReview.reviewedAt).toBeUndefined();
      expect(f.aiDisclosure).not.toContain("review is pending");
      expect(f.translationReview.automation?.validator).toBe("operations-editorial-policy-v1");
      expect(await verifyPolicyRecord(dir, e.candidate)).toBeDefined();
    }
    expect(await installPolicyPlan(dir, plan, plan.id)).toBe("APPLIED_LOCALLY_AWAIT_CI");
    expect(await installPolicyPlan(dir, plan, plan.id)).toBe("ALREADY_APPLIED");
    const sourcePath = join(dir, "content/articles", slug + ".mdx");
    const source = parseEditorialFile(rawSource, sourcePath);
    await generateTranslations([source], parseEditorialFile, false, dir);
    expect(await readFile(join(dir, "src/content/generated/translations.ts"), "utf8")).toContain(
      "operations-editorial-policy-v1",
    );
    expect(await rollbackPolicyPlan(dir, plan.id)).toContain("ROLLED_BACK");
    expect(await readFile(join(dir, "content/translations/en", slug + ".mdx"), "utf8")).toBe(
      original,
    );
    expect(await readFile(sourcePath, "utf8")).toBe(rawSource);
  }));
test("authorization, stale plans and forged candidate payloads are rejected", () =>
  setup(async (dir) => {
    const plan = await editorialPlan(dir, [slug], now);
    await expect(installPolicyPlan(dir, plan, "0".repeat(64))).rejects.toThrow(
      "editorial-plan-not-authorized",
    );
    const forged = structuredClone(plan);
    forged.results[0].editions[0].candidate += "\nInjected";
    await expect(installPolicyPlan(dir, forged, plan.id)).rejects.toThrow("editorial-plan-stale");
    await writeFile(
      join(dir, "content/translations/en", slug + ".mdx"),
      plan.results[0].editions[0].before + "\n",
    );
    await expect(installPolicyPlan(dir, plan, plan.id)).rejects.toThrow("editorial-plan-stale");
  }));
test("concurrent materializations fail closed and rollback never overwrites unrelated edits", () =>
  setup(async (dir) => {
    const plan = await editorialPlan(dir, [slug], now);
    const results = await Promise.allSettled([
      installPolicyPlan(dir, plan, plan.id),
      installPolicyPlan(dir, plan, plan.id),
    ]);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    const path = join(dir, "content/translations/en", slug + ".mdx");
    await writeFile(path, (await readFile(path, "utf8")) + "\nSubsequent edit");
    await expect(rollbackPolicyPlan(dir, plan.id)).rejects.toThrow("editorial-rollback-conflict");
    expect(await readFile(path, "utf8")).toContain("Subsequent edit");
  }));
test("policy changes invalidate accepted attestations; pending/manual gates remain", () =>
  setup(async (dir) => {
    const plan = await editorialPlan(dir, [slug], now),
      candidate = plan.results[0].editions[0].candidate;
    const p = {
      ...policy,
      authorizationRecord: "Changed scope requires a new policy-bound decision.",
    };
    expect(policyHash(p)).not.toBe(policyHash(policy));
    await writeFile(join(dir, "content/translation-policies/automatic-v1.json"), JSON.stringify(p));
    await expect(verifyPolicyRecord(dir, candidate)).rejects.toThrow(
      "editorial-policy-attestation-stale",
    );
    const manual = parseEditorialFile(plan.results[0].editions[0].before).frontmatter;
    expect(() => translationSchema.parse({ ...manual, status: "approved" })).toThrow();
  }));

test("a publication policy never promotes an unapproved or unpublished Portuguese original", () =>
  setup(async (dir) => {
    const sourcePath = join(dir, "content/articles", slug + ".mdx");
    await writeFile(sourcePath, rawSource.replace("status: published", "status: draft"));
    const plan = await editorialPlan(dir, [slug], now);
    expect(plan.results[0].state).not.toBe("READY");
    expect(await readFile(sourcePath, "utf8")).toContain("status: draft");
  }));
test("tampered rollback backup is rejected without modifying content", () =>
  setup(async (dir) => {
    const plan = await editorialPlan(dir, [slug], now);
    await installPolicyPlan(dir, plan, plan.id);
    const file = join(dir, "i18n/storage/editorial", plan.id + ".json");
    const j = JSON.parse(await readFile(file, "utf8"));
    j.entries[0].before = "Tampered backup";
    await writeFile(file, JSON.stringify(j));
    const path = join(dir, "content/translations/en", slug + ".mdx"),
      before = await readFile(path, "utf8");
    await expect(rollbackPolicyPlan(dir, plan.id)).rejects.toThrow("editorial-journal-integrity");
    expect(await readFile(path, "utf8")).toBe(before);
  }));

test("selected production policy rejects downgrade to the legacy technical attestation", () =>
  setup(async (dir) => {
    const plan = await editorialPlan(dir, [slug], now),
      parsed = parseEditorialFile(plan.results[0].editions[0].candidate);
    const f = translationSchema.parse(parsed.frontmatter);
    if (!f.translationReview.automation) throw Error("fixture attestation missing");
    f.translationReview.automation.validator = "operations-technical-v1";
    delete f.translationReview.automation.meaningRevision;
    f.translationReview.automation.checks = [
      "mdx",
      "numbers",
      "formulas",
      "links",
      "references",
      "metadata",
    ];
    await expect(
      verifyPolicyRecord(dir, `---\n${JSON.stringify(f)}\n---\n${parsed.body}`),
    ).rejects.toThrow("editorial-legacy-attestation-not-accepted");
  }));

test("source-based lookup and installation preserve existing translated slugs and canonicals", () =>
  setup(async (dir) => {
    const original = join(dir, "content/translations/en", slug + ".mdx"),
      raw = await readFile(original, "utf8"),
      parsed = parseEditorialFile(raw);
    parsed.frontmatter.slug = "what-is-power";
    parsed.frontmatter.canonicalUrl = "/en/article/what-is-power";
    const alias = join(dir, "content/translations/en/what-is-power.mdx");
    await rename(original, alias);
    await writeFile(alias, `---\n${JSON.stringify(parsed.frontmatter)}\n---\n${parsed.body}`);
    const plan = await editorialPlan(dir, [slug], now);
    expect(plan.results[0].state).toBe("READY");
    expect(plan.results[0].editions.find((e) => e.locale === "en")?.path).toBe(
      "content/translations/en/what-is-power.mdx",
    );
    await installPolicyPlan(dir, plan, plan.id);
    expect(await verifyPolicyRecord(dir, await readFile(alias, "utf8"))).toBeDefined();
    expect(parseEditorialFile(await readFile(alias, "utf8")).frontmatter.canonicalUrl).toBe(
      "/en/article/what-is-power",
    );
  }));

test("cover attribution cannot be changed even when translated text and meaning evidence are identical", () =>
  setup(async (dir) => {
    const path = join(dir, "content/translations/en", slug + ".mdx"),
      parsed = parseEditorialFile(await readFile(path, "utf8"));
    parsed.frontmatter.cover.credit = "Altered attribution not present in the original";
    await writeFile(path, `---\n${JSON.stringify(parsed.frontmatter)}\n---\n${parsed.body}`);
    const p = await editorialPlan(dir, [slug], now);
    expect(p.results[0].state).toBe("BLOCK");
    expect(p.results[0].code).toBe("automatic-attribution-changed");
  }));
