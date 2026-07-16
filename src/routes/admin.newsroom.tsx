import { createFileRoute } from "@tanstack/react-router";

import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminActions } from "@/components/admin/AdminActions";
import { AdminError, AdminLoading } from "@/components/admin/AdminStates";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminData } from "@/components/admin/use-admin-data";

export const Route = createFileRoute("/admin/newsroom")({
  head: () => ({
    meta: [
      { title: "Central Editorial — Sul Global" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: DashboardRoute,
});

function DashboardRoute() {
  const state = useAdminData<Parameters<typeof AdminDashboard>[0]["data"]>("/api/admin/dashboard");
  return (
    <AdminShell
      title="Visão geral"
      description="Estado operacional consolidado da redação algorítmica, sem autorização de publicação."
    >
      {state.loading && <AdminLoading />}
      {state.error && <AdminError message={state.error} />}
      {state.data && <AdminDashboard data={state.data} />}
      {state.session && (
        <div className="mt-6">
          <AdminActions
            section="dashboard"
            id="pipeline"
            session={state.session}
            onSuccess={state.reload}
          />
        </div>
      )}
    </AdminShell>
  );
}
