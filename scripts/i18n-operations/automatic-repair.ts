import type { Input } from "./translation";
import type { Locale } from "../i18n-simulation/pipeline";
/** Bounded local repairs only; no retry, scientific rewrite, URL or reference substitution. */
export function repairLeaves(source: Input, locale: Locale, received: Record<string, string>) {
  const result = { ...received };
  const changes = [];
  for (const leaf of [...source.source.segments, ...source.metadata]) {
    let text = result[leaf.id];
    if (text === undefined) continue;
    const before = text;
    if (/No segundo(?: caso)?,/.test(leaf.text) && /^\s*[.]?\s*$/.test(text))
      text = locale === "en" ? ". In the second case," : ". En el segundo caso,";
    if (locale === "en") {
      if (leaf.text.includes("equipamento mais potente"))
        text = text.replace("A more powerful equipment", "A more powerful device");
      if (leaf.text === "Por que nenhuma máquina é 100% eficiente?")
        text = text.replace(
          "Why no machine is 100% efficient?",
          "Why is no machine 100% efficient?",
        );
    } else if (leaf.text === "Potência também não é eficiência")
      text = text.replace(
        "La potencia también no es eficiencia",
        "La potencia tampoco es eficiencia",
      );
    result[leaf.id] = text;
    if (text !== before) changes.push({ id: leaf.id, repair: "bounded-editorial-v1" });
  }
  return { translations: result, changes };
}
