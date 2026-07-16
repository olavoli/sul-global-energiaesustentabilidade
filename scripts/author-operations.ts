import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { parse } from "yaml";
import { z } from "zod";

import authorRecords from "../content/authors.json";
import { articleRecords } from "../src/content/generated/articles";
import { authorSchema, type Author } from "../src/content/schema";

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const optionalText = z.string().trim().min(1).nullish();

export const authorOnboardingSchema = z
  .object({
    slug: slugSchema,
    displayName: z.string().trim().min(1),
    shortBio: z.string().trim().min(1),
    fullBio: z.string().trim().min(1).nullish(),
    expertise: z.array(z.string().trim().min(1)).min(1),
    researchLines: z.array(z.string().trim().min(1)).default([]),
    mission: z.string().trim().min(1).nullish(),
    role: optionalText,
    organization: optionalText,
    credentials: z.array(z.string().trim().min(1)).default([]),
    credentialsConfirmed: z.boolean().nullish(),
    socialLinks: z.record(z.string(), z.url()).default({}),
    conflictsOfInterest: z.string().trim().min(1),
    publicationAuthorized: z.literal(true),
    truthConfirmed: z.literal(true),
  })
  .superRefine((onboarding, context) => {
    if (onboarding.credentials.length > 0 && onboarding.credentialsConfirmed !== true) {
      context.addIssue({
        code: "custom",
        path: ["credentialsConfirmed"],
        message: "Credenciais informadas exigem confirmação explícita.",
      });
    }
  });

export type AuthorOnboarding = z.infer<typeof authorOnboardingSchema>;

export interface AuthorValidationReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
  publicFields: string[];
}

const PUBLIC_FIELDS = [
  "displayName",
  "shortBio",
  "fullBio",
  "expertise",
  "researchLines",
  "mission",
  "role",
  "organization",
  "credentials",
  "socialLinks",
  "conflictsOfInterest",
];

export function validateOnboarding(input: unknown): AuthorValidationReport {
  const result = authorOnboardingSchema.safeParse(input);
  const errors = result.success
    ? []
    : result.error.issues.map((issue) => `${issue.path.join(".") || "arquivo"}: ${issue.message}`);
  const warnings: string[] = [];
  if (result.success && result.data.credentials.length === 0) {
    warnings.push("Nenhuma credencial foi informada; isso não bloqueia a autoria.");
  }
  if (result.success && Object.keys(result.data.socialLinks).length === 0) {
    warnings.push("Nenhum link público foi informado; o campo é opcional.");
  }
  return { valid: result.success, errors, warnings, publicFields: PUBLIC_FIELDS };
}

export async function createAuthorOnboarding(slug: string, root = process.cwd()): Promise<string> {
  if (!slugSchema.safeParse(slug).success) throw new Error("Slug inválido; use kebab-case.");
  const template = await readFile(resolve(root, "content/templates/author-onboarding.yml"), "utf8");
  const target = resolve(root, "content/author-onboarding", `${slug}.yml`);
  await mkdir(dirname(target), { recursive: true });
  try {
    await writeFile(target, template.replace("__SLUG__", slug), {
      encoding: "utf8",
      flag: "wx",
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error(`Onboarding já existe: content/author-onboarding/${slug}.yml.`);
    }
    throw error;
  }
  return target;
}

export function prepareAuthorPromotion(
  author: Author,
  onboardingInput: unknown,
  verifiedAt: string,
  verifiedBy: string,
): Author {
  const onboarding = authorOnboardingSchema.parse(onboardingInput);
  if (author.isDemo || author.status === "demo")
    throw new Error("Autor demo não pode ser promovido.");
  if (author.status !== "pending") throw new Error("Somente autor pending pode virar verified.");
  if (onboarding.slug !== author.slug)
    throw new Error("Slug do onboarding não corresponde ao autor.");
  if (onboarding.displayName !== author.displayName || onboarding.shortBio !== author.shortBio) {
    throw new Error("Perfil público diverge do onboarding; revise sem sobrescrever a biografia.");
  }
  if (!z.iso.date().safeParse(verifiedAt).success) {
    throw new Error("Informe verifiedAt no formato YYYY-MM-DD.");
  }
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(verifiedBy)) {
    throw new Error("verifiedBy deve ser um identificador humano simples.");
  }
  return authorSchema.parse({ ...author, status: "verified", verifiedAt, verifiedBy });
}

