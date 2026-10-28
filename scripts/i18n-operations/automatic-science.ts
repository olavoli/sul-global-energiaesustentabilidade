/** Conservative lexical checks, not a scientific or semantic certification. */
const unitMap: Record<string, string> = {
  segundo: "s",
  segundos: "s",
  second: "s",
  seconds: "s",
  minuto: "min",
  minutos: "min",
  minute: "min",
  minutes: "min",
  hora: "h",
  horas: "h",
  hour: "h",
  hours: "h",
  joule: "J",
  joules: "J",
  julio: "J",
  julios: "J",
  watt: "W",
  watts: "W",
  vatio: "W",
  vatios: "W",
  quilowatt: "kW",
  quilowatts: "kW",
  kilowatt: "kW",
  kilowatts: "kW",
  kilovatio: "kW",
  kilovatios: "kW",
  quilovatio: "kW",
  quilovatios: "kW",
  megawatt: "MW",
  megawatts: "MW",
  megavatio: "MW",
  megavatios: "MW",
};
const symbols =
  "TWh|GWh|MWh|kWh|Wh|TW|GW|MW|kW|W|GJ|MJ|kJ|J|MPa|kPa|Pa|GHz|MHz|kHz|Hz|kV|mV|V|mA|A|km|cm|mm|m|kg|mg|g|mL|L|°C|K|s|h|%";
const wordUnits: Record<string, string> = { ...unitMap };
for (const [word, unit] of Object.entries(unitMap))
  wordUnits[word[0].toUpperCase() + word.slice(1)] = unit;
const words = Object.keys(wordUnits)
  .sort((a, b) => b.length - a.length)
  .join("|");
const tokenWords = Object.keys(wordUnits)
  .filter((w) => !["second", "segundo", "minute", "minuto"].includes(w.toLowerCase()))
  .sort((a, b) => b.length - a.length)
  .join("|");
const tokenSymbols = symbols
  .split("|")
  .filter((s) => s.length > 1 || s === "W" || s === "J")
  .join("|");
function tokens(text: string) {
  const ordinary = [
    ...text.matchAll(
      new RegExp(`(?<![\\p{L}\\p{N}_])(${tokenSymbols}|${tokenWords})(?![\\p{L}\\p{N}_])`, "gu"),
    ),
  ].map((m) => wordUnits[m[1]] ?? m[1]);
  const contextual = [
    ...text.matchAll(/\b(?:por|per|cada|every)\s+(segundo|second|minuto|minute)\b/gi),
  ].map((m) => unitMap[m[1].toLowerCase()]);
  return [...ordinary, ...contextual].sort();
}
function quantities(text: string) {
  return [
    ...text.matchAll(
      new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(${symbols}|${words})(?![\\p{L}\\p{N}_])`, "gu"),
    ),
  ]
    .map((m) => m[1].replace(",", ".") + ":" + (wordUnits[m[2]] ?? m[2]))
    .sort();
}
const technicalMarks = (text: string) =>
  [...text.matchAll(/[\p{Script=Greek}∆∑√∂∫∞≤≥≠×÷]/gu)].map((m) => m[0]).sort();
export function scientificTokensMatch(source: string, target: string) {
  return (
    JSON.stringify(technicalMarks(source)) === JSON.stringify(technicalMarks(target)) &&
    JSON.stringify(tokens(source)) === JSON.stringify(tokens(target)) &&
    JSON.stringify(quantities(source)) === JSON.stringify(quantities(target))
  );
}
