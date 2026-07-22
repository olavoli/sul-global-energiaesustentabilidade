import { Checkbox } from "@/components/ui/checkbox";
import type { ResearchChecklist as Checklist } from "../../../scripts/research-workspace/contracts";
import { adminAction, type AdminSessionView } from "./admin-api";

const labels: Record<string, string> = {
  "identity-verified": "Identidade verificada",
  "official-source-verified": "Fonte oficial verificada",
  "license-verified": "Licença verificada",
  "evidence-reviewed": "Evidências revisadas",
  "claims-reviewed": "Claims revisados",
  "limitations-reviewed": "Limitações revisadas",
  "graph-reviewed": "Grafo revisado",
  "concepts-reviewed": "Conceitos revisados",
  "authors-reviewed": "Autores revisados",
  "institutions-reviewed": "Instituições revisadas",
  "temporal-memory-reviewed": "Memória temporal revisada",
  "trends-reviewed": "Tendências revisadas",
  "provenance-reviewed": "Proveniência revisada",
  "notes-reviewed": "Notas revisadas",
  "human-review-complete": "Revisão humana concluída",
};

export function ResearchChecklist({
  checklist,
  session,
  reload,
}: {
  checklist: Checklist;
  session: AdminSessionView;
  reload: () => void;
}) {
  return (
    <section className="rounded-lg border bg-background p-4">
      <h2 className="font-semibold">Checklist manual</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Nenhum item é atualizado automaticamente e isto não autoriza publicação.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {checklist.items.map((item) => (
          <label key={item.key} className="flex items-start gap-3 rounded border p-3 text-sm">
            <Checkbox
              checked={item.checked}
              onCheckedChange={async (checked) => {
                await adminAction(session, "research-checklist:toggle", checklist.workId, "", {
                  key: item.key,
                  checked: checked === true ? "true" : "false",
                });
                reload();
              }}
            />
            <span>
              {labels[item.key] ?? item.key}
              <small className="block text-muted-foreground">
                {item.actorId ? `${item.actorId} · ${item.updatedAt}` : "Pendente"}
              </small>
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}
