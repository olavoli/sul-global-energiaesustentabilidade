import { parse } from "yaml";
import { translationSchema } from "./translation-schema";
import { articleFrontmatterSchema, type ArticleFrontmatter } from "./schema";

const ALLOWED_COMPONENTS = new Set([
  "Callout",
  "Quote",
  "Figure",
  "KeyPoints",
  "EditorialTable",
  "TableHead",
  "TableBody",
  "TableRow",
  "TableHeader",
  "TableCell",
  "Emphasis",
  "Strong",
  "Superscript",
  "Subscript",
  "Underline",
  "MathExpression",
  "YouTubeEmbed",
  "VideoCard",
]);

export interface ParsedEditorialFile {
  frontmatter: ArticleFrontmatter;
  body: string;
  path: string;
}

/** Parse and validate one constrained MDX editorial file. */
export function parseEditorialFile(source: string, path = "conteúdo.mdx"): ParsedEditorialFile {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`${path}: frontmatter delimitado por --- é obrigatório.`);

  let rawFrontmatter: unknown;
  try {
    rawFrontmatter = parse(match[1]);
  } catch (error) {
    throw new Error(`${path}: YAML inválido: ${String(error)}`);
  }

  const isTranslation =
    typeof rawFrontmatter === "object" && rawFrontmatter !== null && "locale" in rawFrontmatter;
  const result = (isTranslation ? translationSchema : articleFrontmatterSchema).safeParse(
    rawFrontmatter,
  );
  if (!result.success) {
    throw new Error(
      `${path}: frontmatter inválido:\n${result.error.issues
        .map((issue) => {
          const field = issue.path.join(".") || "frontmatter";
          return `- ${field}: ${issue.message} Ação: corrija o campo ${field} no arquivo indicado.`;
        })
        .join("\n")}`,
    );
  }

  validateSafeMdx(match[2], path);
  return { frontmatter: result.data, body: match[2], path };
}

/** Reject executable MDX constructs and components outside the editorial whitelist. */
export function validateSafeMdx(body: string, path: string): void {
  if (/^\s*(?:import|export)\s/m.test(body)) {
    throw new Error(`${path}: import/export não é permitido no conteúdo editorial.`);
  }
  if (/[{}]/.test(body)) {
    throw new Error(`${path}: expressões JavaScript em MDX não são permitidas.`);
  }

  for (const match of body.matchAll(/<\/?([A-Za-z][\w.]*)\b/g)) {
    const component = match[1];
    if (!ALLOWED_COMPONENTS.has(component)) {
      throw new Error(`${path}: componente MDX não autorizado: ${component}.`);
    }
  }
}
