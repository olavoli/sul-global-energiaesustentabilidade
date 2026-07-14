import { z } from "zod";

import { preferredEditorialTag } from "./taxonomy";

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use slug em kebab-case.");
const isoDateSchema = z.iso.date();
const mediaSourceSchema = z
  .string()
  .refine(
    (value) => value.startsWith("/") || z.url().safeParse(value).success,
    "Use uma URL absoluta ou um caminho local iniciado por /.",
  );

export const responsiveImageSourceSchema = z.object({
  src: mediaSourceSchema,
  width: z.number().int().positive(),
});

export const editorialImageSchema = z
  .object({
    src: mediaSourceSchema,
    alt: z.string(),
    decorative: z.boolean().default(false),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    caption: z.string().min(1).optional(),
    credit: z.string().min(1).optional(),
    sourceUrl: z.url().optional(),
    license: z.string().min(1).optional(),
    focalPoint: z
      .object({
        x: z.number().min(0).max(100),
        y: z.number().min(0).max(100),
      })
      .optional(),
    loading: z.enum(["eager", "lazy"]).optional(),
    fetchPriority: z.enum(["high", "low", "auto"]).optional(),
    sources: z.array(responsiveImageSourceSchema).min(1).optional(),
  })
  .superRefine((image, context) => {
    if (!image.decorative && image.alt.trim().length === 0) {
      context.addIssue({
        code: "custom",
        path: ["alt"],
        message: "Imagem editorial exige texto alternativo.",
      });
    }
    if ((image.width === undefined) !== (image.height === undefined)) {
      context.addIssue({
        code: "custom",
        path: [image.width === undefined ? "width" : "height"],
        message: "width e height devem ser informados juntos.",
      });
    }
  });

export const categorySlugs = [
  "energia",
  "sustentabilidade",
  "ciencia",
  "tecnologia",
  "desenvolvimento",
  "transicao-energetica",
] as const;

export const articleContentTypes = [
  "news",
  "explainer",
  "analysis",
  "guide",
  "interview",
  "opinion",
] as const;

export const articleStatuses = [
  "draft",
  "review",
  "approved",
  "scheduled",
  "published",
  "archived",
  "correction-needed",
] as const;

export const sourceTypes = [
  "official",
  "academic",
  "regulatory",
  "company",
  "news",
  "data",
  "interview",
  "other",
] as const;

export const editorialSourceSchema = z.object({
  title: z.string().min(3),
  url: z.url(),
  organizationOrAuthor: z.string().min(2),
  publishedAt: isoDateSchema.optional(),
  verifiedAt: isoDateSchema,
  type: z.enum(sourceTypes),
  note: z.string().min(3).optional(),
  isDemo: z.boolean().default(false),
});

export const correctionEntrySchema = z.object({
  type: z.enum(["update", "correction"]),
  date: isoDateSchema,
  reason: z.string().min(3).max(160),
  description: z.string().min(3).max(400),
});

export const categorySchema = z.object({
  slug: z.enum(categorySlugs),
  name: z.string().min(1),
  description: z.string().min(1),
});

export const authorSchema = z.object({
  slug: slugSchema,
  name: z.string().min(1),
  role: z.string().min(1),
  bio: z.string().min(1),
  avatar: z.string().optional(),
});

