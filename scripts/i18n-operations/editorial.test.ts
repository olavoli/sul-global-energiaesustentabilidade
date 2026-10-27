import { test, expect } from "bun:test";
import {
  proseNumbers,
  editorialWarnings,
  localizedLabels,
  localizedCredit,
  editorialDeterministic,
  outerWhitespace,
  portugueseLinkWarnings,
  translationDisclosure,
} from "./editorial";
test("source-grounded prose decimals localize without inventing values", () => {
  expect(proseNumbers("A energia é 3,6 MJ.", "The energy is 3,6 MJ.", "en").text).toBe(
    "The energy is 3.6 MJ.",
  );
  expect(proseNumbers("A energia é 3,6 MJ.", "La energía es 3.6 MJ.", "es").text).toBe(
    "La energía es 3,6 MJ.",
  );
  expect(proseNumbers("O valor é 3,6.", "The value is 8,4.", "en").text).toBe("The value is 8,4.");
});
test("numbers never rewrite formulas URLs IDs or ambiguous separators", () => {
  for (const text of [
    "E = 3,6 MJ",
    "https://example.org/3,6",
    "ID_3,6",
    "ref-3,6",
    "3,600",
    "3.600",
    "1,234,567",
    "www.example.org/3,6",
  ]) {
    expect(proseNumbers(text, text, "en").text).toBe(text);
  }
});
test("connector loss is a review warning, never synthesized content", () => {
  expect(editorialWarnings(". No segundo, ", ".", "en", "s37")).toContainEqual({
    severity: "review",
    code: "connector-possibly-omitted",
    segment: "s37",
  });
  expect(editorialWarnings(". No segundo, ", ". In the second case, ", "en")).toEqual([]);
  expect(editorialWarnings(". No segundo, ", ". En el segundo caso, ", "es")).toEqual([]);
});
test("bounded grammar heuristics flag pilot defects without claiming perfect detection", () => {
  expect(editorialWarnings("Um equipamento", "A more powerful equipment", "en")[0].code).toBe(
    "grammar-suspect-en",
  );
  expect(editorialWarnings("Por quê?", "Why no machine is 100% efficient?", "en")[0].code).toBe(
    "grammar-suspect-en",
  );
  expect(
    editorialWarnings("também não", "La potencia también no es eficiencia", "es")[0].code,
  ).toBe("grammar-suspect-es");
  expect(editorialWarnings("tampouco", "La potencia tampoco es eficiencia", "es")).toEqual([]);
  expect(editorialWarnings("1 kWh = 3,6 MJ", "1 kWh = 3,6 MJ", "en")[0].code).toBe(
    "protected-formula-decimal-locale-review",
  );
});
test("only approved editorial labels localize and bibliographic records remain exact", () => {
  const source = "Texto.\n\n## Referências\n\n- NIST. _Watt._\n";
  const target = localizedLabels(source, "en");
  expect(target).toContain("## References");
  expect(target).toContain("- NIST. _Watt._");
  expect(localizedCredit("Fonte: Elaboração própria (SGES, 2026).", "en")).toBe(
    "Source: Original work (SGES, 2026).",
  );
  expect(localizedCredit(undefined, "en")).toBeUndefined();
  expect(localizedCredit("Photographer, CC BY 4.0", "en")).toBe("Photographer, CC BY 4.0");
  expect(
    editorialDeterministic(source, "\n\n" + target + "\n", "en").filter(
      (f) => f.severity === "critical",
    ),
  ).toEqual([]);
});
test("external ASCII normalization does not hide internal whitespace or Unicode", () => {
  expect(outerWhitespace(" \nA  B\n")).toBe("A  B");
  expect(outerWhitespace("\u00a0A\u00a0")).toBe("\u00a0A\u00a0");
  const a = "Text.\n\n## Referências\n";
  const b = "Text.\n\n---\n\n## References\n";
  expect(editorialDeterministic(a, b, "en").some((f) => f.severity === "critical")).toBe(true);
});
test("Portuguese link destinations are signalled without rewriting URLs", () => {
  const text = "[Energy](/artigo/o-que-e-energia) [Other](https://example.org/)";
  expect(portugueseLinkWarnings(text)).toHaveLength(1);
  expect(text).toContain("/artigo/o-que-e-energia");
  expect(translationDisclosure("en")).toContain("review is pending");
  expect(translationDisclosure("es")).toContain("está pendiente");
});
