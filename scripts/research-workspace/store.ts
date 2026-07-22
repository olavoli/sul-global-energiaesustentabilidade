import type { StorageAdapter } from "../newsroom/storage/contracts";
import { storageAdapter } from "../newsroom/storage/runtime";
import {
  checklistKeys,
  checklistsDocumentSchema,
  notesDocumentSchema,
  type NotesDocument,
  type ChecklistsDocument,
  type ResearchChecklist,
} from "./contracts";

export const RESEARCH_NOTES_KEY = "research-workspace/notes";
export const RESEARCH_CHECKLISTS_KEY = "research-workspace/checklists";
const emptyNotes: NotesDocument = { schemaVersion: 1, notes: [], history: [] };
const emptyChecklists: ChecklistsDocument = { schemaVersion: 1, checklists: [] };

export function emptyChecklist(workId: string): ResearchChecklist {
  return {
    workId,
    version: 0,
    items: checklistKeys.map((key) => ({ key, checked: false, actorId: null, updatedAt: null })),
  };
}

export async function loadResearchNotes(adapter: StorageAdapter = storageAdapter()) {
  return adapter.getDocument(RESEARCH_NOTES_KEY, notesDocumentSchema, emptyNotes);
}

export async function loadResearchChecklists(adapter: StorageAdapter = storageAdapter()) {
  return adapter.getDocument(RESEARCH_CHECKLISTS_KEY, checklistsDocumentSchema, emptyChecklists);
}

export async function saveNotes(
  value: NotesDocument,
  version: number,
  adapter: StorageAdapter = storageAdapter(),
) {
  return adapter.putDocument(
    { key: RESEARCH_NOTES_KEY, value, expectedVersion: version },
    notesDocumentSchema,
  );
}

export async function saveChecklists(
  value: ChecklistsDocument,
  version: number,
  adapter: StorageAdapter = storageAdapter(),
) {
  return adapter.putDocument(
    { key: RESEARCH_CHECKLISTS_KEY, value, expectedVersion: version },
    checklistsDocumentSchema,
  );
}
