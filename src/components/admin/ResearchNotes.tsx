import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ResearchNote } from "../../../scripts/research-workspace/contracts";
import { adminAction, type AdminSessionView } from "./admin-api";

export function ResearchNotes({
  workId,
  dossierId,
  notes,
  session,
  reload,
}: {
  workId: string;
  dossierId?: string;
  notes: ResearchNote[];
  session: AdminSessionView;
  reload: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const mutate = async (action: string, id?: string, values = {}) => {
    setBusy(true);
    try {
      await adminAction(session, action, id, "", values);
      setTitle("");
      setBody("");
      reload();
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="space-y-4">
      <div className="rounded-lg border bg-background p-4">
        <h2 className="font-semibold">Nova nota manual</h2>
        <Input
          className="mt-3"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Título"
        />
        <Textarea
          className="mt-3"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Markdown sanitizado, sem preenchimento automático"
        />
        <Button
          className="mt-3"
          disabled={busy || !title.trim()}
          onClick={() =>
            mutate("research-note:create", undefined, {
              workId,
              dossierId: dossierId ?? "",
              title,
              bodyMarkdown: body,
            })
          }
        >
          Criar nota
        </Button>
      </div>
      {notes.map((note) => (
        <article key={note.noteId} className="rounded-lg border bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong>{note.title}</strong>
            <span className="text-xs text-muted-foreground">
              {note.status} · v{note.version}
            </span>
          </div>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-sm">{note.bodyMarkdown}</pre>
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              disabled={busy || note.status === "resolved"}
              onClick={() => mutate("research-note:resolve", note.noteId, { workId })}
            >
              Resolver
            </Button>
            <Button
              variant="outline"
              disabled={busy || note.status === "archived"}
              onClick={() => mutate("research-note:archive", note.noteId, { workId })}
            >
              Arquivar
            </Button>
          </div>
        </article>
      ))}
    </section>
  );
}
