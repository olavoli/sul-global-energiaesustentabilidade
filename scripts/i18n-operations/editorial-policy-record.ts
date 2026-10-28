import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { hash } from "../i18n-simulation/pipeline";
import { parseEditorialFile } from "../generate-content";
import { translationSchema } from "../../src/content/translation-schema";
import { evaluatePolicy, meaningMetadata } from "./editorial-policy";
/** Build-time revalidation, rather than trusting a manually copied approval flag. */
export async function verifyPolicyRecord(root: string, raw: string) {
  const parsed = parseEditorialFile(raw),
    f = translationSchema.parse(parsed.frontmatter);
  const a = f.translationReview.automation;
  if (
    a?.validator === "operations-technical-v1" &&
    existsSync(join(root, "content/translation-policies/automatic-v1.json"))
  )
    throw Error("editorial-legacy-attestation-not-accepted");
  if (a?.validator !== "operations-editorial-policy-v1") return;
  const policy = JSON.parse(
    await readFile(join(root, "content/translation-policies/automatic-v1.json"), "utf8"),
  );
  const evidence = JSON.parse(
    await readFile(join(root, "content/translation-evidence", f.locale, f.slug + ".json"), "utf8"),
  );
  const sourceRaw = await readFile(
    join(root, "content/articles", f.translationOf + ".mdx"),
    "utf8",
  );
  const source = parseEditorialFile(sourceRaw);
  if (
    source.frontmatter.status !== "published" ||
    source.frontmatter.isDemo ||
    hash(sourceRaw) !== f.sourceRevision
  )
    throw Error("editorial-source-not-published-or-stale");
  const result = evaluatePolicy(
    source.body,
    parsed.body,
    f.locale,
    hash(sourceRaw),
    policy,
    evidence,
    { source: meaningMetadata(source.frontmatter), target: meaningMetadata(f) },
  );
  if (result.policyId !== a.policyId || result.meaningRevision !== a.meaningRevision)
    throw Error("editorial-policy-attestation-stale");
  return result;
}
