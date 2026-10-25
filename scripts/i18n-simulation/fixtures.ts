import {
  dimensions,
  hash,
  type Context,
  type Locale,
  type Prepared,
  type SemanticReport,
  type TranslationProvider,
} from "./pipeline";

export const context: Context = {
  articleId: "SYNTHETIC-001",
  synthetic: true,
  category: "ciencia",
  contentType: "explainer",
  documentaryCaveat: false,
  pendingEvidence: false,
};
export const sourceBody = `# Experimento sintético

A estimativa de 21 Mt não comprova produção. [1]

Em 2024, a eficiência pode atingir 60% sob condições controladas.

LER = 0,80 + 0,75 = 1,55.

A temperatura foi 4 °C; energia de 2 kWh.

Recursos não são reservas. Registros administrativos exigem ressalva documental.

<Callout title="Ressalva">A estimativa não é um fato confirmado.</Callout>

<Figure src="/fixture-only.svg" alt="Ilustração sintética" caption="Exemplo sintético" credit="Fixture only" />

[Documento](https://example.invalid/evidence)

## Referências

[1] Synthetic fixture, 2024. https://example.invalid/evidence
`;
const dictionary: Record<string, Record<Locale, string>> = {
  "Experimento sintético": { en: "Synthetic experiment", es: "Experimento sintético" },
  "A estimativa de 21 Mt não comprova produção. [1]": {
    en: "The estimate of 21 Mt does not prove production. [1]",
    es: "La estimación de 21 Mt no demuestra producción. [1]",
  },
  "Em 2024, a eficiência pode atingir 60% sob condições controladas.": {
    en: "In 2024, efficiency may reach 60% under controlled conditions.",
    es: "En 2024, la eficiencia puede alcanzar 60% bajo condiciones controladas.",
  },
  "LER = 0,80 + 0,75 = 1,55.": { en: "LER = 0.80 + 0.75 = 1.55.", es: "LER = 0,80 + 0,75 = 1,55." },
  "A temperatura foi 4 °C; energia de 2 kWh.": {
    en: "Temperature was 4 °C; energy of 2 kWh.",
    es: "La temperatura fue 4 °C; energía de 2 kWh.",
  },
  "Recursos não são reservas. Registros administrativos exigem ressalva documental.": {
    en: "Resources are not reserves. Administrative records require a documentary caveat.",
    es: "Los recursos no son reservas. Los registros administrativos exigen una salvedad documental.",
  },
  Ressalva: { en: "Caveat", es: "Salvedad" },
  "A estimativa não é um fato confirmado.": {
    en: "The estimate is not a confirmed fact.",
    es: "La estimación no es un hecho confirmado.",
  },
  "Ilustração sintética": { en: "Synthetic illustration", es: "Ilustración sintética" },
  "Exemplo sintético": { en: "Synthetic example", es: "Ejemplo sintético" },
  Documento: { en: "Document", es: "Documento" },
};
/** Dictionary fixture, not AI output; unknown text fails rather than being invented. */
export class FixtureProvider implements TranslationProvider {
  id = "offline-fixture";
  modelVersion = "dictionary-v1";
  requests = 0;
  async translate(segments: Prepared["segments"], locale: Locale) {
    this.requests++;
    return Object.fromEntries(
      segments.map((s) => {
        const text = dictionary[s.text]?.[locale];
        if (!text) throw new Error(`No fixture translation for ${s.id}`);
        return [s.id, text];
      }),
    );
  }
}
/** Fixed reference fixture exercises the independent-verifier contract. It is NOT an AI review. */
export function fixtureSemantic(
  source: Prepared,
  target: Prepared,
  locale: Locale,
): SemanticReport {
  const changed = source.segments.findIndex(
    (s, i) => dictionary[s.text]?.[locale] !== target.segments[i]?.text,
  );
  const evidenceIndex = changed < 0 ? 1 : changed;
  const sourceQuote = source.segments[evidenceIndex].text;
  const targetQuote = target.segments[evidenceIndex]?.text ?? target.body;
  // A deliberately fixed oracle for synthetic regression only; it does not infer scientific truth.
  const dimension = /condi|control/i.test(sourceQuote)
    ? "conditions"
    : /estim|estimate/i.test(sourceQuote)
      ? "estimates"
      : /recursos|reservas|administrativos/i.test(sourceQuote)
        ? "mineral-terms"
        : "conclusions";
  return {
    sourceHash: hash(source.body),
    targetHash: hash(target.body),
    provider: "independent-fixture",
    modelVersion: "reference-v1",
    origin: "fixture",
    checks: dimensions.map((d) => ({
      dimension: d,
      sourceQuote,
      targetQuote,
      result: changed >= 0 && d === dimension ? "contradiction" : "equivalent",
      explanation:
        changed >= 0 && d === dimension
          ? "Changed segment contradicts the fixed bilingual fixture; no AI inference executed"
          : "Synthetic reference fixture only; this is not an independent AI judgment",
    })),
  };
}
