import { resolve } from "node:path";

import { stringify } from "yaml";
import { z } from "zod";

import { auditSchema, queueItemSchema, type AuditEntry, type QueueItem } from "./schema";
import { StorageConflictError } from "./storage/errors";
import { sha256 } from "./storage/sha256";
import { LocalFileStorageAdapter } from "./storage/local-adapter";
import { storageAdapter } from "./storage/runtime";

const TRANSITIONS: Readonly<Record<QueueItem["state"], readonly QueueItem["state"][]>> = {
  collected: ["normalized", "rejected"],
  normalized: ["duplicate", "rejected", "scored"],
  duplicate: ["archived", "review", "rejected"],
  rejected: ["archived"],
  scored: ["review", "rejected", "archived"],
  review: ["approved-for-draft", "rejected", "archived"],
  "approved-for-draft": ["archived"],
  archived: [],
};

const QUEUE_VERSION = 2;
interface QueueDocument {
  version: number;
  items: QueueItem[];
}

function parseQueueDocument(input: unknown): QueueDocument {
  try {
    if (Array.isArray(input))
      return { version: QUEUE_VERSION, items: queueItemSchema.array().parse(input) };
    if (!input || typeof input !== "object") throw new Error("estrutura ausente");
    const candidate = input as { version?: unknown; items?: unknown };
    if (candidate.version !== 1 && candidate.version !== QUEUE_VERSION)
      throw new Error(`versão não suportada: ${String(candidate.version)}`);
    return { version: QUEUE_VERSION, items: queueItemSchema.array().parse(candidate.items) };
  } catch (error) {
    throw new Error(`Fila corrompida: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const queueDocumentSchema = { parse: parseQueueDocument } as z.ZodType<QueueDocument>;

export async function loadQueue(path = "newsroom/queue.json"): Promise<QueueItem[]> {
  return (
    await storageAdapter().getDocument(
      "queue",
      queueDocumentSchema,
      { version: QUEUE_VERSION, items: [] },
      path,
    )
  ).value.items;
}

export async function saveQueue(
  items: readonly QueueItem[],
  path = "newsroom/queue.json",
  options: { retentionDays?: number; now?: Date } = {},
): Promise<void> {
  const validated = applyRetention(
    queueItemSchema.array().parse(items),
    options.retentionDays ?? 90,
    options.now ?? new Date(),
  );
  await storageAdapter().putDocument(
    { key: "queue", value: { version: QUEUE_VERSION, items: validated }, localPath: path },
    queueDocumentSchema,
  );
}

function applyRetention(items: QueueItem[], retentionDays: number, now: Date): QueueItem[] {
  const cutoff = now.valueOf() - retentionDays * 86_400_000;
  return items.filter((item) => {
    if (item.state !== "archived") return true;
    const last = item.history.at(-1)?.at;
    return !last || new Date(last).valueOf() >= cutoff;
  });
}

export async function withMutationLock<T>(
  operation: () => Promise<T>,
  key = "newsroom-mutation",
): Promise<T> {
  const owner = crypto.randomUUID();
  const now = new Date();
  await storageAdapter().acquireLock({
    key,
    owner,
    runId: owner,
    acquiredAt: now.toISOString(),
    heartbeatAt: now.toISOString(),
    expiresAt: new Date(now.valueOf() + 60_000).toISOString(),
  });
  try {
    return await operation();
  } finally {
    await storageAdapter().releaseLock(key, owner);
  }
}

export async function recoverQueue(): Promise<void> {
  throw new StorageConflictError(
    "Use storage:restore com checksum; recuperação direta não é mais permitida.",
  );
}

export function transitionItem(
  item: QueueItem,
  target: QueueItem["state"],
  actor: string,
  at = new Date().toISOString(),
): QueueItem {
  if (!TRANSITIONS[item.state].includes(target))
    throw new Error(`Transição inválida: ${item.state} → ${target}.`);
  return queueItemSchema.parse({
    ...item,
    state: target,
    history: [...item.history, { from: item.state, to: target, at, actor }],
  });
}

export function listQueue(
  items: readonly QueueItem[],
  options: { state?: QueueItem["state"]; sort?: "score" | "date" } = {},
): QueueItem[] {
  const filtered = options.state
    ? items.filter((item) => item.state === options.state)
    : [...items];
  return filtered.sort((first, second) => {
    if (options.sort === "date")
      return second.item.publishedAt.localeCompare(first.item.publishedAt);
    return (second.score?.total ?? -Infinity) - (first.score?.total ?? -Infinity);
  });
}

export function briefingFor(item: QueueItem): string {
  if (item.state !== "review")
    throw new Error("Somente item em review pode ser aprovado para draft.");
  return stringify({
    newsroomItemId: item.id,
    status: "briefing",
    provisionalTitle: item.item.title,
    sourceLinks: [item.item.canonicalUrl ?? item.item.originalUrl],
    relatedSources: item.relatedSources,
    topics: item.topics.map(({ topic }) => topic),
    pointsToVerify: [
      "Confirmar cada afirmação em fontes primárias quando disponíveis.",
      "Avaliar contexto, incertezas, conflitos e direitos de uso.",
      "Não copiar o texto da fonte; o snippet é apenas referência de triagem.",
    ],
    warning: "Nenhum fato foi validado. Este briefing não é artigo e não autoriza publicação.",
  });
}

export async function writeBriefing(item: QueueItem, root = process.cwd()): Promise<string> {
  const body = briefingFor(item);
  const key = `briefings/${item.id}.yml`;
  const adapter =
    root === process.cwd()
      ? storageAdapter()
      : new LocalFileStorageAdapter(resolve(root, "newsroom"));
  if (await adapter.getObject(key)) throw new StorageConflictError("Briefing já existe.");
  await adapter.putObject({
    key,
    body,
    contentType: "application/yaml; charset=utf-8",
    hash: await sha256(body),
    size: new TextEncoder().encode(body).byteLength,
    createdAt: new Date().toISOString(),
  });
  return resolve(root, "newsroom", key);
}

export async function appendAudit(entry: AuditEntry, path?: string): Promise<void> {
  void path;
  const validated = auditSchema.parse(entry);
  await storageAdapter().appendAudit({
    id: crypto.randomUUID(),
    timestamp: validated.timestamp,
    actor: validated.actor,
    action: validated.command,
    entity: "newsroom-run",
    entityId: validated.source,
    origin: "cli",
    success: validated.errors.length === 0,
    version: 1,
    after: validated,
  });
}
