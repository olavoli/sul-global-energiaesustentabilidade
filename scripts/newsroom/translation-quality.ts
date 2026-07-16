import type { QualityCheck } from "./translation-schema";

function matches(pattern: RegExp, value: string): string[] {
  return value.match(pattern)?.sort() ?? [];
}

export function runQualityChecks(source: string, translated: string): QualityCheck[] {
  const compare = (name: string, pattern: RegExp): QualityCheck => {
    const before = matches(pattern, source);
    const after = matches(pattern, translated);
    const passed = JSON.stringify(before) === JSON.stringify(after);
    return {
      name,
      passed,
      detail: passed
        ? `${name} preservados.`
        : `${name} divergentes: ${before.join(", ")} → ${after.join(", ")}.`,
    };
  };
  const checks: QualityCheck[] = [
    compare("números", /\b\d+(?:[.,]\d+)?\b/g),
    compare("unidades", /\b(?:kW|MW|GW|kWh|MWh|GWh|°C|kg|km|%)\b/g),
    compare("datas", /\b\d{4}-\d{2}-\d{2}\b/g),
    compare("URLs", /https?:\/\/\S+/g),
    compare("siglas", /\b[A-Z]{2,8}\b/g),
    compare("nomes próprios", /(?<!^)\b[A-Z][a-z]{2,}\b/g),
    {
      name: "HTML",
      passed: !/<[^>]+>/.test(translated) || /<[^>]+>/.test(source),
      detail: "Nenhum HTML novo permitido.",
    },
    {
      name: "conteúdo",
      passed: translated.trim().length > 0 && translated.length <= Math.max(700, source.length * 2),
      detail: "Texto não vazio e dentro do limite.",
    },
    {
      name: "idioma-alvo",
      passed: /\b(?:a|as|como|da|de|do|e|em|melhor|para|por|uma)\b/i.test(translated),
      detail: "Indício lexical mínimo de pt-BR; revisão humana continua obrigatória.",
    },
  ];
  return checks;
}

export function qualityPassed(checks: QualityCheck[]): boolean {
  return checks.every(({ passed }) => passed);
}
