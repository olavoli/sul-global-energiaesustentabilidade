import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { articleContentTypes, categorySlugs } from "../src/content/schema";
import { preferredEditorialTag } from "../src/content/taxonomy";
import { authors } from "../src/data/authors";
import type { Author } from "../src/content/schema";

function argumentsMap(values: string[]): Map<string, string> {
  const result = new Map<string, string>();
  for (let index = 0; index < values.length; index += 1) {
    const current = values[index];
    if (!current.startsWith("--")) continue;
    const [key, inline] = current.slice(2).split("=", 2);
    const next = values[index + 1];
    result.set(key, inline ?? (next && !next.startsWith("--") ? next : ""));
    if (inline === undefined && next && !next.startsWith("--")) index += 1;
  }
  return result;
}

function required(input: Map<string, string>, name: string): string {
  const value = input.get(name)?.trim();
  if (!value) throw new Error(`Informe --${name}.`);
  return value;
}

function validSlug(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export interface NewContentInput {
  type: (typeof articleContentTypes)[number];
  title: string;
  slug: string;
  author: string;
  category: (typeof categorySlugs)[number];
  date: string;
  tag: string;
}

/** Create a draft from a versioned template without overwriting existing content. */
export async function createDraft(
  input: NewContentInput,
  root = process.cwd(),
  authorDirectory: Readonly<Record<string, Author>> = authors,
): Promise<string> {
  if (!validSlug(input.slug)) throw new Error("Slug inválido; use kebab-case sem acentos.");
  const author = authorDirectory[input.author];
  if (!author) throw new Error(`Autor inexistente: ${input.author}.`);
  if (author.isDemo || !["pending", "verified"].includes(author.status)) {
    throw new Error(`Autor indisponível para draft real: ${input.author}.`);
  }
  if (!categorySlugs.includes(input.category))
    throw new Error(`Categoria inválida: ${input.category}.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error("Data inválida; use YYYY-MM-DD.");
  const target = resolve(root, "content/articles", `${input.slug}.mdx`);
  const template = resolve(root, "content/templates", `${input.type}.mdx`);
  const source = await readFile(template, "utf8");
  const content = source
    .replaceAll("__SLUG__", input.slug)
    .replaceAll("__TITLE_JSON__", JSON.stringify(input.title))
    .replaceAll("__AUTHOR__", input.author)
    .replaceAll("__CATEGORY__", input.category)
    .replaceAll("__DATE__", input.date)
    .replaceAll("__TAG__", preferredEditorialTag(input.tag));
  await mkdir(dirname(target), { recursive: true });
  try {
    await writeFile(target, content, { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new Error(`Arquivo já existe: content/articles/${input.slug}.mdx.`);
    }
    throw error;
  }
  return target;
}

async function main(): Promise<void> {
  const args = argumentsMap(process.argv.slice(2));
  const type = required(args, "type");
  const category = required(args, "category");
  if (!articleContentTypes.includes(type as NewContentInput["type"])) {
    throw new Error(`Tipo inválido. Use: ${articleContentTypes.join(", ")}.`);
  }
  if (!categorySlugs.includes(category as NewContentInput["category"])) {
    throw new Error(`Categoria inválida. Use: ${categorySlugs.join(", ")}.`);
  }
  if (args.get("status") && args.get("status") !== "draft") {
    throw new Error("Novo conteúdo sempre inicia com status draft.");
  }
  const target = await createDraft({
    type: type as NewContentInput["type"],
    title: required(args, "title"),
    slug: required(args, "slug"),
    author: required(args, "author"),
    category: category as NewContentInput["category"],
    date: required(args, "date"),
    tag: required(args, "tag"),
  });
  console.log(`Rascunho criado: ${target}`);
  console.log("Status: draft. Nenhum conteúdo foi publicado.");
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(`[erro] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
