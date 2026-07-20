import { createFileRoute, notFound } from "@tanstack/react-router";

import { AdminActions } from "@/components/admin/AdminActions";
import { AdminJson } from "@/components/admin/AdminJson";
import { AdminError, AdminLoading } from "@/components/admin/AdminStates";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminData } from "@/components/admin/use-admin-data";
import { adminSections, type AdminSection } from "@/lib/admin/contracts";

export const Route = createFileRoute("/admin/newsroom_/$section/$id")({
  beforeLoad: ({ params }) => {
    if (!adminSections.includes(params.section as AdminSection)) throw notFound();
  },
  head: () => ({
    meta: [
      { title: "Detalhe operacional — Central Editorial" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: DetailRoute,
});

function DetailRoute() {
  const { section, id } = Route.useParams();
  const state = useAdminData<unknown>(`/api/admin/${section}/${id}`);
  return (
    <AdminShell
      title="Detalhe operacional"
      description="Dados atribuídos, histórico e controles humanos do registro selecionado."
    >
      <div className="space-y-6">
        {state.loading && <AdminLoading />}
        {state.error && <AdminError message={state.error} />}
        {state.data !== undefined && <AdminJson value={state.data} />}
        {state.session && (
          <AdminActions
            section={section}
            id={id}
            session={state.session}
            onSuccess={state.reload}
          />
        )}
      </div>
    </AdminShell>
  );
}
