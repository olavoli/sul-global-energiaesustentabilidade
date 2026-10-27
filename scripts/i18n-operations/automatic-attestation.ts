import { hash } from "../i18n-simulation/pipeline";
import { articleFrontmatterSchema } from "../../src/content/schema";
import { translationSchema } from "../../src/content/translation-schema";
export function targetRevision(frontmatter: unknown, body: string) {
  const f: Record<string, unknown> = { ...articleFrontmatterSchema.parse(frontmatter) };
  for (const k of [
    "status",
    "draftStage",
    "approvedAt",
    "publishedAt",
    "reviewedAt",
    "updatedAt",
    "scheduledAt",
  ])
    delete f[k];
  return hash(JSON.stringify(f) + "\n" + body.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, ""));
}
export function validateAutomaticRecord(frontmatter: unknown, body: string) {
  const f = translationSchema.parse(frontmatter);
  if (
    f.translationReview.status === "automatic" &&
    f.translationReview.automation?.targetRevision !== targetRevision(f, body)
  )
    throw Error("automatic-attestation-stale");
  return f;
}
