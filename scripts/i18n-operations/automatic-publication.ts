import { evaluatePolicy, meaningMetadata } from "./editorial-policy";
import { scientificTokensMatch } from "./automatic-science";
import { revision } from "./run";
import { targetRevision, validateAutomaticRecord } from "./automatic-attestation";
import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { compile } from "@mdx-js/mdx";
import remarkFrontmatter from "remark-frontmatter";
import { remarkEditorialSlots } from "../../src/content/remark-editorial-slots";
import { translationSchema } from "../../src/content/translation-schema";
import { articleFrontmatterSchema } from "../../src/content/schema";
import { parseEditorialFile } from "../../src/content/editorial-parser";
import { hash, prepare, type Locale } from "../i18n-simulation/pipeline";
import { editorialDeterministic, translationDisclosure, localizedCredit } from "./editorial";
import { publishCheck } from "../editorial-operations";
function acceptedWarning(f: { code: string; source?: string; target?: string }) {
  if (f.code !== "negation-modality-mineral-caveat") return false;
  return (
    (f.source === "Podemos resumir assim:" && /^We can summarize/.test(f.target ?? "")) ||
    (f.source === "Por que nenhuma máquina é 100% eficiente?" &&
      f.target === "Why is no machine 100% efficient?") ||
    (f.source === "Potência também não é eficiência" &&
      f.target === "La potencia tampoco es eficiencia")
  );
}
export async function publicationCandidate(
  root: string,
  slug: string,
  locale: Locale,
  raw: string,
  policyId: string,
  runId: string,
  now = new Date(),
  editorial?: { policy: unknown; evidence: unknown },
) {
  const sourceRaw = await readFile(join(root, "content/articles", slug + ".mdx"), "utf8"),
    source = parseEditorialFile(sourceRaw),
    parsed = parseEditorialFile(raw);
  const frontmatter = translationSchema.parse(parsed.frontmatter);
  if (editorial && (!source.frontmatter.approvedAt || source.frontmatter.isDemo))
    throw Error("editorial-source-approval-missing");
  if (
    source.frontmatter.status !== "published" ||
    frontmatter.translationOf !== slug ||
    frontmatter.locale !== locale ||
    frontmatter.sourceRevision !== hash(sourceRaw)
  )
    throw Error("automatic-source-stale");
  const sourceSegments = prepare(source.body).segments,
    targetSegments = prepare(parsed.body).segments;
  if (
    sourceSegments.length !== targetSegments.length ||
    sourceSegments.some(
      (leaf, index) => !scientificTokensMatch(leaf.text, targetSegments[index].text),
    )
  )
    throw Error("automatic-scientific-token-divergence");
  for (const key of ["title", "subtitle", "excerpt", "seoTitle", "seoDescription"] as const)
    if (!scientificTokensMatch(source.frontmatter[key] ?? "", frontmatter[key] ?? ""))
      throw Error("automatic-scientific-token-divergence");
  for (const key of ["alt", "caption"] as const)
    if (!scientificTokensMatch(source.frontmatter.cover[key] ?? "", frontmatter.cover[key] ?? ""))
      throw Error("automatic-scientific-token-divergence");
  const decision = editorial
    ? evaluatePolicy(
        source.body,
        parsed.body,
        locale,
        hash(sourceRaw),
        editorial.policy,
        editorial.evidence,
        { source: meaningMetadata(source.frontmatter), target: meaningMetadata(frontmatter) },
      )
    : undefined;
  if (decision && decision.policyId !== policyId) throw Error("editorial-policy-id-mismatch");
  const findings = editorialDeterministic(source.body, parsed.body, locale);
  if (!decision && findings.some((f) => f.severity === "critical" || !acceptedWarning(f)))
    throw Error("automatic-content-quarantined");
  if (
    JSON.stringify(frontmatter.sources) !== JSON.stringify(source.frontmatter.sources) ||
    frontmatter.author !== source.frontmatter.author ||
    frontmatter.category !== source.frontmatter.category ||
    frontmatter.cover.src !== source.frontmatter.cover.src ||
    frontmatter.cover.license !== source.frontmatter.cover.license ||
    frontmatter.cover.credit !== localizedCredit(source.frontmatter.cover.credit, locale) ||
    JSON.stringify(frontmatter.cover.aiProvenance) !==
      JSON.stringify(source.frontmatter.cover.aiProvenance) ||
    frontmatter.cover.decorative !== source.frontmatter.cover.decorative ||
    frontmatter.referencesInBody !== source.frontmatter.referencesInBody ||
    JSON.stringify(frontmatter.tags) !== JSON.stringify(source.frontmatter.tags) ||
    frontmatter.contentType !== source.frontmatter.contentType ||
    frontmatter.sponsored !== source.frontmatter.sponsored ||
    JSON.stringify(frontmatter.cover.sources) !==
      JSON.stringify(source.frontmatter.cover.sources) ||
    frontmatter.cover.width !== source.frontmatter.cover.width ||
    frontmatter.cover.height !== source.frontmatter.cover.height ||
    prepare(parsed.body).bibliography !== prepare(source.body).bibliography
  )
    throw Error("automatic-attribution-changed");
  const day = now.toISOString().slice(0, 10);
  if (decision) {
    delete frontmatter.reviewedAt;
    frontmatter.aiDisclosureMode = "detailed";
    frontmatter.aiAssistance = "substantial";
  }
  frontmatter.status = "published";
  frontmatter.draftStage = "review-ready";
  frontmatter.approvedAt = day;
  frontmatter.publishedAt = day;
  const policyNote =
    locale === "en"
      ? "This language edition was translated automatically using Cloudflare Workers AI (Meta Llama 3.3 70B) and passed automated technical checks under the portal’s automatic translation editorial policy. Meaning was compared with AI assistance; no full human linguistic review was performed. These checks do not certify scientific accuracy."
      : "Esta edición se tradujo automáticamente mediante Cloudflare Workers AI (Meta Llama 3.3 70B) y superó verificaciones técnicas automáticas conforme a la política editorial de traducción automática del portal. El significado se comparó con ayuda de IA; no se realizó una revisión lingüística humana integral. Estas verificaciones no certifican precisión científica.";
  const note = decision
    ? policyNote
    : locale === "en"
      ? "This language edition was translated automatically using Cloudflare Workers AI (Meta Llama 3.3 70B) and passed automated technical checks. These checks do not certify scientific accuracy or human linguistic review."
      : "Esta edición se tradujo automáticamente mediante Cloudflare Workers AI (Meta Llama 3.3 70B) y superó verificaciones técnicas automáticas. Estas verificaciones no certifican precisión científica ni revisión lingüística humana.";
  frontmatter.aiDisclosure = [
    frontmatter.aiDisclosure
      ?.replace(translationDisclosure(locale), "")
      .replace(
        "Human editorial review is pending in the required workflow; this draft remains unpublished.",
        "",
      )
      .replace(
        "La revisión editorial humana está pendiente en el flujo obligatorio; este borrador permanece sin publicar.",
        "",
      )
      .trim(),
    note,
  ]
    .filter(Boolean)
    .join(" ");
  frontmatter.translationReview = {
    status: "automatic",
    automation: {
      policyId,
      runId,
      model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      validator: decision ? "operations-editorial-policy-v1" : "operations-technical-v1",
      ...(decision ? { meaningRevision: decision.meaningRevision } : {}),
      codeRevision: await revision(root),
      sourceRevision: hash(sourceRaw),
      targetRevision: targetRevision(frontmatter, parsed.body),
      validatedAt: now.toISOString(),
      scope: "technical-only",
      checks: decision
        ? ["mdx", "numbers", "formulas", "links", "references", "metadata", "meaning"]
        : ["mdx", "numbers", "formulas", "links", "references", "metadata"],
    },
  };
  validateAutomaticRecord(frontmatter, parsed.body);
  const report = publishCheck(frontmatter, { now, officialProduction: true });
  if (report.blockers.length) throw Error("automatic-publish-check-blocked");
  const mdx = `---\n${JSON.stringify(frontmatter, null, 2)}\n---\n${parsed.body}`;
  await compile(mdx, { remarkPlugins: [remarkFrontmatter, remarkEditorialSlots] });
  return mdx;
}
export async function installCandidates(
  root: string,
  slug: string,
  candidates: Record<Locale, string>,
) {
  // Validate and stage both before changing the content tree. A partial install stays recoverable from the complete run.
  for (const locale of ["en", "es"] as const) {
    const parsed = parseEditorialFile(candidates[locale]);
    validateAutomaticRecord(parsed.frontmatter, parsed.body);
    const directory = join(root, "content/translations", locale);
    await mkdir(directory, { recursive: true });
    const target = join(directory, slug + ".mdx");
    try {
      const current = translationSchema.parse(
        parseEditorialFile(await readFile(target, "utf8")).frontmatter,
      );
      if (current.translationReview.status !== "automatic")
        throw Error("automatic-human-edition-protected");
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
    try {
      await writeFile(target + ".auto-pending", candidates[locale], { flag: "wx", mode: 0o600 });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      if ((await readFile(target + ".auto-pending", "utf8")) !== candidates[locale])
        throw Error("automatic-pending-conflict");
    }
  }
  for (const locale of ["en", "es"] as const) {
    const target = join(root, "content/translations", locale, slug + ".mdx");
    await rename(target + ".auto-pending", target);
  }
}
