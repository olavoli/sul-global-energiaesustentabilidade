import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { adminAction, type AdminSessionView } from "./admin-api";

const actions: Record<string, Array<[string, string, boolean]>> = {
  inbox: [
    ["inbox:opened", "Marcar como aberta", false],
    ["inbox:deferred", "Adiar", true],
    ["inbox:resolved", "Resolver", true],
    ["inbox:dismissed", "Dispensar", true],
  ],
  decisions: [
    ["decision:reject", "Rejeitar", true],
    ["decision:monitor", "Monitorar", true],
    ["decision:request-more-sources", "Pedir mais fontes", true],
    ["decision:request-translation-review", "Pedir revisão de tradução", true],
    ["decision:archive", "Arquivar", true],
    ["decision:approve-for-pitch", "Aprovar para pauta", true],
    ["pitch:create", "Criar pauta controlada", true],
  ],
  translations: [
    ["translation:approve", "Aprovar tradução", true],
    ["translation:reject", "Rejeitar tradução", true],
    ["translation:retry", "Solicitar nova tentativa", true],
  ],
  quarantine: [
    ["quarantine:retry", "Reprocessar", false],
    ["quarantine:discard", "Descartar", true],
  ],
  sources: [
    ["source:health", "Verificar saúde", true],
    ["source:disable", "Desativar fonte", true],
    ["circuit:reset", "Resetar circuito", true],
  ],
  runs: [
    ["run:cancel", "Cancelar execução", true],
    ["run:cleanup", "Simular limpeza", true],
  ],
  dashboard: [
    ["pipeline:validate-only", "Validar", false],
    ["pipeline:process-existing", "Processar existentes", false],
    ["pipeline:report-only", "Gerar relatório", false],
    ["pipeline:dry-run", "Dry-run completo", false],
  ],
};

export function AdminActions({
  section,
  id,
  session,
  onSuccess,
}: {
  section: string;
  id: string;
  session: AdminSessionView;
  onSuccess: () => void;
}) {
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const available = actions[section] ?? [];
  if (!available.length) return null;
  const execute = async (action: string, requiresNote: boolean) => {
    if (requiresNote && !note.trim()) {
      setMessage("Informe uma nota antes de confirmar.");
      return;
    }
    if (!window.confirm("Confirma esta ação humana? Ela não publica conteúdo.")) return;
    setBusy(true);
    try {
      await adminAction(session, action, id, note);
      setMessage("Ação registrada com sucesso.");
      onSuccess();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ação não concluída.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section aria-labelledby="acoes-humanas" className="rounded-md border bg-card p-4">
      <h2 id="acoes-humanas" className="font-serif text-xl font-semibold">
        Ações humanas
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Ator da sessão: {session.actor}. Nenhuma ação publica ou cria artigo.
      </p>
      <label className="mt-4 block text-sm font-medium">
        Nota de auditoria
        <Textarea
          className="mt-2"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Contexto e justificativa da decisão"
        />
      </label>
      <div className="mt-4 flex flex-wrap gap-2">
        {available.map(([action, label, requiresNote]) => (
          <Button
            key={action}
            type="button"
            variant={
              action.includes("reject") || action.includes("discard") ? "destructive" : "outline"
            }
            disabled={busy}
            onClick={() => execute(action, requiresNote)}
          >
            {label}
          </Button>
        ))}
      </div>
      {message && (
        <p role="status" className="mt-3 text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
