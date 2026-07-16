import { createHash } from "node:crypto";
import { resolve } from "node:path";

import { FeedTransportError } from "./transport";
import { quarantineSchema, type QuarantineEntry, type SourceRuntime } from "./schema";
import { loadStoredDocument, saveStoredDocument } from "./storage/documents";

export const DEFAULT_QUARANTINE_PATH = resolve("newsroom/quarantine.json");

export async function loadQuarantine(path = DEFAULT_QUARANTINE_PATH): Promise<QuarantineEntry[]> {
  return loadStoredDocument("quarantine", quarantineSchema.array(), [], path);
}

export async function saveQuarantine(
  entries: readonly QuarantineEntry[],
  path = DEFAULT_QUARANTINE_PATH,
): Promise<void> {
  await saveStoredDocument("quarantine", quarantineSchema.array(), [...entries], path);
}

function reasonCode(
  error: unknown,
  consecutiveFailures: number,
): QuarantineEntry["reasonCode"] | undefined {
  if (error instanceof FeedTransportError) {
    if (error.code === "too-large") return "too-large";
    if (error.code === "suspicious-redirect" || error.code === "redirect-limit") {
      return "suspicious-redirect";
    }
    if (error.code === "invalid-content-type") return "invalid-content-type";
  }
  const message = error instanceof Error ? error.message : String(error);
  if (/Formato alterado/i.test(message)) return "format-changed";
  if (/XML|RSS\/Atom não reconhecido/i.test(message)) return "invalid-xml";
  if (/muitos itens futuros/i.test(message)) return "future-items";
  if (/ausência prolongada de datas/i.test(message)) return "missing-dates";
  if (/atribuição ausente/i.test(message)) return "missing-attribution";
  if (/limite de snippet/i.test(message)) return "snippet-policy";
  if (consecutiveFailures >= 3) return "repeated-failures";
  return undefined;
}

export function quarantineFromError(
  sourceId: string,
  error: unknown,
  runtime: SourceRuntime,
  now = new Date(),
): QuarantineEntry | undefined {
  const code = reasonCode(error, runtime.consecutiveFailures + 1);
  if (!code) return undefined;
  const transport = error instanceof FeedTransportError ? error : undefined;
  const createdAt = now.toISOString();
  const id = createHash("sha256")
    .update(`${sourceId}\u001f${code}\u001f${createdAt}`)
    .digest("hex")
    .slice(0, 24);
  return quarantineSchema.parse({
    id,
    sourceId,
    reasonCode: code,
    reason: error instanceof Error ? error.message : String(error),
    createdAt,
    state: "pending",
    attempts: 0,
    metadata: {
      httpStatus: transport?.metadata.httpStatus,
      contentType: transport?.metadata.contentType,
      responseBytes: transport?.metadata.responseBytes,
      finalUrl: transport?.metadata.finalUrl,
    },
  });
}

export function hasBlockingQuarantine(
  sourceId: string,
  entries: readonly QuarantineEntry[],
): boolean {
  return entries.some((entry) => entry.sourceId === sourceId && entry.state === "pending");
}

export function updateQuarantine(
  entries: readonly QuarantineEntry[],
  id: string,
  action: "retry" | "discard",
): QuarantineEntry[] {
  const index = entries.findIndex((entry) => entry.id === id);
  if (index < 0) throw new Error(`Quarentena não encontrada: ${id}.`);
  if (entries[index].state === "discarded") throw new Error("Quarentena já foi descartada.");
  return entries.map((entry, candidate) =>
    candidate === index
      ? quarantineSchema.parse({
          ...entry,
          state: action === "retry" ? "retry-approved" : "discarded",
          attempts: action === "retry" ? entry.attempts + 1 : entry.attempts,
        })
      : entry,
  );
}
