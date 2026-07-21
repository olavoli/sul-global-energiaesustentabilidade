import type { StorageAdapter } from "../newsroom/storage/contracts";

export type TrendAuditAction =
  | "trend.run.started"
  | "trend.run.completed"
  | "trend.signal.created"
  | "trend.signal.updated"
  | "trend.signal.reviewed"
  | "trend.rebuilt"
  | "trend.policy.loaded";
export async function auditTrend(
  adapter: StorageAdapter,
  input: {
    action: TrendAuditAction;
    actor: string;
    at: string;
    entityId: string;
    after?: Record<string, unknown>;
  },
) {
  await adapter.appendAudit({
    id: crypto.randomUUID(),
    timestamp: input.at,
    actor: input.actor,
    action: input.action,
    entity: "scientific-trend",
    entityId: input.entityId,
    reason: "Operação estrutural determinística de sinal temporal.",
    origin: "local-supervised",
    success: true,
    version: 1,
    after: { ...input.after, generatedContent: false, published: false },
  });
}
