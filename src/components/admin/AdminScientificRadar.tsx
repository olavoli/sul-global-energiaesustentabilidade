import { Link } from "@tanstack/react-router";
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
  scientificWorkSchema,
  type ScientificWork,
} from "../../../scripts/scientific-radar/contracts";
import { scientificCategoryLabels } from "../../../scripts/scientific-radar/taxonomy";
import { AdminEmpty } from "./AdminStates";

function parseEntries(entries: unknown[]): ScientificWork[] {
  return entries.flatMap((entry) => {
    const parsed = scientificWorkSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}

export function AdminScientificRadar({ entries }: { entries: unknown[] }) {
  const [filter, setFilter] = useState("");
  const parsed = useMemo(() => parseEntries(entries), [entries]);
  const filtered = useMemo(() => {
    const term = filter.trim().toLocaleLowerCase("pt-BR");
    if (!term) return parsed;
    return parsed.filter((entry) =>
      [
        entry.title,
        entry.doi,
        entry.journal,
        ...entry.authors,
        ...entry.institutions,
        ...entry.categories.map((category) => scientificCategoryLabels[category]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(term),
    );
  }, [filter, parsed]);

  if (!parsed.length) {
    return (
      <AdminEmpty message="Nenhuma publicação científica descoberta no armazenamento privado." />
    );
  }
  return (
    <div className="space-y-4">
      <label className="block max-w-md text-sm font-medium">
        Filtrar publicações
        <Input
          className="mt-2"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Título, DOI, autor, instituição ou categoria"
        />
      </label>
      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Publicação</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Pontuação</TableHead>
              <TableHead>Journal / licença</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Links oficiais</TableHead>
              <TableHead className="text-right">Decisão</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="min-w-80">
                  <span className="block font-medium">{entry.title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {entry.institutions.join(", ") || "Instituição não informada"}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {entry.authors.join(", ") || "Autores não informados"}
                  </span>
                  <span className="mt-1 block font-mono text-xs">{entry.doi}</span>
                </TableCell>
                <TableCell>
                  <div className="flex max-w-48 flex-wrap gap-1">
                    {entry.categories.map((category) => (
                      <Badge key={category} variant="secondary">
                        {scientificCategoryLabels[category]}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <strong>{entry.score.total}</strong>
                  <span className="block text-xs text-muted-foreground">{entry.status}</span>
                </TableCell>
                <TableCell className="min-w-48">
                  <span className="block">{entry.journal ?? "Não informado"}</span>
                  <span className="text-xs text-muted-foreground">
                    {entry.openAccess ? "Open Access" : "Acesso não aberto"} ·{" "}
                    {entry.license ?? "Licença não informada"}
                  </span>
                </TableCell>
                <TableCell>{entry.publicationDate}</TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    <a
                      href={entry.officialLinks.openAlex}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline underline-offset-4"
                    >
                      OpenAlex
                    </a>
                    <a
                      href={entry.officialLinks.doi}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline underline-offset-4"
                    >
                      DOI
                    </a>
                    <a
                      href={entry.officialLinks.crossref}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline underline-offset-4"
                    >
                      Crossref
                    </a>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    to="/admin/newsroom/$section/$id"
                    params={{ section: "scientific-radar", id: entry.id }}
                    className="text-primary underline underline-offset-4"
                  >
                    Revisar
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!filtered.length && <AdminEmpty message="Nenhuma publicação corresponde ao filtro." />}
    </div>
  );
}