export function createPendingPublicAuthor(onboardingInput: unknown): Author {
  const onboarding = authorOnboardingSchema.parse(onboardingInput);
  return authorSchema.parse({
    slug: onboarding.slug,
    displayName: onboarding.displayName,
    shortBio: onboarding.shortBio,
    fullBio: onboarding.fullBio ?? undefined,
    role: onboarding.role ?? undefined,
    organization: onboarding.organization ?? undefined,
    credentials: onboarding.credentials,
    expertise: onboarding.expertise,
    researchLines: onboarding.researchLines,
    mission: onboarding.mission ?? undefined,
    socialLinks: onboarding.socialLinks,
    disclosure: onboarding.conflictsOfInterest,
    status: "pending",
    isDemo: false,
  });
}

function parseOptions(values: string[]): Map<string, string> {
  const options = new Map<string, string>();
  for (let index = 0; index < values.length; index += 1) {
    if (!values[index].startsWith("--")) continue;
    const key = values[index].slice(2);
    const next = values[index + 1];
    options.set(key, next && !next.startsWith("--") ? next : "true");
    if (next && !next.startsWith("--")) index += 1;
  }
  return options;
}

async function readOnboarding(slug: string, root = process.cwd()): Promise<unknown> {
  const path = resolve(root, "content/author-onboarding", `${slug}.yml`);
  try {
    return parse(await readFile(path, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Onboarding não encontrado para ${slug}.`);
    }
    throw error;
  }
}

function listAuthors(): string {
  const header = "slug | nome público | status | demo | verificado em | artigos";
  const rows = authorRecords.map((raw) => {
    const author = authorSchema.parse(raw);
    const count = articleRecords.filter((article) => article.author === author.slug).length;
    return [
      author.slug,
      author.displayName,
      author.status,
      author.isDemo ? "sim" : "não",
      author.verifiedAt ?? "—",
      String(count),
    ].join(" | ");
  });
  return [header, ...rows].join("\n");
}

async function main(): Promise<void> {
  const [command, slug, target, ...rest] = process.argv.slice(2);
  if (command === "new") {
    if (!slug) throw new Error("Informe o slug do autor.");
    console.log(`Onboarding criado: ${await createAuthorOnboarding(slug)}`);
    return;
  }
  if (command === "list") return console.log(listAuthors());
  if (!slug) throw new Error("Informe o slug do autor.");
  const onboarding = await readOnboarding(slug);
  if (command === "validate") {
    const report = validateOnboarding(onboarding);
    console.log(`Autor: ${slug}`);
    console.log(`Campos públicos: ${report.publicFields.join(", ")}.`);
    report.warnings.forEach((warning) => console.log(`[warning] ${warning}`));
    report.errors.forEach((error) => console.log(`[erro] ${error}`));
    console.log(
      report.valid ? "Onboarding válido; autor ainda não foi verificado." : "Onboarding inválido.",
    );
    if (!report.valid) process.exitCode = 1;
    return;
  }
  if (command === "status") {
    if (target !== "verified") throw new Error("A única promoção disponível é pending → verified.");
    const options = parseOptions(rest);
    const records = authorRecords.map((record) => authorSchema.parse(record));
    let index = records.findIndex((author) => author.slug === slug);
    if (index < 0) {
      records.push(createPendingPublicAuthor(onboarding));
      index = records.length - 1;
    }
    const promoted = prepareAuthorPromotion(
      records[index],
      onboarding,
      options.get("verified-at") ?? "",
      options.get("verified-by") ?? "",
    );
    console.log(
      `${slug}: pending → verified; biografia preservada; verifiedAt=${promoted.verifiedAt}.`,
    );
    if (!options.has("apply")) return console.log("Dry-run: use --apply para gravar.");
    records[index] = promoted;
    await writeFile(
      resolve(process.cwd(), "content/authors.json"),
      `${JSON.stringify(records, null, 2)}\n`,
      "utf8",
    );
    console.log("Status gravado. Revise o diff antes de continuar.");
    return;
  }
  throw new Error("Comando inválido. Use new, validate, list ou status.");
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(`[erro] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
