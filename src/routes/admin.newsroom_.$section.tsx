import { createFileRoute, notFound, Outlet, useRouterState } from "@tanstack/react-router";

import { AdminSectionList } from "@/components/admin/AdminSectionList";
import { AdminError, AdminLoading } from "@/components/admin/AdminStates";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminScientificRadar } from "@/components/admin/AdminScientificRadar";
import { AdminScientificGraph } from "@/components/admin/AdminScientificGraph";
import { AdminScientificMemory } from "@/components/admin/AdminScientificMemory";
import { AdminScientificTrends } from "@/components/admin/AdminScientificTrends";
import { useAdminData } from "@/components/admin/use-admin-data";
import { adminSections, type AdminSection } from "@/lib/admin/contracts";

const labels: Record<AdminSection, [string, string]> = {
  dashboard: ["Visão geral", "Estado operacional consolidado."],
  inbox: ["Inbox", "Revisões humanas organizadas por risco, prioridade e próxima ação."],
  decisions: ["Decisões", "Recomendações, riscos, prontidão e histórico editorial."],
  clusters: ["Clusters", "Agrupamentos conservadores, fontes, claims e evidências."],
  translations: ["Traduções", "Comparação e revisão humana de traduções assistidas."],
  sources: ["Fontes", "Catálogo, saúde, copyright, cobertura e circuit breaker."],
  quarantine: ["Quarentena", "Falhas técnicas preservadas para revisão e reprocessamento."],
  runs: ["Execuções", "Histórico, estágios, checkpoints, warnings e recuperação."],
  reports: ["Relatórios", "Resumos operacionais privados produzidos pelo pipeline."],
  pitches: ["Pautas", "Pautas estruturadas criadas somente após aprovação humana."],
  "scientific-radar": [
    "Radar Científico",
    "Descoberta privada de publicações científicas para decisão humana, sem geração de conteúdo.",
  ],
  "scientific-memory": [
    "Memória Temporal",
    "Evolução histórica estrutural e determinística das entidades científicas.",
  ],
  "scientific-trends": [
    "Tendências Científicas",
    "Sinais temporais conservadores, auditáveis e submetidos à revisão humana.",
  ],
  "scientific-graph": [
    "Mapa Científico",
    "Relações bibliográficas observadas, proveniência e revisão humana, sem interpretação editorial.",
  ],
  "entity-resolution": [
    "Identidades Canônicas",
    "Possíveis duplicatas por regras determinísticas, sempre submetidas à revisão humana.",
  ],
  config: ["Configuração", "Políticas, orçamentos e switches em modo somente leitura."],
};

export const Route = createFileRoute("/admin/newsroom_/$section")({
  beforeLoad: ({ params }) => {
    if (!adminSections.includes(params.section as AdminSection)) throw notFound();
  },
  head: ({ params }) => ({
    meta: [
      { title: `${labels[params.section as AdminSection]?.[0] ?? "Central"} — Central Editorial` },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: SectionRoute,
});

function SectionRoute() {
  const detailActive = useRouterState({
    select: (state) =>
      state.matches.some(({ routeId }) => routeId === "/admin/newsroom_/$section/$id"),
  });
  const { section } = Route.useParams();
  const current = section as AdminSection;
  const [title, description] = labels[current];
  const state = useAdminData<unknown[]>(`/api/admin/${section}`);
  if (detailActive) return <Outlet />;
  return (
    <AdminShell title={title} description={description}>
      {state.loading && <AdminLoading />}
      {state.error && <AdminError message={state.error} />}
      {state.data && current === "scientific-radar" && Array.isArray(state.data) && (
        <AdminScientificRadar entries={state.data} />
      )}
      {state.data && current === "scientific-memory" && Array.isArray(state.data) && (
        <AdminScientificMemory entries={state.data} />
      )}
      {state.data && current === "scientific-trends" && Array.isArray(state.data) && (
        <AdminScientificTrends entries={state.data} />
      )}
      {state.data && current === "scientific-graph" && Array.isArray(state.data) && (
        <AdminScientificGraph entries={state.data} />
      )}
      {state.data &&
        ![
          "scientific-radar",
          "scientific-memory",
          "scientific-trends",
          "scientific-graph",
        ].includes(current) &&
        (Array.isArray(state.data) ? (
          <AdminSectionList section={section} entries={state.data} />
        ) : (
          <AdminSectionList section={section} entries={[state.data]} />
        ))}
    </AdminShell>
  );
}
