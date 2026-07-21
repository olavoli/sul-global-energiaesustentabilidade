import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  trendSignalSchema,
  trendStatuses,
  trendWarningCodes,
} from "../../../scripts/scientific-trends/contracts";
import { AdminEmpty } from "./AdminStates";
import { filterScientificTrends } from "./scientific-trend-filter";

const types = ["category", "author", "institution", "country", "journal", "publisher", "funder"];
export function AdminScientificTrends({ entries }: { entries: unknown[] }) {
  const signals = useMemo(
    () =>
      entries.flatMap((entry) => {
        const parsed = trendSignalSchema.safeParse(entry);
        return parsed.success ? [parsed.data] : [];
      }),
    [entries],
  );
  const [filters, setFilters] = useState({
    type: "all",
    status: "all",
    confidence: "all",
    warning: "all",
    period: "all",
    coverage: "all",
    term: "",
  });
  const set = (key: keyof typeof filters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const years = [
    ...new Set(signals.flatMap(({ yearlySeries }) => yearlySeries.map(({ year }) => year))),
  ].sort();
  const filtered = filterScientificTrends(signals, filters);
  if (!signals.length) return <AdminEmpty message="Nenhum sinal temporal persistido." />;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <label className="text-sm font-medium">
          Entidade
          <Input
            className="mt-2"
            value={filters.term}
            onChange={(event) => set("term", event.target.value)}
          />
        </label>
        <Select
          label="Tipo"
          value={filters.type}
          values={types}
          onChange={(value) => set("type", value)}
        />
        <Select
          label="Status"
          value={filters.status}
          values={trendStatuses}
          onChange={(value) => set("status", value)}
        />
        <Select
          label="Confiança"
          value={filters.confidence}
          values={["none", "low", "moderate", "high"]}
          onChange={(value) => set("confidence", value)}
        />
        <Select
          label="Warning"
          value={filters.warning}
          values={trendWarningCodes}
          onChange={(value) => set("warning", value)}
        />
        <Select
          label="Período"
          value={filters.period}
          values={years.map(String)}
          onChange={(value) => set("period", value)}
        />
        <Select
          label="Cobertura"
          value={filters.coverage}
          values={["low", "eligible"]}
          onChange={(value) => set("coverage", value)}
        />
      </div>
      <div className="space-y-3">
        {filtered.map((signal) => (
          <article key={signal.id} className="rounded-md border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <strong>{signal.entityName}</strong>
              <Badge variant="secondary">{signal.entityType}</Badge>
              <Badge>{signal.status}</Badge>
              <Link
                to="/admin/newsroom/$section/$id"
                params={{ section: "scientific-trends", id: signal.id }}
                className="ml-auto text-primary underline underline-offset-4"
              >
                Revisar
              </Link>
            </div>
            {signal.status === "insufficient-data" && (
              <p className="mt-2 font-medium">Dados insuficientes para inferir tendência</p>
            )}
            <dl className="mt-3 grid gap-2 text-sm md:grid-cols-4">
              <div>
                <dt>Métrica</dt>
                <dd>{signal.metric}</dd>
              </div>
              <div>
                <dt>Período</dt>
                <dd>
                  {signal.periodStart}–{signal.periodEnd}
                </dd>
              </div>
              <div>
                <dt>Amostra</dt>
                <dd>{signal.sampleSize}</dd>
              </div>
              <div>
                <dt>Cobertura</dt>
                <dd>{signal.coverageScore}/100</dd>
              </div>
              <div>
                <dt>Confiança</dt>
                <dd>{signal.confidence}</dd>
              </div>
              <div>
                <dt>Política</dt>
                <dd>v{signal.policyVersion}</dd>
              </div>
              <div>
                <dt>Cálculo</dt>
                <dd>{signal.calculatedAt}</dd>
              </div>
            </dl>
            <p className="mt-2 text-sm">
              Série:{" "}
              {signal.yearlySeries.map(({ year, value }) => `${year} → ${value}`).join(" · ")}
            </p>
            <p className="mt-2 text-sm">Razões: {signal.reasons.join("; ")}</p>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {signal.warnings.map((warning) => (
                <li key={warning.code}>
                  <strong>{warning.severity}:</strong> {warning.message}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      {!filtered.length && <AdminEmpty message="Nenhum sinal corresponde aos filtros." />}
    </div>
  );
}
function Select({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <select
        className="mt-2 h-10 w-full rounded-md border bg-background px-3"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="all">Todos</option>
        {values.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}
