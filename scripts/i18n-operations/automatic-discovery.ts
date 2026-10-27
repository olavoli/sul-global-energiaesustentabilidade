import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseEditorialFile } from "../generate-content";
import { hash } from "../i18n-simulation/pipeline";
import { translationSchema } from "../../src/content/translation-schema";
export async function discover(root: string) {
  const translations = [];
  for (const locale of ["en", "es"] as const) {
    let names: string[] = [];
    try {
      names = await readdir(join(root, "content/translations", locale));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
    for (const name of names.filter((n) => n.endsWith(".mdx"))) {
      const raw = await readFile(join(root, "content/translations", locale, name), "utf8");
      translations.push(translationSchema.parse(parseEditorialFile(raw).frontmatter));
    }
  }
  const result = [];
  for (const name of (await readdir(join(root, "content/articles")))
    .filter((n) => n.endsWith(".mdx"))
    .sort()) {
    try {
      const raw = await readFile(join(root, "content/articles", name), "utf8"),
        article = parseEditorialFile(raw).frontmatter;
      if (article.status !== "published" || article.isDemo) continue;
      const revision = hash(raw),
        editions = translations.filter((t) => t.translationOf === article.slug);
      const current = ["en", "es"].every((locale) =>
        editions.some(
          (t) => t.locale === locale && t.sourceRevision === revision && t.status === "published",
        ),
      );
      const protectedEdition = editions.some(
        (t) =>
          t.translationReview.status !== "automatic" &&
          !(t.status === "published" && t.sourceRevision === revision),
      );
      result.push({
        slug: article.slug,
        sourceRevision: revision,
        state: current ? "CURRENT" : protectedEdition ? "PROTECTED" : "PENDING",
      });
    } catch {
      result.push({ slug: name.slice(0, -4), sourceRevision: null, state: "INVALID" });
    }
  }
  return result;
}
