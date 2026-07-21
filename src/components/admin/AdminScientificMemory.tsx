import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  entityMemorySchema,
  type EntityMemory,
} from "../../../scripts/scientific-memory/contracts";
import { AdminEmpty } from "./AdminStates";
import { filterScientificMemories } from "./scientific-memory-filter";

const labels: Record<EntityMemory["type"], string> = {
  author: "Autor",
  institution: "Instituição",
  category: "Categoria",
  journal: "Periódico",
  publisher: "Publisher",
  country: "País",
};

function relationshipNames(memory: EntityMemory, memories: EntityMemory[]) {
  return [...memory.categories, ...memory.countries, ...memory.institutions]
    .map((id) => memories.find(({ canonicalId }) => canonicalId === id)?.name ?? id)
    .join(", ");
}

export function AdminScientificMemory({ entries }: { entries: unknown[] }) {
  const memories = useMemo(
    () =>
      entries.flatMap((entry) => {
        const parsed = entityMemorySchema.safeParse(entry);
        return parsed.success ? [parsed.data] : [];
      }),
    [entries],
  );
  const [term, setTerm] = useState("");
  const [type, setType] = useState("all");
  const [year, setYear] = useState("all");
  const years = [
    ...new Set(memories.flatMap(({ timeline }) => timeline.map(({ year: value }) => value))),
  ].sort();
  const filtered = filterScientificMemories(memories, term, type, year);
  if (!memories.length) return <AdminEmpty message="Nenhuma memória temporal construída." />;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm font-medium">
          Filtrar entidade
          <Input
            className="mt-2"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Nome, ID ou relacionamento"
          />
        </label>
        <label className="text-sm font-medium">
          Tipo
          <select
            className="mt-2 h-10 w-full rounded-md border bg-background px-3"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="all">Todos</option>
            {Object.entries(labels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Ano
          <select
            className="mt-2 h-10 w-full rounded-md border bg-background px-3"
            value={year}
            onChange={(event) => setYear(event.target.value)}
          >
            <option value="all">Todos</option>
            {years.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entidade</TableHead>
              <TableHead>Primeira</TableHead>
              <TableHead>Última</TableHead>
              <TableHead>Quantidade</TableHead>
              <TableHead>Linha temporal</TableHead>
              <TableHead>Crescimento</TableHead>
              <TableHead>Relacionamentos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((memory) => (
              <TableRow key={memory.id}>
                <TableCell>
                  <span className="font-medium">{memory.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {labels[memory.type]} · {memory.canonicalId}
                  </span>
                </TableCell>
                <TableCell>{memory.firstAppearance}</TableCell>
                <TableCell>{memory.lastAppearance}</TableCell>
                <TableCell>{memory.articleCount}</TableCell>
                <TableCell>
                  {memory.timeline.map(({ year, count }) => `${year} → ${count}`).join(" · ")}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{memory.growthRate}%</Badge>
                </TableCell>
                <TableCell className="max-w-sm text-xs">
                  {relationshipNames(memory, memories) || "Nenhum"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!filtered.length && <AdminEmpty message="Nenhuma memória corresponde aos filtros." />}
    </div>
  );
}
