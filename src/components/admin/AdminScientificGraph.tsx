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
  scientificGraphSchema,
  type ScientificGraph,
} from "../../../scripts/scientific-graph/contracts";
import { AdminEmpty } from "./AdminStates";

function parseGraphs(entries: unknown[]): ScientificGraph[] {
  return entries.flatMap((entry) => {
    const parsed = scientificGraphSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}

export function AdminScientificGraph({ entries }: { entries: unknown[] }) {
  const graphs = useMemo(() => parseGraphs(entries), [entries]);
  const [term, setTerm] = useState("");
  const [relationType, setRelationType] = useState("all");
  const [confidence, setConfidence] = useState("all");
  const [status, setStatus] = useState("all");
  const rows = useMemo(
    () =>
      graphs
        .flatMap((graph) =>
          graph.relations.map((relation) => ({
            relation,
            from: graph.nodes.find(({ id }) => id === relation.from),
            to: graph.nodes.find(({ id }) => id === relation.to),
          })),
        )
        .filter(({ relation, from, to }) => {
          const search = `${from?.label ?? ""} ${to?.label ?? ""}`.toLocaleLowerCase("pt-BR");
          return (
            (!term.trim() || search.includes(term.trim().toLocaleLowerCase("pt-BR"))) &&
            (relationType === "all" || relation.type === relationType) &&
            (confidence === "all" || relation.confidence === confidence) &&
            (status === "all" || relation.humanStatus === status)
          );
        }),
    [graphs, term, relationType, confidence, status],
  );
  if (!graphs.length)
    return <AdminEmpty message="Nenhum grafo científico persistido. O dry-run não aparece aqui." />;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <label className="text-sm font-medium">
          Filtrar nós
          <Input className="mt-2" value={term} onChange={(event) => setTerm(event.target.value)} />
        </label>
        <label className="text-sm font-medium">
          Relação
          <select
            className="mt-2 h-10 w-full rounded-md border bg-background px-3"
            value={relationType}
            onChange={(event) => setRelationType(event.target.value)}
          >
            <option value="all">Todas</option>
            {[...new Set(graphs.flatMap(({ relations }) => relations.map(({ type }) => type)))].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
        </label>
        <label className="text-sm font-medium">
          Confiança
          <select
            className="mt-2 h-10 w-full rounded-md border bg-background px-3"
            value={confidence}
            onChange={(event) => setConfidence(event.target.value)}
          >
            <option value="all">Todas</option>
            <option value="confirmed">Confirmada</option>
            <option value="probable">Provável</option>
            <option value="uncertain">Incerta</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Estado humano
          <select
            className="mt-2 h-10 w-full rounded-md border bg-background px-3"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">Todos</option>
            <option value="unread">Não lida</option>
            <option value="reviewed">Revisada</option>
            <option value="accepted">Aceita</option>
            <option value="rejected">Rejeitada</option>
            <option value="needs-context">Pede contexto</option>
          </select>
        </label>
      </div>
      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nó de origem</TableHead>
              <TableHead>Relação</TableHead>
              <TableHead>Nó de destino</TableHead>
              <TableHead>Fonte</TableHead>
              <TableHead>Confiança</TableHead>
              <TableHead>Warnings</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ relation, from, to }) => (
              <TableRow key={relation.id}>
                <TableCell>
                  {from?.label ?? relation.from}
                  <span className="block text-xs text-muted-foreground">{from?.type}</span>
                </TableCell>
                <TableCell>
                  <Link
                    to="/admin/newsroom/$section/$id"
                    params={{ section: "scientific-graph", id: relation.id }}
                    className="text-primary underline underline-offset-4"
                  >
                    {relation.type}
                  </Link>
                </TableCell>
                <TableCell>
                  {to?.label ?? relation.to}
                  <span className="block text-xs text-muted-foreground">{to?.type}</span>
                </TableCell>
                <TableCell>{relation.source.join(", ")}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{relation.confidence}</Badge>
                </TableCell>
                <TableCell>{relation.warnings.join(", ") || "Nenhum"}</TableCell>
                <TableCell>{relation.humanStatus}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!rows.length && <AdminEmpty message="Nenhuma relação corresponde aos filtros." />}
    </div>
  );
}
