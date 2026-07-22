import { z } from "zod";

export const noteStatusSchema = z.enum(["draft", "active", "resolved", "archived"]);
export const researchNoteSchema = z.object({
  noteId: z.string().min(1),
  workId: z.string().min(1),
  dossierId: z.string().min(1).optional(),
  title: z.string().trim().min(1).max(160),
  bodyMarkdown: z.string().max(10_000),
  authorId: z.string().trim().min(2).max(80),
  status: noteStatusSchema,
  version: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type ResearchNote = z.infer<typeof researchNoteSchema>;

export const noteRevisionSchema = z.object({
  ...researchNoteSchema.shape,
  revisionId: z.string().min(1),
});
export type NoteRevision = z.infer<typeof noteRevisionSchema>;

export const notesDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  notes: z.array(researchNoteSchema),
  history: z.array(noteRevisionSchema),
});
export type NotesDocument = z.infer<typeof notesDocumentSchema>;

export const checklistKeys = [
  "identity-verified",
  "official-source-verified",
  "license-verified",
  "evidence-reviewed",
  "claims-reviewed",
  "limitations-reviewed",
  "graph-reviewed",
  "concepts-reviewed",
  "authors-reviewed",
  "institutions-reviewed",
  "temporal-memory-reviewed",
  "trends-reviewed",
  "provenance-reviewed",
  "notes-reviewed",
  "human-review-complete",
] as const;

export const checklistItemSchema = z.object({
  key: z.enum(checklistKeys),
  checked: z.boolean(),
  actorId: z.string().min(2).max(80).nullable(),
  updatedAt: z.iso.datetime().nullable(),
});
export const checklistSchema = z.object({
  workId: z.string().min(1),
  version: z.number().int().nonnegative(),
  items: z.array(checklistItemSchema).length(checklistKeys.length),
});
export type ResearchChecklist = z.infer<typeof checklistSchema>;
export const checklistsDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  checklists: z.array(checklistSchema),
});
export type ChecklistsDocument = z.infer<typeof checklistsDocumentSchema>;

export type ModuleState = { available: boolean; count: number; error?: string };
export interface ResearchWorkspace {
  workId: string;
  work: unknown;
  dossier: unknown;
  evidence: unknown;
  graph: unknown;
  concepts: unknown[];
  memory: unknown[];
  trends: unknown[];
  identities: unknown[];
  notes: ResearchNote[];
  checklist: ResearchChecklist;
  modules: Record<string, ModuleState>;
  restrictions: {
    generatedContent: false;
    publication: false;
    artificialIntelligence: false;
  };
}
