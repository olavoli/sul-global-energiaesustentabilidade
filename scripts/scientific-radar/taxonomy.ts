import type { ScientificCategory } from "./contracts";

const taxonomy: Record<ScientificCategory, readonly string[]> = {
  solar: ["solar", "photovoltaic", "photovoltaics", "pv", "fotovoltaica"],
  wind: ["wind energy", "wind power", "wind turbine", "offshore wind", "eólica"],
  nuclear: ["nuclear energy", "nuclear power", "fission", "fusion energy", "nuclear reactor"],
  "green-hydrogen": ["green hydrogen", "renewable hydrogen", "electrolysis", "electrolyzer"],
  batteries: ["battery", "batteries", "lithium-ion", "sodium-ion", "solid-state battery"],
  storage: ["energy storage", "thermal storage", "pumped storage", "storage system"],
  carbon: ["carbon capture", "carbon market", "carbon pricing", "decarbonization", "co2 capture"],
  "smart-grid": ["smart grid", "microgrid", "demand response", "grid flexibility", "power grid"],
  mobility: [
    "electric vehicle",
    "e-mobility",
    "transport electrification",
    "charging infrastructure",
  ],
  "ai-energy": [
    "artificial intelligence",
    "machine learning",
    "deep learning",
    "neural network",
    "energy ai",
  ],
  "public-policy": [
    "public policy",
    "energy policy",
    "regulation",
    "governance",
    "just transition",
  ],
  market: [
    "energy market",
    "electricity market",
    "energy finance",
    "investment",
    "energy economics",
  ],
};

export const scientificCategoryLabels: Record<ScientificCategory, string> = {
  solar: "Solar",
  wind: "Eólica",
  nuclear: "Nuclear",
  "green-hydrogen": "Hidrogênio Verde",
  batteries: "Baterias",
  storage: "Armazenamento",
  carbon: "Carbono",
  "smart-grid": "Smart Grid",
  mobility: "Mobilidade",
  "ai-energy": "IA aplicada à energia",
  "public-policy": "Políticas Públicas",
  market: "Mercado",
};

export function classifyScientificWork(input: {
  title: string;
  abstract?: string | null;
  keywords?: string[];
  topics?: string[];
}): Array<{ category: ScientificCategory; matches: number }> {
  const haystack = [
    input.title,
    input.abstract ?? "",
    ...(input.keywords ?? []),
    ...(input.topics ?? []),
  ]
    .join(" ")
    .toLocaleLowerCase("en");
  return Object.entries(taxonomy)
    .map(([category, terms]) => ({
      category: category as ScientificCategory,
      matches: terms.filter((term) => haystack.includes(term)).length,
    }))
    .filter(({ matches }) => matches > 0)
    .sort((a, b) => b.matches - a.matches || a.category.localeCompare(b.category));
}

export function relatedExistingCategories(categories: ScientificCategory[]): string[] {
  const related = new Set(["ciencia"]);
  for (const category of categories) {
    if (["solar", "wind", "nuclear", "green-hydrogen", "batteries", "storage"].includes(category)) {
      related.add("energia");
      related.add("tecnologia");
      related.add("transicao-energetica");
    }
    if (["carbon", "mobility"].includes(category)) related.add("sustentabilidade");
    if (["public-policy", "market"].includes(category)) related.add("desenvolvimento");
    if (["smart-grid", "ai-energy"].includes(category)) related.add("tecnologia");
  }
  return [...related].sort();
}
