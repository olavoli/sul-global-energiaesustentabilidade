import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { parseEditorialFile } from "../../src/content/editorial-parser";
import { translationSchema } from "../../src/content/translation-schema";
import type { Locale } from "../i18n-simulation/pipeline";
/** Locate by translationOf, preserving established translated slugs and URLs. */
export async function translationFile(root: string, sourceSlug: string, locale: Locale) {
  const directory = join(root, "content/translations", locale);
  let names: string[];
  try {
    names = await readdir(directory);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
  const matches = [];
  for (const name of names.filter((n) => n.endsWith(".mdx")).sort()) {
    const raw = await readFile(join(directory, name), "utf8"),
      record = translationSchema.parse(parseEditorialFile(raw).frontmatter);
    if (record.locale !== locale || name !== record.slug + ".mdx")
      throw Error("editorial-translation-path-invalid");
    if (record.translationOf === sourceSlug)
      matches.push({ raw, record, path: `content/translations/${locale}/${name}` });
  }
  if (matches.length > 1) throw Error("editorial-duplicate-translation");
  return matches[0] ?? null;
}
