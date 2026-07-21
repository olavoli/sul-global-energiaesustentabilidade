import type { EntityMemory } from "../scientific-memory/contracts";
import { hash } from "../scientific-memory/identity";

export interface TrendFixture {
  fixture: true;
  name: string;
  memory: EntityMemory;
  partialPeriod?: boolean;
}
const at = "2025-12-31T00:00:00.000Z";
export function fixture(
  name: string,
  values: number[],
  input: Partial<EntityMemory> = {},
): TrendFixture {
  const first = 2021;
  const timeline = values.map((count, index) => ({ year: first + index, count }));
  const active = timeline.filter(({ count }) => count > 0);
  const id = hash(`fixture:${name}`).slice(0, 16);
  return {
    fixture: true,
    name,
    memory: {
      id: `memory-category-${id}`,
      canonicalId: `category-${id}`,
      type: "category",
      name: `Fixture: ${name}`,
      firstSeen: first,
      lastSeen: first + values.length - 1,
      articleCount: values.reduce((sum, value) => sum + value, 0),
      timeline,
      categories: [`category-${id}`],
      countries: ["country-fixture-br", "country-fixture-za"],
      institutions: ["institution-fixture-a", "institution-fixture-b"],
      sources: Array.from(
        { length: values.reduce((sum, value) => sum + value, 0) },
        (_, index) => `radar-${index.toString(16).padStart(16, "0")}`,
      ),
      growthRate: 0,
      firstAppearance: first,
      lastAppearance: first + values.length - 1,
      yearsActive: active.length,
      updatedAt: at,
      ...input,
    },
  };
}
export const trendFixtures: TrendFixture[] = [
  fixture("crescimento-continuo", [1, 2, 4, 7]),
  fixture("queda-continua", [7, 4, 2, 1]),
  fixture("estabilidade", [2, 2, 2, 2]),
  fixture("volatilidade", [1, 8, 1, 9]),
  fixture("ano-faltante", [2, 0, 3, 4]),
  fixture("baseline-zero", [0, 2, 3, 5]),
  fixture("entidade-nova", [5]),
  fixture("amostra-insuficiente", [1, 1, 1]),
  fixture("concentracao-geografica", [1, 2, 3], { countries: ["country-fixture-br"] }),
  fixture("concentracao-institucional", [1, 2, 3], { institutions: ["institution-fixture-a"] }),
  fixture("concentracao-periodico", [1, 2, 3], { type: "journal" }),
  {
    ...fixture("periodo-parcial", [1, 2, 3, 1], { updatedAt: "2024-06-30T00:00:00.000Z" }),
    partialPeriod: true,
  },
  fixture("aceleracao-positiva", [1, 2, 4, 8]),
  fixture("aceleracao-negativa", [8, 5, 3, 2]),
  fixture("observacoes-duplicadas", [1, 2, 2]),
  fixture("metadados-incompletos", [1, 2, 3], { countries: [], institutions: [] }),
];
