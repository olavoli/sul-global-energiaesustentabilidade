import type { StorageAdapter } from "../newsroom/storage/contracts";
import { checklistKeys, type ResearchChecklist } from "./contracts";
import { emptyChecklist, loadResearchChecklists, saveChecklists } from "./store";

export async function updateResearchChecklist(input: {
  workId: string;
  key: (typeof checklistKeys)[number];
  checked: boolean;
  actor: string;
  now?: string;
  adapter?: StorageAdapter;
}): Promise<ResearchChecklist> {
  if (!checklistKeys.includes(input.key)) throw new Error("Item de checklist inválido.");
  const stored = await loadResearchChecklists(input.adapter);
  const current =
    stored.value.checklists.find(({ workId }) => workId === input.workId) ??
    emptyChecklist(input.workId);
  const next = {
    ...current,
    version: current.version + 1,
    items: current.items.map((item) =>
      item.key === input.key
        ? {
            ...item,
            checked: input.checked,
            actorId: input.actor,
            updatedAt: input.now ?? new Date().toISOString(),
          }
        : item,
    ),
  };
  await saveChecklists(
    {
      schemaVersion: 1,
      checklists: [
        ...stored.value.checklists.filter(({ workId }) => workId !== input.workId),
        next,
      ],
    },
    stored.version,
    input.adapter,
  );
  return next;
}
