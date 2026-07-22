import type { StorageAdapter } from "../newsroom/storage/contracts";
import { storageAdapter } from "../newsroom/storage/runtime";
import { sanitizeResearchMarkdown } from "./markdown";
import { loadResearchNotes, saveNotes } from "./store";
import type { ResearchNote } from "./contracts";

export async function changeResearchNote(input: {
  action: "create" | "update" | "resolve" | "archive";
  noteId?: string;
  workId: string;
  dossierId?: string;
  title?: string;
  bodyMarkdown?: string;
  actor: string;
  now?: string;
  adapter?: StorageAdapter;
}): Promise<ResearchNote> {
  const adapter = input.adapter ?? storageAdapter();
  const stored = await loadResearchNotes(adapter);
  const now = input.now ?? new Date().toISOString();
  const index = stored.value.notes.findIndex(({ noteId }) => noteId === input.noteId);
  const previous = index >= 0 ? stored.value.notes[index] : undefined;
  if (input.action !== "create" && !previous) throw new Error("Nota não encontrada.");
  if (previous && previous.workId !== input.workId)
    throw new Error("Nota não pertence ao trabalho.");
  const note: ResearchNote = previous
    ? {
        ...previous,
        title: input.title?.trim() || previous.title,
        bodyMarkdown:
          input.bodyMarkdown === undefined
            ? previous.bodyMarkdown
            : sanitizeResearchMarkdown(input.bodyMarkdown),
        status:
          input.action === "resolve"
            ? "resolved"
            : input.action === "archive"
              ? "archived"
              : previous.status,
        version: previous.version + 1,
        updatedAt: now,
      }
    : {
        noteId: input.noteId ?? `research-note-${crypto.randomUUID()}`,
        workId: input.workId,
        dossierId: input.dossierId,
        title: input.title?.trim() || "Nota de pesquisa",
        bodyMarkdown: sanitizeResearchMarkdown(input.bodyMarkdown ?? ""),
        authorId: input.actor,
        status: "draft",
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
  const notes = [...stored.value.notes];
  if (index >= 0) notes[index] = note;
  else notes.push(note);
  await saveNotes(
    {
      schemaVersion: 1,
      notes,
      history: [
        ...stored.value.history,
        { ...(previous ?? note), revisionId: crypto.randomUUID() },
      ],
    },
    stored.version,
    adapter,
  );
  return note;
}
