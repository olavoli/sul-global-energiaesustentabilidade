import { createFileRoute, notFound } from "@tanstack/react-router";

import { AdminSectionList } from "@/components/admin/AdminSectionList";
import { AdminError, AdminLoading } from "@/components/admin/AdminStates";
import { AdminShell } from "@/components/admin/AdminShell";
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
  config: ["Configuração", "Políticas, orçamentos e switches em modo somente leitura."],
};

export const Route = createFileRoute("/admin/newsroom/$section")({
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
  const { section } = Route.useParams();
  const current = section as AdminSection;
  const [title, description] = labels[current];
  const state = useAdminData<unknown[]>(`/api/admin/${section}`);
  return (
    <AdminShell title={title} description={description}>
      {state.loading && <AdminLoading />}
      {state.error && <AdminError message={state.error} />}
      {state.data &&
        (Array.isArray(state.data) ? (
          <AdminSectionList section={section} entries={state.data} />
        ) : (
          <AdminSectionList section={section} entries={[state.data]} />
        ))}
    </AdminShell>
  );
}
