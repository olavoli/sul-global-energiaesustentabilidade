import { createFileRoute } from "@tanstack/react-router";
import { AdminResearchWorkspace } from "@/components/admin/AdminResearchWorkspace";
import { AdminError, AdminLoading } from "@/components/admin/AdminStates";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminData } from "@/components/admin/use-admin-data";
import type { ResearchWorkspace } from "../../scripts/research-workspace/contracts";

export const Route = createFileRoute("/admin/research-workspace/$scientificWorkId")({
  head: () => ({
    meta: [
      { title: "Workspace de Pesquisa — Central Editorial" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: ResearchWorkspaceRoute,
});

function ResearchWorkspaceRoute() {
  const { scientificWorkId } = Route.useParams();
  const state = useAdminData<ResearchWorkspace>(
    `/api/admin/research-workspace/${scientificWorkId}`,
  );
  return (
    <AdminShell
      title="Workspace de Pesquisa"
      description="Leitura estrutural privada com revisão humana, sem geração editorial ou publicação."
    >
      {state.loading && <AdminLoading />}
      {state.error && <AdminError message={state.error} />}
      {state.data && state.session && (
        <AdminResearchWorkspace
          workspace={state.data}
          session={state.session}
          reload={state.reload}
        />
      )}
    </AdminShell>
  );
}
