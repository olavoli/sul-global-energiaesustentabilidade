import { z, type ZodType } from "zod";

import type {
  DistributedLock,
  DocumentWrite,
  RateLimitState,
  StoredDocument,
  StoredSession,
} from "./contracts";
import { StorageConflictError } from "./errors";

interface DocumentStorage {
  getDocument<T>(key: string, schema: ZodType<T>, fallback: T): Promise<StoredDocument<T>>;
  putDocument<T>(input: DocumentWrite, schema: ZodType<T>): Promise<StoredDocument<T>>;
  deleteDocument(key: string, expectedVersion?: number): Promise<void>;
}

export class LocalOperationalState {
  constructor(private readonly storage: DocumentStorage) {}

  async createSession(session: StoredSession): Promise<void> {
    await this.storage.putDocument(
      { key: `sessions/${session.id}`, value: session, expectedVersion: 0 },
      z.custom<StoredSession>(),
    );
  }

  async getSession(id: string): Promise<StoredSession | undefined> {
    const stored = await this.storage.getDocument(
      `sessions/${id}`,
      z.custom<StoredSession>(),
      undefined as never,
    );
    return stored.version ? stored.value : undefined;
  }

  async revokeSession(id: string, revokedAt: number): Promise<void> {
    const current = await this.storage.getDocument(
      `sessions/${id}`,
      z.custom<StoredSession>(),
      undefined as never,
    );
    if (current.version)
      await this.storage.putDocument(
        {
          key: `sessions/${id}`,
          value: { ...current.value, revokedAt },
          expectedVersion: current.version,
        },
        z.custom<StoredSession>(),
      );
  }

  async getRateLimit(key: string): Promise<RateLimitState | undefined> {
    const stored = await this.storage.getDocument(
      `rate-limits/${key}`,
      z.custom<RateLimitState>(),
      undefined as never,
    );
    return stored.version ? stored.value : undefined;
  }

  async putRateLimit(state: RateLimitState): Promise<void> {
    const current = await this.storage.getDocument(
      `rate-limits/${state.key}`,
      z.custom<RateLimitState>(),
      state,
    );
    await this.storage.putDocument(
      { key: `rate-limits/${state.key}`, value: state, expectedVersion: current.version },
      z.custom<RateLimitState>(),
    );
  }

  async deleteRateLimit(key: string): Promise<void> {
    await this.storage.deleteDocument(`rate-limits/${key}`);
  }

  async acquireLock(input: Omit<DistributedLock, "fencingToken">): Promise<DistributedLock> {
    const key = `locks/${input.key}`;
    const current = await this.storage.getDocument(
      key,
      z.custom<DistributedLock>(),
      undefined as never,
    );
    if (current.version && Date.parse(current.value.expiresAt) > Date.parse(input.acquiredAt))
      throw new StorageConflictError("Já existe uma execução mutável ativa.");
    const lock = { ...input, fencingToken: (current.value?.fencingToken ?? 0) + 1 };
    await this.storage.putDocument(
      { key, value: lock, expectedVersion: current.version },
      z.custom<DistributedLock>(),
    );
    return lock;
  }

  async getLock(key: string): Promise<DistributedLock | undefined> {
    const stored = await this.storage.getDocument(
      `locks/${key}`,
      z.custom<DistributedLock>(),
      undefined as never,
    );
    return stored.version ? stored.value : undefined;
  }

  async renewLock(key: string, owner: string, expiresAt: string): Promise<DistributedLock> {
    const storageKey = `locks/${key}`;
    const current = await this.storage.getDocument(
      storageKey,
      z.custom<DistributedLock>(),
      undefined as never,
    );
    if (!current.version || current.value.owner !== owner) throw new StorageConflictError();
    const next = { ...current.value, heartbeatAt: new Date().toISOString(), expiresAt };
    await this.storage.putDocument(
      { key: storageKey, value: next, expectedVersion: current.version },
      z.custom<DistributedLock>(),
    );
    return next;
  }

  async releaseLock(key: string, owner: string): Promise<void> {
    const storageKey = `locks/${key}`;
    const current = await this.storage.getDocument(
      storageKey,
      z.custom<DistributedLock>(),
      undefined as never,
    );
    if (current.version && current.value.owner === owner)
      await this.storage.deleteDocument(storageKey, current.version);
  }
}
