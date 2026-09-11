import { z } from "zod";

export const COMMENTS_CONSENT_VERSION = "comments-v1" as const;
const REJECTED_COMMENT_RETENTION_MS = 90 * 24 * 60 * 60 * 1_000;

export const commentStatusSchema = z.enum(["pending", "approved", "rejected", "spam", "deleted"]);

export const commentModerationActionSchema = z.enum(["approve", "reject", "spam", "delete"]);

const articleSlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use um slug de artigo em kebab-case.");

const htmlTagPattern = /<\/?[a-z][^>]*>|<!--|-->/i;
const plainTextSchema = (minimum: number, maximum: number) =>
  z
    .string()
    .trim()
    .min(minimum)
    .max(maximum)
    .refine((value) => !htmlTagPattern.test(value), "HTML não é permitido.");

export const normalizedCommentEmailSchema = z.string().trim().toLowerCase().pipe(z.email());

/**
 * `emailHash` deve ser HMAC-SHA-256 do e-mail normalizado, usando um secret
 * exclusivo (`COMMENTS_HASH_SECRET`). Nunca use SHA-256 simples do e-mail.
 *
 * E-mail, nome, corpo integral do comentário e secret nunca podem ser
 * registrados em logs. A geração do hash pertence à camada de serviço futura.
 */
export const commentEmailHashSchema = z.string().regex(/^[a-f0-9]{64}$/);

export const publicCommentInputSchema = z
  .object({
    articleSlug: articleSlugSchema,
    publicName: plainTextSchema(2, 60),
    email: normalizedCommentEmailSchema,
    bodyText: plainTextSchema(3, 2_000),
    consentAccepted: z.literal(true),
    honeypot: z.literal("").optional(),
  })
  .strict();

const nullableStatusTimestamps = {
  approvedAt: z.iso.datetime().nullable(),
  rejectedAt: z.iso.datetime().nullable(),
  deletedAt: z.iso.datetime().nullable(),
};

const persistedCommentBaseSchema = z.object({
  id: z.string().min(1).max(128),
  articleSlug: articleSlugSchema,
  emailHash: commentEmailHashSchema,
  consentVersion: z.literal(COMMENTS_CONSENT_VERSION),
  consentedAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const retainedCommentSchema = persistedCommentBaseSchema.extend({
  publicName: plainTextSchema(2, 60),
  emailNormalized: normalizedCommentEmailSchema,
  bodyText: plainTextSchema(3, 2_000),
  anonymizedAt: z.null(),
});

/**
 * Após anonimização, somente `emailHash` pode permanecer para controle de
 * abuso. Ele não substitui nem permite recuperar o e-mail e segue o contrato
 * HMAC-SHA-256 documentado acima.
 */
const anonymizedCommentSchema = persistedCommentBaseSchema.extend({
  publicName: z.null(),
  emailNormalized: z.null(),
  bodyText: z.null(),
  anonymizedAt: z.iso.datetime(),
});

export const persistedCommentSchema = z
  .union([
    retainedCommentSchema.extend({
      status: z.literal("pending"),
      approvedAt: z.null(),
      rejectedAt: z.null(),
      deletedAt: z.null(),
    }),
    retainedCommentSchema.extend({
      status: z.literal("approved"),
      approvedAt: nullableStatusTimestamps.approvedAt.unwrap(),
      rejectedAt: z.null(),
      deletedAt: z.null(),
    }),
    retainedCommentSchema.extend({
      status: z.literal("rejected"),
      approvedAt: z.null(),
      rejectedAt: nullableStatusTimestamps.rejectedAt.unwrap(),
      deletedAt: z.null(),
    }),
    anonymizedCommentSchema.extend({
      status: z.literal("rejected"),
      approvedAt: z.null(),
      rejectedAt: nullableStatusTimestamps.rejectedAt.unwrap(),
      deletedAt: z.null(),
    }),
    retainedCommentSchema.extend({
      status: z.literal("spam"),
      approvedAt: z.null(),
      rejectedAt: nullableStatusTimestamps.rejectedAt.unwrap(),
      deletedAt: z.null(),
    }),
    anonymizedCommentSchema.extend({
      status: z.literal("spam"),
      approvedAt: z.null(),
      rejectedAt: nullableStatusTimestamps.rejectedAt.unwrap(),
      deletedAt: z.null(),
    }),
    anonymizedCommentSchema.extend({
      status: z.literal("deleted"),
      approvedAt: z.null(),
      rejectedAt: z.null(),
      deletedAt: nullableStatusTimestamps.deletedAt.unwrap(),
    }),
  ])
  .superRefine((comment, context) => {
    const consentedAt = Date.parse(comment.consentedAt);
    const createdAt = Date.parse(comment.createdAt);
    const updatedAt = Date.parse(comment.updatedAt);
    const statusAt = Date.parse(
      comment.approvedAt ?? comment.rejectedAt ?? comment.deletedAt ?? "",
    );
    const anonymizedAt = Date.parse(comment.anonymizedAt ?? "");

    if (consentedAt > createdAt) {
      context.addIssue({
        code: "custom",
        path: ["consentedAt"],
        message: "Consentimento posterior à criação.",
      });
    }
    if (createdAt > updatedAt) {
      context.addIssue({
        code: "custom",
        path: ["updatedAt"],
        message: "Atualização anterior à criação.",
      });
    }
    if (!Number.isNaN(statusAt) && (statusAt < createdAt || statusAt > updatedAt)) {
      context.addIssue({
        code: "custom",
        path: [`${comment.status}At`],
        message: "Timestamp de estado incompatível com criação/atualização.",
      });
    }
    if (
      !Number.isNaN(anonymizedAt) &&
      (anonymizedAt < createdAt || anonymizedAt < statusAt || anonymizedAt > updatedAt)
    ) {
      context.addIssue({
        code: "custom",
        path: ["anonymizedAt"],
        message: "Timestamp de anonimização incompatível com a cronologia.",
      });
    }
    if (
      (comment.status === "rejected" || comment.status === "spam") &&
      !Number.isNaN(anonymizedAt) &&
      anonymizedAt < statusAt + REJECTED_COMMENT_RETENTION_MS
    ) {
      context.addIssue({
        code: "custom",
        path: ["anonymizedAt"],
        message: "Anonimização anterior ao prazo de retenção de 90 dias.",
      });
    }
  });

export type CommentStatus = z.infer<typeof commentStatusSchema>;
export type CommentModerationAction = z.infer<typeof commentModerationActionSchema>;
export type PublicCommentInput = z.infer<typeof publicCommentInputSchema>;
export type PersistedComment = z.infer<typeof persistedCommentSchema>;
