import { deterministic, type Locale, type Finding } from "../i18n-simulation/pipeline";
/** Only external ASCII layout whitespace; no internal or Unicode normalization. */
export const outerWhitespace = (body: string) => body.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, "");
const credits = {
  en: "Source: Original work (SGES, 2026).",
  es: "Fuente: Elaboración propia (SGES, 2026).",
};
const sourceCredit = "Fonte: Elaboração própria (SGES, 2026).";
export function localizedCredit(value: string | undefined, locale: Locale) {
  return value === sourceCredit ? credits[locale] : value;
}
/** Bibliographic entries, attribution identities, URLs and licenses are never translated here. */
export function localizedLabels(body: string, locale: Locale) {
  return body
    .replace(/^## Referências[ \t]*$/gm, locale === "en" ? "## References" : "## Referencias")
    .replaceAll(`credit="${sourceCredit}"`, `credit="${credits[locale]}"`);
}
function comparisonBody(body: string) {
  return outerWhitespace(body)
    .replace(/^## (References|Referencias)[ \t]*$/gm, "## Referências")
    .replaceAll(`credit="${credits.en}"`, `credit="${sourceCredit}"`)
    .replaceAll(`credit="${credits.es}"`, `credit="${sourceCredit}"`);
}
export function editorialDeterministic(source: string, target: string, locale: Locale) {
  return deterministic(comparisonBody(source), comparisonBody(target), locale);
}
/** Localize unambiguous source-grounded prose decimals only. Three-digit fractions are ambiguous. */
export function proseNumbers(source: string, target: string, locale: Locale) {
  const changes: { from: string; to: string }[] = [];
  if (/[=]|https?:\/\/|www\./.test(source) || /[=]|https?:\/\/|www\./.test(target))
    return { text: target, changes };
  const decimal = /(?<![\p{L}\p{N}_./:#-])(\d+),(\d{1,2})(?![\p{L}\p{N}_.,/:#-])/gu;
  const permitted = new Set([...source.matchAll(decimal)].map((m) => m[1] + "." + m[2]));
  const text = target.replace(
    /(?<![\p{L}\p{N}_./:#-])(\d+)[,.](\d{1,2})(?![\p{L}\p{N}_.,/:#-])/gu,
    (match, a, b) => {
      if (!permitted.has(a + "." + b)) return match;
      const replacement = a + (locale === "en" ? "." : ",") + b;
      if (match !== replacement) changes.push({ from: match, to: replacement });
      return replacement;
    },
  );
  return { text, changes };
}
export function editorialWarnings(
  source: string,
  target: string,
  locale: Locale,
  segment?: string,
): Finding[] {
  const findings: Finding[] = [];
  const warn = (code: string) =>
    findings.push({ severity: "review", code, ...(segment ? { segment } : {}) });
  const connectors = [
    [/\bNo segundo(?: caso)?,/i, locale === "en" ? /\bsecond\b/i : /\bsegundo\b/i],
    [/\bNo primeiro caso,/i, locale === "en" ? /\bfirst\b/i : /\bprimer\b/i],
  ] as const;
  if (
    connectors.some(([original, translated]) => original.test(source) && !translated.test(target))
  )
    warn("connector-possibly-omitted");
  if (
    locale === "en" &&
    (/\b[Aa] (?:more powerful )?equipment\b/.test(target) ||
      /\bWhy no machine is[^?]*\?/.test(target) ||
      /The magnitude continues/.test(target))
  )
    warn("grammar-suspect-en");
  if (locale === "es" && (/\btambi[eé]n no\b/i.test(target) || /Qué es potencia\b/.test(target)))
    warn("grammar-suspect-es");
  if (locale === "en" && /\d,\d/.test(target) && /=/.test(source))
    warn("protected-formula-decimal-locale-review");
  return findings;
}
export function portugueseLinkWarnings(body: string): Finding[] {
  return [...new Set([...body.matchAll(/\]\((\/artigo\/[^)]+)\)/g)].map((m) => m[1]))].map(
    (target) => ({ severity: "review", code: "internal-link-portuguese-target", target }),
  );
}
export function translationDisclosure(locale: Locale) {
  return locale === "en"
    ? "This language edition was translated using Cloudflare Workers AI (Meta Llama 3.3 70B). Human editorial review is pending; this draft is not approved for publication."
    : "Esta edición lingüística se tradujo mediante Cloudflare Workers AI (Meta Llama 3.3 70B). La revisión editorial humana está pendiente; este borrador no está aprobado para publicación.";
}
