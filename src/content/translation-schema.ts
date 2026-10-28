import { z } from "zod";
import { articleFrontmatterSchema } from "./schema";

export const translationLocales = ["en", "es"] as const;
export type TranslationLocale = (typeof translationLocales)[number];
export type ContentLocale = "pt-BR" | TranslationLocale;

export function translatedArticlePath(locale: TranslationLocale, slug: string): string {
  return `/${locale}/${locale === "en" ? "article" : "articulo"}/${slug}`;
}

export const translationSchema = articleFrontmatterSchema
  .safeExtend({
    locale: z.enum(translationLocales),
    translationOf: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    sourceRevision: z.string().regex(/^[a-f0-9]{64}$/),
    translationReview: z.object({
      status: z.enum(["pending", "approved", "automatic"]),
      reviewer: z.string().trim().min(2).optional(),
      reviewedAt: z.iso.date().optional(),
      automation: z
        .object({
          policyId: z.string().regex(/^[a-f0-9]{64}$/),
          runId: z.string().regex(/^[a-f0-9]{64}$/),
          model: z.literal("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
          validator: z.enum(["operations-technical-v1", "operations-editorial-policy-v1"]),
          meaningRevision: z
            .string()
            .regex(/^[a-f0-9]{64}$/)
            .optional(),
          codeRevision: z.string().regex(/^[a-f0-9]{64}$/),
          sourceRevision: z.string().regex(/^[a-f0-9]{64}$/),
          targetRevision: z.string().regex(/^[a-f0-9]{64}$/),
          validatedAt: z.iso.datetime(),
          scope: z.literal("technical-only"),
          checks: z.union([
            z.tuple([
              z.literal("mdx"),
              z.literal("numbers"),
              z.literal("formulas"),
              z.literal("links"),
              z.literal("references"),
              z.literal("metadata"),
            ]),
            z.tuple([
              z.literal("mdx"),
              z.literal("numbers"),
              z.literal("formulas"),
              z.literal("links"),
              z.literal("references"),
              z.literal("metadata"),
              z.literal("meaning"),
            ]),
          ]),
        })
        .optional(),
    }),
  })
  .superRefine((article, context) => {
    if (
      article.translationReview.status === "automatic" &&
      (article.translationReview.reviewer || article.translationReview.reviewedAt)
    )
      context.addIssue({
        code: "custom",
        path: ["translationReview"],
        message: "Atestação automática não pode declarar revisor humano.",
      });
    if (
      article.translationReview.automation?.validator === "operations-editorial-policy-v1" &&
      (!article.translationReview.automation.meaningRevision ||
        article.translationReview.automation.checks.at(-1) !== "meaning")
    )
      context.addIssue({
        code: "custom",
        path: ["translationReview"],
        message: "Política automática exige evidência de significado vinculada.",
      });
    if (article.canonicalUrl !== translatedArticlePath(article.locale, article.slug)) {
      context.addIssue({
        code: "custom",
        path: ["canonicalUrl"],
        message: "Canonical da tradução deve usar sua própria rota e idioma.",
      });
    }
    if (
      ["approved", "scheduled", "published"].includes(article.status) &&
      !translationReviewAccepted(article)
    ) {
      context.addIssue({
        code: "custom",
        path: ["translationReview"],
        message: "Tradução exige revisão humana identificada antes de aprovação/publicação.",
      });
    }
  });
export type TranslationRecord = z.infer<typeof translationSchema>;

/** Technical automation is explicitly distinguished from identified human review. */
export function translationReviewAccepted(article: {
  sourceRevision?: string;
  translationReview: {
    status: string;
    reviewer?: string;
    reviewedAt?: string;
    automation?: { sourceRevision: string };
  };
}) {
  const r = article.translationReview;
  return r.status === "approved"
    ? Boolean(r.reviewer && r.reviewedAt)
    : r.status === "automatic"
      ? Boolean(r.automation && r.automation.sourceRevision === article.sourceRevision)
      : false;
}
