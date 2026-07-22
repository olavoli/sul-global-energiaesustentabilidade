import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { AdminEmpty } from "./AdminStates";
import { evidenceDossierSchema } from "../../../scripts/scientific-evidence/contracts";
export function AdminScientificEvidence({ entries }: { entries: unknown[] }) {
  const dossiers = entries.flatMap((entry) => {
    const result = evidenceDossierSchema.safeParse(entry);
    return result.success ? [result.data] : [];
  });
  if (!dossiers.length) return <AdminEmpty message="Nenhum dossiê de evidências persistido." />;
  return (
    <div className="space-y-4">
      {dossiers.map((dossier) => (
        <article key={dossier.dossierId} className="rounded-md border bg-card p-4">
          <div className="flex flex-wrap gap-2">
            <strong>{dossier.dossierId}</strong>
            <Badge>{dossier.status}</Badge>
            <Badge variant="secondary">{dossier.readiness.level}</Badge>
            <Link
              className="ml-auto text-primary underline"
              to="/admin/newsroom/$section/$id"
              params={{ section: "scientific-evidence", id: dossier.dossierId }}
            >
              Abrir dossiê
            </Link>
          </div>
          <nav aria-label="Seções do dossiê" className="mt-3 text-sm">
            Visão estrutural · Fontes · Claims · Evidências · Limitações · Incertezas · Trabalhos
            relacionados · Perguntas abertas · Checklist · Histórico
          </nav>
          <dl className="mt-3 grid gap-2 text-sm md:grid-cols-3">
            <div>
              <dt>Licença</dt>
              <dd>{dossier.copyright.license}</dd>
            </div>
            <div>
              <dt>Fontes</dt>
              <dd>{dossier.sourceIds.length}</dd>
            </div>
            <div>
              <dt>Claims</dt>
              <dd>{dossier.claimIds.length}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}
