import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { adminRequest, type AdminSessionView } from "./admin-api";
import type { PersistedComment } from "@/lib/comments/contracts";

type Report = {
  id: string;
  commentId: string;
  reason: string;
  detail: string | null;
  status: string;
  publicName: string | null;
  bodyText: string | null;
  articleSlug: string;
  commentStatus: string;
  parentCommentId: string | null;
  rootCommentId: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
};

export function AdminComments() {
  const [filter, setFilter] = useState("approved");
  const [reportStatus, setReportStatus] = useState("open");
  const [items, setItems] = useState<(PersistedComment | Report)[]>([]);
  const [cursor, setCursor] = useState<string>();
  const [session, setSession] = useState<AdminSessionView>();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const locked = useRef(false);
  const generation = useRef(0);
  const reports = filter === "reports";
  const endpoint = reports
    ? `/api/admin/comments/reports?status=${reportStatus}`
    : `/api/admin/comments?status=${filter}`;
  useEffect(() => {
    const current = ++generation.current;
    setLoading(true);
    setItems([]);
    setCursor(undefined);
    setError("");
    Promise.all([
      adminRequest<AdminSessionView>("/api/admin/session"),
      adminRequest<{ data: (PersistedComment | Report)[]; cursor?: string }>(endpoint),
    ])
      .then(([nextSession, page]) => {
        if (current === generation.current) {
          setSession(nextSession);
          setItems(page.data);
          setCursor(page.cursor);
        }
      })
      .catch((reason) => {
        if (current === generation.current)
          setError(reason instanceof Error ? reason.message : "Falha de leitura.");
      })
      .finally(() => {
        if (current === generation.current) setLoading(false);
      });
    return () => {
      generation.current = current + 1;
    };
  }, [endpoint, version]);
  async function more() {
    if (!cursor || locked.current) return;
    const current = generation.current;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const page = await adminRequest<{ data: (PersistedComment | Report)[]; cursor?: string }>(
        `${endpoint}&cursor=${encodeURIComponent(cursor)}`,
      );
      if (current === generation.current) {
        setItems((previous) => [
          ...new Map([...previous, ...page.data].map((item) => [item.id, item])).values(),
        ]);
        setCursor(page.cursor);
      }
    } catch (reason) {
      if (current === generation.current)
        setError(reason instanceof Error ? reason.message : "Falha de leitura.");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function moderate(id: string, action: string) {
    if (!session || locked.current) return;
    if (
      action === "delete" &&
      !window.confirm(
        "Excluir definitivamente o nome, e-mail e texto deste comentário? Esta ação não pode ser desfeita.",
      )
    )
      return;
    locked.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await adminRequest("/api/admin/comments/actions", {
        method: "POST",
        headers: { "x-csrf-token": session.csrf },
        body: JSON.stringify({ action, id, actor: session.actor, note }),
      });
      setMessage("Moderação registrada.");
      setVersion((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível moderar.");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  function buttons(comment: {
    id: string;
    status: string;
    bodyText: string | null;
    anonymizedAt?: string | null;
  }) {
    return (
      <div className="flex flex-wrap gap-2">
        {comment.status === "pending" && (
          <Button disabled={busy} onClick={() => moderate(comment.id, "approve")}>
            Publicar pendente histórico
          </Button>
        )}
        {["approved", "pending"].includes(comment.status) && (
          <Button disabled={busy} variant="outline" onClick={() => moderate(comment.id, "hide")}>
            Ocultar
          </Button>
        )}
        {["approved", "pending", "rejected"].includes(comment.status) &&
          comment.bodyText &&
          comment.anonymizedAt == null && (
            <Button disabled={busy} variant="outline" onClick={() => moderate(comment.id, "spam")}>
              Marcar como spam
            </Button>
          )}
        {["rejected", "spam"].includes(comment.status) &&
          comment.bodyText &&
          comment.anonymizedAt == null && (
            <Button
              disabled={busy}
              variant="outline"
              onClick={() => moderate(comment.id, "restore")}
            >
              Restaurar
            </Button>
          )}
        {comment.status !== "deleted" && (
          <Button
            disabled={busy}
            variant="destructive"
            onClick={() => moderate(comment.id, "delete")}
          >
            Excluir
          </Button>
        )}
      </div>
    );
  }
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <label>
          Exibir
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="ml-2 rounded border bg-background p-2"
          >
            <option value="approved">Publicados</option>
            <option value="pending">Pendentes históricos</option>
            <option value="rejected">Ocultados</option>
            <option value="spam">Spam</option>
            <option value="deleted">Excluídos</option>
            <option value="reports">Denúncias</option>
          </select>
        </label>
        {reports && (
          <label>
            Denúncias
            <select
              value={reportStatus}
              onChange={(event) => setReportStatus(event.target.value)}
              className="ml-2 rounded border bg-background p-2"
            >
              <option value="open">Abertas</option>
              <option value="reviewed">Analisadas</option>
              <option value="dismissed">Descartadas</option>
            </select>
          </label>
        )}
      </div>
      <label className="mb-4 block text-sm">
        Motivo da moderação (opcional)
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={500}
          className="mt-1 w-full rounded border bg-background p-2"
        />
      </label>
      {loading && <p role="status">Carregando comentários…</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button className="underline" onClick={() => setVersion((value) => value + 1)}>
            Tentar novamente
          </button>
        </div>
      )}
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <li key={item.id} className="min-w-0 py-4 [overflow-wrap:anywhere]">
            <p className="font-semibold">{item.publicName ?? "Conteúdo anonimizado"}</p>
            <p className="text-xs text-muted-foreground">
              {item.articleSlug}
              {item.parentCommentId
                ? ` · Resposta a ${item.parentCommentId} · Tópico ${item.rootCommentId}`
                : ""}
            </p>
            <p className="my-2 whitespace-pre-wrap">
              {item.bodyText ?? "Texto apagado; restauração indisponível."}
            </p>
            {"commentId" in item ? (
              <>
                <p className="mb-2 text-sm">
                  Denúncia: {item.reason}
                  {item.detail ? ` · ${item.detail}` : ""}
                </p>
                {buttons({
                  id: item.commentId,
                  status: item.commentStatus,
                  bodyText: item.bodyText,
                })}
                {item.status === "open" && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      disabled={busy}
                      variant="outline"
                      onClick={() => moderate(item.id, "review-report")}
                    >
                      Marcar como analisada
                    </Button>
                    <Button
                      disabled={busy}
                      variant="outline"
                      onClick={() => moderate(item.id, "dismiss-report")}
                    >
                      Descartar denúncia
                    </Button>
                  </div>
                )}
                {item.reviewedBy && (
                  <p className="text-xs">
                    Revisada por {item.reviewedBy} em {item.reviewedAt}
                  </p>
                )}
              </>
            ) : (
              buttons(item)
            )}
          </li>
        ))}
      </ul>
      {!loading && !error && !items.length && <p>Nenhum registro nesta lista.</p>}
      {cursor && (
        <Button variant="outline" disabled={busy} onClick={more}>
          Mais registros
        </Button>
      )}
      <p role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
