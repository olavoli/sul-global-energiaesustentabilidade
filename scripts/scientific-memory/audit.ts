import type { StorageAdapter } from "../newsroom/storage/contracts";

export async function auditMemory(
  adapter: StorageAdapter,
  input: {
    action: "memory.created" | "memory.updated" | "memory.rebuilt";
    actor: string;
    at: string;
    checksum: string;
    articles: number;
    entities: number;
    affectedEntities: number;
  },
) {
  await adapter.appendAudit({
    id: crypto.randomUUID(),
    timestamp: input.at,
    actor: input.actor,
    action: input.action,
    entity: "scientific-memory",
    entityId: input.checksum.slice(0, 16),
    reason: "Atualização estrutural determinística da memória científica.",
    origin: "local-supervised",
    success: true,
    version: 1,
    after: {
      articles: input.articles,
      entities: input.entities,
      affectedEntities: input.affectedEntities,
      checksum: input.checksum,
      generatedContent: false,
    },
  });
}
