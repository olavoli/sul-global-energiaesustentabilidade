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
  type ScientificWarningSeverity,
  type ScientificWork,
} from "../../../scripts/scientific-radar/contracts";
import { scientificCategoryLabels } from "../../../scripts/scientific-radar/taxonomy";
import { highestWarningSeverity } from "../../../scripts/scientific-radar/warnings";
import { AdminEmpty } from "./AdminStates";

const severityLabels = {
  none: "Sem warnings",
  info: "Info",
  warning: "Warning",
  blocker: "Blocker",
} as const;

function parseEntries(entries: unknown[]): ScientificWork[] {
  return entries.flatMap((entry) => {
    const parsed = scientificWorkSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}

function WarningSummary({ entry }: { entry: ScientificWork }) {
  const severity = highestWarningSeverity(entry.warnings);
  return (
    <div className="min-w-64 space-y-2">
      <div className="flex flex-wrap gap-1">
        <Badge variant="outline">{entry.warnings.length} warnings</Badge>
        <Badge variant={severity === "blocker" ? "destructive" : "secondary"}>
          Maior severidade: {severityLabels[severity]}
        </Badge>
      </div>
      {entry.warnings.map((warning) => (
        <div key={`${warning.code}-${warning.source}`} className="rounded border p-2 text-xs">
          <strong className="block">
            {warning.code} · {severityLabels[warning.severity]}
          </strong>
          <span className="block">{warning.message}</span>
          <span className="block text-muted-foreground">
            Origem: {warning.source} · {warning.resolved ? "Resolvido" : "Não resolvido"}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AdminScientificRadar({ entries }: { entries: unknown[] }) {
  const [filter, setFilter] = useState("");
  const [warningFilter, setWarningFilter] = useState<
    "all" | "none" | ScientificWarningSeverity | "manual-review-required"
  >("all");
  const parsed = useMemo(() => parseEntries(entries), [entries]);
  const filtered = useMemo(() => {
    const term = filter.trim().toLocaleLowerCase("pt-BR");
    return parsed.filter((entry) => {
      const matchesWarning =
        warningFilter === "all" ||
        (warningFilter === "none" && entry.warnings.length === 0) ||
        (warningFilter === "manual-review-required" &&
          entry.warnings.some(({ code, resolved }) => code === warningFilter && !resolved)) ||
        entry.warnings.some(({ severity, resolved }) => severity === warningFilter && !resolved);
      if (!matchesWarning) return false;
      if (!term) return true;
      return [
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
        .includes(term);
    });
  }, [filter, parsed, warningFilter]);

  if (!parsed.length)
    return <AdminEmpty message="Nenhuma publicação científica no armazenamento privado." />;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium">
          Filtrar publicações
          <Input
            className="mt-2"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Título, DOI, autor, instituição ou categoria"
          />
        </label>
        <label className="block text-sm font-medium">
          Filtrar por warnings
          <select
            className="mt-2 h-10 w-full rounded-md border bg-background px-3"
            value={warningFilter}
            onChange={(event) => setWarningFilter(event.target.value as typeof warningFilter)}
          >
            <option value="all">Todos</option>
            <option value="none">Sem warnings</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="blocker">Blocker</option>
            <option value="manual-review-required">Requer revisão manual</option>
          </select>
        </label>
      </div>
      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Publicação</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Pontuação</TableHead>
              <TableHead>Journal / licença</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Warnings</TableHead>
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
                  <WarningSummary entry={entry} />
                </TableCell>
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
                  <Link
                    to="/admin/research-workspace/$scientificWorkId"
                    params={{ scientificWorkId: entry.id }}
                    className="text-primary underline underline-offset-4"
                  >
                    Workspace
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

export function AdminScientificRadarDetail({ entry }: { entry: unknown }) {
  const parsed = scientificWorkSchema.safeParse(entry);
  if (!parsed.success) return <AdminEmpty message="Registro científico inválido." />;
  const work = parsed.data;
  return (
    <section className="space-y-4 rounded-md border bg-card p-4">
      <div>
        <h2 className="font-serif text-2xl font-semibold">{work.title}</h2>
        <p className="font-mono text-sm">{work.doi}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">Score {work.score.total}</Badge>
        {work.categories.map((category) => (
          <Badge key={category} variant="secondary">
            {scientificCategoryLabels[category]}
          </Badge>
        ))}
      </div>
      <dl className="grid gap-3 text-sm md:grid-cols-2">
        <div>
          <dt className="font-medium">Periódico</dt>
          <dd>{work.journal ?? "Não informado"}</dd>
        </div>
        <div>
          <dt className="font-medium">Licença</dt>
          <dd>{work.license ?? "Não informada"}</dd>
        </div>
        <div>
          <dt className="font-medium">Acesso</dt>
          <dd>{work.openAccess ? "Open Access" : "Não aberto"}</dd>
        </div>
        <div>
          <dt className="font-medium">Revisão por pares</dt>
          <dd>{work.peerReviewStatus}</dd>
        </div>
      </dl>
      <div>
        <h3 className="mb-2 font-semibold">Warnings estruturados</h3>
        <WarningSummary entry={work} />
      </div>
      <Link
        to="/admin/research-workspace/$scientificWorkId"
        params={{ scientificWorkId: work.id }}
        className="inline-block text-primary underline underline-offset-4"
      >
        Abrir Workspace de Pesquisa
      </Link>
    </section>
  );
}
