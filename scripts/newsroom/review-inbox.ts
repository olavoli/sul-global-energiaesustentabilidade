import { createHash } from "node:crypto";
import { resolve } from "node:path";

import { loadDocument, saveDocument } from "./atomic-store";
import { inboxDocumentSchema, type InboxEntry } from "./automation-schema";
import type { EditorialDecision } from "./orchestrator-schema";
import type { EvidencePackage, StoryCluster } from "./story-schema";
import type { TranslationEntry } from "./translation-schema";

const PATH = resolve("newsroom/inbox/index.json");

export function buildInbox(
  decisions: EditorialDecision[],
  clusters: StoryCluster[],
  packages: EvidencePackage[],
  translations: TranslationEntry[],
): InboxEntry[] {
  return decisions.map((decision) => {
    const cluster = clusters.find(({ id }) => id === decision.clusterId);
    const evidence = packages.find(({ clusterId }) => clusterId === decision.clusterId);
    if (!cluster || !evidence) throw new Error(`Dados ausentes para inbox: ${decision.clusterId}.`);
    const createdAt = decision.updatedAt;
    const translation =
      translations.find(({ clusterId }) => clusterId === cluster.id)?.status ?? "not-required";
    return {
      id: `inbox-${createHash("sha256").update(decision.id).digest("hex").slice(0, 16)}`,
      clusterId: cluster.id,
      decisionId: decision.id,
      recommendation: decision.recommendation,
      risk: decision.riskLevel,
      readiness: decision.readiness.overallReady.state,
      sources: evidence.sources.map(({ name }) => name),
      urls: evidence.originalUrls,
      topics: cluster.topics,
      publishedAt: cluster.firstPublishedAt,
      translation,
      blockers: decision.blockers,
      nextAction: decision.requiredActions[0] ?? "RevisÃ£o humana.",
      priority: decision.riskLevel === "critical" ? 100 : decision.riskLevel === "high" ? 80 : 50,
      status: decision.blockers.length ? "action-required" : "unread",
      humanStatus: decision.status,
      createdAt,
      updatedAt: createdAt,
      history: [
        {
          action: "inbox-created",
          at: createdAt,
          actor: "daily-pipeline",
          notes: "Nenhuma publicaÃ§Ã£o.",
        },
      ],
    };
  });
}

export function mergeInbox(current: InboxEntry[], evaluated: InboxEntry[]): InboxEntry[] {
  const byDecision = new Map(current.map((entry) => [entry.decisionId, entry]));
  return evaluated.map((entry) => {
    const previous = byDecision.get(entry.decisionId);
    return previous
      ? {
          ...entry,
          status: previous.status,
          humanStatus: previous.humanStatus,
          history: previous.history,
        }
      : entry;
  });
}

export function updateInboxEntry(
  entry: InboxEntry,
  status: InboxEntry["status"],
  actor: string,
  notes: string,
  now: string,
): InboxEntry {
  if (!actor.trim()) throw new Error("MutaÃ§Ã£o da inbox exige --actor.");
  if (["deferred", "resolved", "dismissed"].includes(status) && !notes.trim())
    throw new Error("AÃ§Ã£o exige --notes.");
  return {
    ...entry,
    status,
    updatedAt: now,
    history: [
      ...entry.history,
      { action: status, at: now, actor, notes: notes || "Aberto para revisÃ£o." },
    ],
  };
}

export async function loadInbox(): Promise<InboxEntry[]> {
  return (await loadDocument(PATH, inboxDocumentSchema, { version: 1, entries: [] })).entries;
}

export async function saveInbox(entries: InboxEntry[]): Promise<void> {
  await saveDocument(PATH, inboxDocumentSchema, { version: 1, entries });
}
