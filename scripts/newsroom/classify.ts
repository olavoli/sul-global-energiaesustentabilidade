import type { CollectedItem, NewsSource, TopicResult } from "./schema";

export const topicDictionary: Readonly<Record<string, readonly string[]>> = {
  "energia solar": ["solar", "fotovoltaic"],
  "energia eólica": ["eolic", "wind power"],
  hidrogênio: ["hidrogen", "hydrogen"],
  armazenamento: ["armazenamento", "bateria", "storage"],
  eletricidade: ["eletric", "rede", "grid"],
  combustíveis: ["combustivel", "fuel", "biocombustivel"],
  "eficiência energética": ["eficiencia energetica", "energy efficiency"],
  nuclear: ["nuclear"],
  biomassa: ["biomassa", "bioenergia"],
  clima: ["clima", "climate", "emissao"],
  "mercado de carbono": ["carbono", "carbon market"],
  "política energética": ["politica energetica", "energy policy"],
  regulação: ["regulacao", "regulatorio", "regulation"],
  "pesquisa e inovação": ["pesquisa", "inovacao", "research"],
  sustentabilidade: ["sustentab", "sustainable"],
  "minerais críticos": ["mineral critico", "critical mineral", "litio"],
  "Sul Global": ["sul global", "brasil", "america latina", "africa", "asia", "global south"],
};

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const exactKeywords = new Set(["asia", "africa", "brasil"]);

function matchesKeyword(text: string, keyword: string): boolean {
  const normalized = fold(keyword);
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const suffix = exactKeywords.has(normalized) ? "(?=$|[^a-z0-9])" : "";
  return new RegExp(`(^|[^a-z0-9])${escaped}${suffix}`, "i").test(text);
}

export function classifyItem(item: CollectedItem, source?: NewsSource): TopicResult[] {
  const fields = [
    { name: "título", text: fold(item.title), weight: 3 },
    { name: "categorias", text: fold(item.categories.join(" ")), weight: 2 },
    { name: "snippet", text: fold(item.contentSnippet), weight: 1 },
    { name: "fonte", text: fold(source?.topics.join(" ") ?? ""), weight: 1 },
  ];
  const results: TopicResult[] = [];
  for (const [topic, keywords] of Object.entries(topicDictionary)) {
    let score = 0;
    const reasons: string[] = [];
    for (const field of fields) {
      const matches = keywords.filter((keyword) => matchesKeyword(field.text, keyword));
      if (matches.length > 0) {
        score += field.weight * matches.length;
        reasons.push(`${field.name}: ${matches.join(", ")} (+${field.weight * matches.length})`);
      }
    }
    if (score > 0) results.push({ topic, score, reasons });
  }
  return results.length > 0
    ? results.sort((a, b) => b.score - a.score || a.topic.localeCompare(b.topic))
    : [
        {
          topic: "unclassified",
          score: 0,
          reasons: ["Nenhuma regra temática encontrou evidência."],
        },
      ];
}
