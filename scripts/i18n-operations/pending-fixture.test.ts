import { parseEditorialFile } from "../../src/content/editorial-parser";
import { translationSchema } from "../../src/content/translation-schema";
/** Synthetic manual-pending copy for gate tests; never written to real content or used as approval. */
export function pendingTranslationFixture(raw: string) {
  const parsed = parseEditorialFile(raw);
  const f = translationSchema.parse(parsed.frontmatter);
  f.status = "draft";
  f.draftStage = "review-ready";
  f.translationReview = { status: "pending" };
  delete f.approvedAt;
  delete f.publishedAt;
  delete f.reviewedAt;
  f.aiDisclosure =
    f.locale === "en"
      ? "SYNTHETIC TEST DRAFT. Human editorial review is pending in the required workflow; this draft remains unpublished."
      : "SYNTHETIC TEST DRAFT. La revisión editorial humana está pendiente en el flujo obligatorio; este borrador permanece sin publicar.";
  return `---\n${JSON.stringify(f, null, 2)}\n---\n${parsed.body}`;
}