export const articleFrontmatterSchema = z
  .object({
    slug: slugSchema,
    title: z.string().min(10).max(120),
    subtitle: z.string().min(1),
    excerpt: z.string().min(1).max(240),
    contentType: z.enum(articleContentTypes),
    status: z.enum(articleStatuses),
    author: slugSchema,
    category: z.enum(categorySlugs),
    tags: z.array(z.string().min(1)).min(1).max(8),
    createdAt: isoDateSchema.optional(),
    publishedAt: isoDateSchema.optional(),
    updatedAt: isoDateSchema.optional(),
    reviewedAt: isoDateSchema.optional(),
    approvedAt: isoDateSchema.optional(),
    scheduledAt: z.iso.datetime({ offset: true }).optional(),
    updateNote: z.string().min(3).max(400).optional(),
    corrections: z.array(correctionEntrySchema).default([]),
    readingTime: z.number().int().min(1).max(60),
    cover: editorialImageSchema,
    featured: z.boolean(),
    isDemo: z.boolean(),
    sponsored: z.boolean(),
    sponsorName: z.string().min(1).optional(),
    sourceUrls: z.array(z.url()),
    sources: z.array(editorialSourceSchema).default([]),
    lastVerifiedAt: isoDateSchema.optional(),
    opinionDisclosure: z.string().min(3).max(400).optional(),
    interviewee: z.string().min(2).optional(),
    interviewDate: isoDateSchema.optional(),
    interviewAuthorizationConfirmed: z.boolean().optional(),
    aiAssistance: z.enum(["none", "limited", "substantial"]).default("none"),
    aiDisclosure: z.string().min(3).max(400).optional(),
    seoTitle: z.string().max(120).optional(),
    seoDescription: z.string().max(180).optional(),
    canonicalUrl: z
      .string()
      .refine(
        (value) => value.startsWith("/") || z.url().safeParse(value).success,
        "Use uma URL absoluta ou um caminho relativo iniciado por /.",
      )
      .optional(),
  })
  .superRefine((article, context) => {
    if (!article.isDemo) {
      const normalizedTags = article.tags.map(preferredEditorialTag);
      article.tags.forEach((tag, index) => {
        if (normalizedTags[index] !== tag) {
          context.addIssue({
            code: "custom",
            path: ["tags", index],
            message: `Use a tag canônica: ${normalizedTags[index]}.`,
          });
        }
      });
      if (new Set(normalizedTags).size !== normalizedTags.length) {
        context.addIssue({
          code: "custom",
          path: ["tags"],
          message: "Tags duplicadas ou equivalentes.",
        });
      }
    }
    if (article.status === "published" && !article.publishedAt) {
      context.addIssue({
        code: "custom",
        path: ["publishedAt"],
        message: "Conteúdo publicado exige publishedAt.",
      });
    }
    if (!article.isDemo && article.status === "published" && !article.approvedAt) {
      context.addIssue({
        code: "custom",
        path: ["approvedAt"],
        message: "Conteúdo real publicado exige aprovação editorial explícita.",
      });
    }
    if (article.status === "scheduled" && !article.scheduledAt) {
      context.addIssue({
        code: "custom",
        path: ["scheduledAt"],
        message: "Conteúdo agendado exige scheduledAt com fuso horário.",
      });
    }
    if (article.sponsored && !article.sponsorName) {
      context.addIssue({
        code: "custom",
        path: ["sponsorName"],
        message: "Conteúdo patrocinado exige sponsorName.",
      });
    }
    if (article.updatedAt && article.publishedAt && article.updatedAt < article.publishedAt) {
      context.addIssue({
        code: "custom",
        path: ["updatedAt"],
        message: "updatedAt não pode ser anterior a publishedAt.",
      });
    }
    if (article.updatedAt && !article.updateNote && article.corrections.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["updateNote"],
        message: "updatedAt exige nota de atualização ou histórico de correção.",
      });
    }
    if (!article.isDemo && article.status === "published") {
      const sourceRequired = ["news", "explainer", "analysis"].includes(article.contentType);
      if (sourceRequired && article.sources.length === 0) {
        context.addIssue({
          code: "custom",
          path: ["sources"],
          message: `${article.contentType} publicado exige ao menos uma fonte estruturada.`,
        });
      }
      if (article.sources.some((source) => source.isDemo)) {
        context.addIssue({
          code: "custom",
          path: ["sources"],
          message: "Conteúdo real não pode usar fonte marcada como demonstração.",
        });
      }
      if (!article.cover.license || article.cover.license === "unknown") {
        context.addIssue({
          code: "custom",
          path: ["cover", "license"],
          message: "Conteúdo real publicado exige licença de imagem verificada.",
        });
      }
      if (article.contentType === "guide" && !article.reviewedAt) {
        context.addIssue({
          code: "custom",
          path: ["reviewedAt"],
          message: "Guia publicado exige data de revisão.",
        });
      }
      if (article.contentType === "opinion" && !article.opinionDisclosure) {
        context.addIssue({
          code: "custom",
          path: ["opinionDisclosure"],
          message: "Opinião publicada exige disclosure de autoria e conflitos.",
        });
      }
      if (
        article.contentType === "interview" &&
        (!article.interviewee || !article.interviewDate || !article.interviewAuthorizationConfirmed)
      ) {
        context.addIssue({
          code: "custom",
          path: ["interviewAuthorizationConfirmed"],
          message: "Entrevista publicada exige entrevistado, data e autorização confirmada.",
        });
      }
    }
    if (article.aiAssistance === "substantial" && !article.aiDisclosure) {
      context.addIssue({
        code: "custom",
        path: ["aiDisclosure"],
        message: "Uso substancial de IA exige disclosure editorial.",
      });
    }
  });

export type CategorySlug = (typeof categorySlugs)[number];
export type Category = z.infer<typeof categorySchema>;
export type Author = z.infer<typeof authorSchema>;
export type ArticleFrontmatter = z.infer<typeof articleFrontmatterSchema>;
export type ArticleStatus = ArticleFrontmatter["status"];
export type ArticleContentType = ArticleFrontmatter["contentType"];
export type EditorialImage = z.infer<typeof editorialImageSchema>;
export type ResponsiveImageSource = z.infer<typeof responsiveImageSourceSchema>;
export type EditorialSource = z.infer<typeof editorialSourceSchema>;
export type CorrectionEntry = z.infer<typeof correctionEntrySchema>;
