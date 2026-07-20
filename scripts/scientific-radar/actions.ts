import type { StorageAdapter } from "../newsroom/storage/contracts";
import { storageAdapter } from "../newsroom/storage/runtime";
import {
  scientificDossiersDocumentSchema,
  scientificRadarDocumentSchema,
  type RadarStatus,
  type ScientificWork,
} from "./contracts";
import { scientificDossierId } from "./normalize";
import { DOSSIERS_KEY, RADAR_KEY, loadScientificDossiers, loadScientificRadar } from "./store";

export const radarHumanActions = [
  "radar:ignore",
  "radar:monitor",
  "radar:create-dossier",
  "radar:request-translation",
] as const;

export type RadarHumanAction = (typeof radarHumanActions)[number];

function actionState(action: RadarHumanAction): {
  status: RadarStatus;
  history: "ignored" | "monitoring" | "dossier-created" | "translation-requested";
} {
  if (action === "radar:ignore") return { status: "ignored", history: "ignored" };
  if (action === "radar:monitor") return { status: "monitoring", history: "monitoring" };
  if (action === "radar:create-dossier")
    return { status: "dossier-created", history: "dossier-created" };
  return { status: "translation-requested", history: "translation-requested" };
}

export async function applyRadarHumanAction(
  input: {
    action: RadarHumanAction;
    id: string;
    actor: string;
    note: string;
    now?: Date;
  },
  adapter: StorageAdapter = storageAdapter(),
): Promise<ScientificWork> {
  if (!input.actor.trim()) throw new Error("Ator é obrigatório.");
  if (!input.note.trim()) throw new Error("Nota é obrigatória.");
  const radar = await loadScientificRadar(adapter);
  const index = radar.value.items.findIndex(({ id }) => id === input.id);
  if (index < 0) throw new Error("Publicação científica não encontrada.");
  const at = (input.now ?? new Date()).toISOString();
  const transition = actionState(input.action);
  const updated: ScientificWork = {
    ...radar.value.items[index],
    status: transition.status,
    updatedAt: at,
    history: [
      ...radar.value.items[index].history,
      { action: transition.history, actor: input.actor.trim(), note: input.note.trim(), at },
    ],
  };
  const items = [...radar.value.items];
  items[index] = updated;
  if (input.action !== "radar:create-dossier") {
    await adapter.putDocument(
      {
        key: RADAR_KEY,
        value: { ...radar.value, items },
        expectedVersion: radar.version,
      },
      scientificRadarDocumentSchema,
    );
    return updated;
  }

  const dossiers = await loadScientificDossiers(adapter);
  const dossierId = await scientificDossierId(updated.id);
  const existing = dossiers.value.items.some(({ id }) => id === dossierId);
  const nextDossiers = existing
    ? dossiers.value.items
    : [
        ...dossiers.value.items,
        {
          id: dossierId,
          scientificWorkId: updated.id,
          title: updated.title,
          status: "empty-supervised" as const,
          createdAt: at,
          createdBy: input.actor.trim(),
          note: input.note.trim(),
          sources: [updated.officialLinks.openAlex, updated.officialLinks.doi],
          generatedContent: false as const,
        },
      ];
  scientificRadarDocumentSchema.parse({ ...radar.value, items });
  scientificDossiersDocumentSchema.parse({ schemaVersion: 1, items: nextDossiers });
  await adapter.transaction([
    {
      key: RADAR_KEY,
      value: { ...radar.value, items },
      expectedVersion: radar.version,
    },
    {
      key: DOSSIERS_KEY,
      value: { schemaVersion: 1, items: nextDossiers },
      expectedVersion: dossiers.version,
    },
  ]);
  return updated;
}
