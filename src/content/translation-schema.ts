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
      status: z.enum(["pending", "approved"]),
      reviewer: z.string().trim().min(2).optional(),
      reviewedAt: z.iso.date().optional(),
    }),
  })
  .superRefine((article, context) => {
    if (article.canonicalUrl !== translatedArticlePath(article.locale, article.slug)) {
      context.addIssue({
        code: "custom",
        path: ["canonicalUrl"],
        message: "Canonical da tradução deve usar sua própria rota e idioma.",
      });
    }
    if (
      ["approved", "scheduled", "published"].includes(article.status) &&
      (article.translationReview.status !== "approved" ||
        !article.translationReview.reviewer ||
        !article.translationReview.reviewedAt)
    ) {
      context.addIssue({
        code: "custom",
        path: ["translationReview"],
        message: "Tradução exige revisão humana identificada antes de aprovação/publicação.",
      });
    }
  });
export type TranslationRecord = z.infer<typeof translationSchema>;
