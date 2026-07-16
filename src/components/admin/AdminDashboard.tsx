import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminJson } from "./AdminJson";

interface Dashboard {
  latestRun: { id: string; status: string; durationMs: number; mode: string } | null;
  sourcesHealthy: number;
  sourcesDegraded: number;
  openCircuits: number;
  items: number;
  clusters: number;
  decisions: number;
  reviewsPending: number;
  translationsPending: number;
  quarantine: number;
  highRisks: number;
  commonBlockers: Record<string, number>;
  coverage: unknown;
  switches: Record<string, boolean>;
}

export function AdminDashboard({ data }: { data: Dashboard }) {
  const cards = [
    ["Revisões pendentes", data.reviewsPending],
    ["Riscos altos", data.highRisks],
    ["Traduções pendentes", data.translationsPending],
    ["Fontes saudáveis", data.sourcesHealthy],
    ["Fontes degradadas", data.sourcesDegraded],
    ["Circuitos abertos", data.openCircuits],
    ["Itens", data.items],
    ["Clusters", data.clusters],
    ["Decisões", data.decisions],
    ["Quarentena", data.quarantine],
  ] as const;
  return (
    <div className="space-y-6">
      <section aria-labelledby="indicadores">
        <h2 id="indicadores" className="sr-only">
          Indicadores operacionais
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map(([title, value]) => (
            <Card key={title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Última execução</CardTitle>
          </CardHeader>
          <CardContent>
            {data.latestRun ? <AdminJson value={data.latestRun} /> : "Nenhuma execução aplicada."}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Kill switches</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminJson value={data.switches} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bloqueadores mais comuns</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminJson value={data.commonBlockers} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cobertura</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminJson value={data.coverage} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
