import type { AuditEntry } from "./schema";
import type { CommandResult } from "./cli-types";

export const CONFIGURATION_VERSION = "newsroom-editorial-orchestrator-1";

export function createAudit(
  command: string,
  actor: string,
  dryRun: boolean,
  started: number,
  result: CommandResult = {},
): AuditEntry {
  return {
    command,
    timestamp: new Date().toISOString(),
    source: result.source ?? "fila-local",
    itemsFetched: result.itemsFetched ?? 0,
    itemsAccepted: result.itemsAccepted ?? 0,
    itemsRejected: result.itemsRejected ?? 0,
    duplicates: result.duplicates ?? 0,
    errors: result.errors ?? [],
    duration: Date.now() - started,
    configurationVersion: CONFIGURATION_VERSION,
    actor,
    dryRun,
    itemsRead: result.itemsRead ?? 0,
    clustersCreated: result.clustersCreated ?? 0,
    clustersChanged: result.clustersChanged ?? 0,
    translationsQueued: result.translationsQueued ?? 0,
    translationsApproved: result.translationsApproved ?? 0,
    decisionsEvaluated: result.decisionsEvaluated ?? 0,
    humanActions: result.humanActions ?? 0,
    pitchesCreated: result.pitchesCreated ?? 0,
  };
}

export function printAudit(entry: AuditEntry): void {
  console.log(
    `Auditoria: lidos=${entry.itemsRead}; decisões=${entry.decisionsEvaluated}; ações-humanas=${entry.humanActions}; pautas=${entry.pitchesCreated}; erros=${entry.errors.length}; dryRun=${entry.dryRun}.`,
  );
}
