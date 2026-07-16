import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminEmpty } from "./AdminStates";

type Entry = Record<string, unknown>;

function mainText(entry: Entry): string {
  return String(
    entry.provisionalTitle ??
      entry.canonicalTitle ??
      entry.name ??
      entry.summary ??
      entry.id ??
      "Registro",
  );
}

export function AdminSectionList({ section, entries }: { section: string; entries: unknown[] }) {
  const [filter, setFilter] = useState("");
  const filtered = useMemo(
    () =>
      entries
        .filter((entry): entry is Entry => Boolean(entry && typeof entry === "object"))
        .filter((entry) => JSON.stringify(entry).toLowerCase().includes(filter.toLowerCase())),
    [entries, filter],
  );
  if (!entries.length) return <AdminEmpty />;
  return (
    <div className="space-y-4">
      <label className="block max-w-md text-sm font-medium">
        Filtrar registros
        <Input
          className="mt-2"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Risco, tema, fonte, estado ou ID"
        />
      </label>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Registro</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Risco / recomendação</TableHead>
              <TableHead className="text-right">Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((entry) => {
              const id = String(entry.id ?? entry.sourceId ?? "");
              return (
                <TableRow key={id || mainText(entry)}>
                  <TableCell>
                    <span className="block max-w-xl font-medium">{mainText(entry)}</span>
                    <span className="text-xs text-muted-foreground">{id}</span>
                  </TableCell>
                  <TableCell>
                    {String(entry.status ?? entry.state ?? entry.active ?? "—")}
                  </TableCell>
                  <TableCell>
                    {String(entry.risk ?? entry.riskLevel ?? entry.recommendation ?? "—")}
                  </TableCell>
                  <TableCell className="text-right">
                    {section === "sources" ||
                    id.startsWith(`${section.slice(0, -1)}-`) ||
                    /^(?:inbox|decision|cluster|translation|run|pitch)-/.test(id) ? (
                      <Link
                        to="/admin/newsroom/$section/$id"
                        params={{ section, id }}
                        className="text-primary underline underline-offset-4"
                      >
                        Abrir
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Somente leitura</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {!filtered.length && <AdminEmpty message="Nenhum registro corresponde ao filtro." />}
    </div>
  );
}
