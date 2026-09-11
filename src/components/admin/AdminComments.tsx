import { useState } from "react";
import { Button } from "@/components/ui/button";
import { adminRequest } from "./admin-api";
import { useAdminData } from "./use-admin-data";

type Comment = { id: string; publicName: string; bodyText: string; createdAt: string };

export function AdminComments() {
  const state = useAdminData<Comment[]>("/api/admin/comments?status=pending");
  const [message, setMessage] = useState("");
  async function moderate(id: string, action: "approve" | "reject" | "spam" | "delete") {
    if (!state.session) return;
    await adminRequest("/api/admin/comments/actions", {
      method: "POST",
      headers: { "x-csrf-token": state.session.csrf },
      body: JSON.stringify({ action, id, actor: state.session.actor, note: "" }),
    });
    setMessage("Moderação registrada.");
    state.reload();
  }
  return (
    <div>
      {state.loading && <p role="status">Carregando comentários…</p>}
      {state.error && <p role="alert">{state.error}</p>}
      <ul className="space-y-4">
        {state.data?.map((comment) => (
          <li key={comment.id} className="rounded-md border p-4">
            <p className="font-semibold">{comment.publicName}</p>
            <p className="my-3 whitespace-pre-wrap">{comment.bodyText}</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => moderate(comment.id, "approve")}>Aprovar</Button>
              <Button variant="outline" onClick={() => moderate(comment.id, "reject")}>
                Rejeitar
              </Button>
              <Button variant="outline" onClick={() => moderate(comment.id, "spam")}>
                Spam
              </Button>
              <Button variant="destructive" onClick={() => moderate(comment.id, "delete")}>
                Excluir
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <p role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
