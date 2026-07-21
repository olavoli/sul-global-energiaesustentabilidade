import type { EntityMemory } from "../../../scripts/scientific-memory/contracts";

export function filterScientificMemories(
  memories: EntityMemory[],
  term: string,
  type: string,
  year: string,
) {
  return memories.filter((memory) => {
    const related = [...memory.categories, ...memory.countries, ...memory.institutions]
      .map((id) => memories.find(({ canonicalId }) => canonicalId === id)?.name ?? id)
      .join(" ");
    return (
      (!term.trim() ||
        `${memory.name} ${memory.canonicalId} ${related}`
          .toLocaleLowerCase("pt-BR")
          .includes(term.trim().toLocaleLowerCase("pt-BR"))) &&
      (type === "all" || memory.type === type) &&
      (year === "all" || memory.timeline.some(({ year: value }) => value === Number(year)))
    );
  });
}
