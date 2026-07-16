import { z } from "zod";

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use slug em kebab-case.");
const profileImageSchema = z
  .string()
  .refine(
    (value) => value.startsWith("/") || z.url().safeParse(value).success,
    "Use uma URL absoluta ou um caminho local iniciado por /.",
  );

export const authorStatuses = ["pending", "verified", "inactive", "demo"] as const;

export const authorSchema = z
  .object({
    slug: slugSchema,
    displayName: z.string().min(1),
    shortBio: z.string().min(1),
    fullBio: z.string().min(1).optional(),
    role: z.string().min(1).optional(),
    organization: z.string().min(1).optional(),
    credentials: z.array(z.string().min(1)).default([]),
    expertise: z.array(z.string().min(1)).default([]),
    researchLines: z.array(z.string().min(1)).optional(),
    mission: z.string().min(1).optional(),
    profileImage: profileImageSchema.optional(),
    profileImageAlt: z.string().min(1).optional(),
    socialLinks: z.record(z.string(), z.url()).default({}),
    disclosure: z.string().min(1).optional(),
    status: z.enum(authorStatuses),
    isDemo: z.boolean(),
    verifiedAt: z.iso.date().optional(),
    verifiedBy: z.string().min(1).optional(),
  })
  .superRefine((author, context) => {
    if (author.status === "verified" && !author.verifiedAt) {
      context.addIssue({
        code: "custom",
        path: ["verifiedAt"],
        message: "Autor verificado exige verifiedAt.",
      });
    }
    if (author.status === "demo" && !author.isDemo) {
      context.addIssue({
        code: "custom",
        path: ["isDemo"],
        message: "Autor com status demo exige isDemo: true.",
      });
    }
    if (author.isDemo && author.status !== "demo") {
      context.addIssue({
        code: "custom",
        path: ["status"],
        message: "Autor demo deve manter status demo.",
      });
    }
    if (author.profileImage && !author.profileImageAlt) {
      context.addIssue({
        code: "custom",
        path: ["profileImageAlt"],
        message: "Imagem de perfil exige texto alternativo.",
      });
    }
  });

export type Author = z.infer<typeof authorSchema>;
