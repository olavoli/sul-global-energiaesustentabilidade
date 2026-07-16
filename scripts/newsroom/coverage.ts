import type { NewsSource, QueueItem } from "./schema";

const LATIN_AMERICA = new Set([
  "AR",
  "BO",
  "BR",
  "CL",
  "CO",
  "CR",
  "CU",
  "EC",
  "MX",
  "PE",
  "PY",
  "UY",
  "VE",
]);
const AFRICA = new Set(["AO", "DZ", "EG", "ET", "GH", "KE", "MA", "MZ", "NG", "ZA"]);
const ASIA = new Set(["BD", "CN", "ID", "IN", "JP", "KR", "MY", "PH", "PK", "SG", "TH", "VN"]);
const NORTH_GLOBAL = new Set([
  "AT",
  "AU",
  "BE",
  "CA",
  "CH",
  "DE",
  "DK",
  "ES",
  "FI",
  "FR",
  "GB",
  "IE",
  "IT",
  "NL",
  "NO",
  "PT",
  "SE",
  "US",
]);

export interface CoverageReport {
  themes: Record<string, number>;
  countries: Record<string, number>;
  regions: Record<string, number>;
  languages: Record<string, number>;
  sourceTypes: Record<string, number>;
  trustTiers: Record<string, number>;
  institutions: Record<string, number>;
  alerts: string[];
}

function count(values: readonly string[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const value of values) result[value] = (result[value] ?? 0) + 1;
  return result;
}

function region(country: string): string {
  if (LATIN_AMERICA.has(country)) return "América Latina";
  if (AFRICA.has(country)) return "África";
  if (ASIA.has(country)) return "Ásia";
  if (NORTH_GLOBAL.has(country)) return "Norte Global";
  return "Outra/não classificada";
}

export function buildCoverageReport(
  sources: readonly NewsSource[],
  queue: readonly QueueItem[] = [],
): CoverageReport {
  const countries = sources.flatMap((source) => source.countries);
  const regions = countries.map(region);
  const themes = [
    ...sources.flatMap((source) => source.topics),
    ...queue.flatMap((item) => item.topics.map(({ topic }) => topic)),
  ];
  const institutions = sources.map((source) => new URL(source.homepage).hostname);
  const alerts: string[] = [];
  if (sources.length === 0)
    alerts.push("Catálogo real vazio; cobertura ainda não pode ser avaliada empiricamente.");
  if (countries.length > 0 && countries.every((country) => country === "BR")) {
    alerts.push("Cobertura concentrada exclusivamente em fontes brasileiras.");
  }
  if (countries.length > 0 && countries.every((country) => NORTH_GLOBAL.has(country))) {
    alerts.push("Cobertura concentrada exclusivamente no Norte Global.");
  }
  if (!regions.includes("América Latina")) alerts.push("Ausência de fontes da América Latina.");
  if (!regions.includes("África")) alerts.push("Ausência de fontes da África.");
  if (!regions.includes("Ásia")) alerts.push("Ausência de fontes da Ásia.");
  if (sources.length > 0 && sources.every(({ sourceType }) => sourceType === "company")) {
    alerts.push("Cobertura concentrada exclusivamente em fontes empresariais.");
  }
  if (institutions.length > 1 && new Set(institutions).size === 1) {
    alerts.push("Cobertura concentrada em uma única instituição.");
  }
  if (themes.length > 1 && new Set(themes).size === 1) {
    alerts.push("Cobertura concentrada em uma única tecnologia ou tema.");
  }
  if (!sources.some(({ trustTier }) => trustTier === "primary")) {
    alerts.push("Ausência de fontes primárias confirmadas.");
  }
  return {
    themes: count(themes),
    countries: count(countries),
    regions: count(regions),
    languages: count(sources.map(({ language }) => language)),
    sourceTypes: count(sources.map(({ sourceType }) => sourceType)),
    trustTiers: count(sources.map(({ trustTier }) => trustTier)),
    institutions: count(institutions),
    alerts,
  };
}
