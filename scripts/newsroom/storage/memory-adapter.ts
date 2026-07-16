import type { ZodType } from "zod";

import { StorageConflictError } from "./errors";
import type {
  AuditEvent,
  DistributedLock,
  DocumentWrite,
  Page,
  PrivateObject,
  RateLimitState,
  StorageAdapter,
  StoredDocument,
  StoredSession,
} from "./contracts";

export class MemoryStorageAdapter implements StorageAdapter {
  readonly driver: StorageAdapter["driver"] = "memory";
  protected documents = new Map<string, StoredDocument<unknown>>();
  protected audits: AuditEvent[] = [];
  protected sessions = new Map<string, StoredSession>();
  protected limits = new Map<string, RateLimitState>();
  protected locks = new Map<string, DistributedLock>();
  protected objects = new Map<string, PrivateObject>();
  private fencing = 0;

  async healthCheck() {
    return { ok: true, driver: this.driver, detail: "Armazenamento isolado em memória." };
  }

  async getDocument<T>(key: string, schema: ZodType<T>, fallback: T): Promise<StoredDocument<T>> {
    const found = this.documents.get(key);
    return found
      ? { ...found, value: schema.parse(found.value) }
      : { key, value: schema.parse(fallback), version: 0, updatedAt: new Date(0).toISOString() };
  }

  async listDocuments(prefix: string, limit: number, cursor?: string) {
    const items = [...this.documents.values()]
      .filter(({ key }) => key.startsWith(prefix) && (!cursor || key > cursor))
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(0, limit);
    return { items, cursor: items.length === limit ? items.at(-1)?.key : undefined };
  }

  async putDocument<T>(input: DocumentWrite, schema: ZodType<T>): Promise<StoredDocument<T>> {
    const current = this.documents.get(input.key);
    if (input.expectedVersion !== undefined && (current?.version ?? 0) !== input.expectedVersion)
      throw new StorageConflictError();
    const next = {
      key: input.key,
      value: schema.parse(input.value),
      version: (current?.version ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    this.documents.set(input.key, next);
    return next;
  }

  async deleteDocument(key: string, expectedVersion?: number): Promise<void> {
    const current = this.documents.get(key);
    if (expectedVersion !== undefined && (current?.version ?? 0) !== expectedVersion)
      throw new StorageConflictError();
    this.documents.delete(key);
  }

  async transaction(writes: DocumentWrite[]): Promise<void> {
    const snapshot = new Map(this.documents);
    try {
      for (const write of writes)
        await this.putDocument(write, { parse: (value: unknown) => value } as ZodType<unknown>);
    } catch (error) {
      this.documents = snapshot;
      throw error;
    }
  }

  async appendAudit(event: AuditEvent) {
    this.audits.push(structuredClone(event));
  }

  async listAudit(limit: number, cursor?: string): Promise<Page<AuditEvent>> {
    const offset = cursor ? Number(cursor) : 0;
    const items = this.audits.slice(offset, offset + limit);
    return {
      items,
      cursor:
        offset + items.length < this.audits.length ? String(offset + items.length) : undefined,
    };
  }

  async createSession(session: StoredSession) {
    this.sessions.set(session.id, structuredClone(session));
  }
  async getSession(id: string) {
    const value = this.sessions.get(id);
    return value ? structuredClone(value) : undefined;
  }
  async revokeSession(id: string, revokedAt: number) {
    const value = this.sessions.get(id);
    if (value) this.sessions.set(id, { ...value, revokedAt });
  }
  async getRateLimit(key: string) {
    const value = this.limits.get(key);
    return value ? structuredClone(value) : undefined;
  }
  async putRateLimit(state: RateLimitState) {
    this.limits.set(state.key, structuredClone(state));
  }
  async deleteRateLimit(key: string) {
    this.limits.delete(key);
  }

  async acquireLock(input: Omit<DistributedLock, "fencingToken">) {
    const current = this.locks.get(input.key);
    if (current && Date.parse(current.expiresAt) > Date.parse(input.acquiredAt))
      throw new StorageConflictError("Execução mutável concorrente bloqueada.");
    const lock = { ...input, fencingToken: ++this.fencing };
    this.locks.set(input.key, lock);
    return lock;
  }
  async getLock(key: string) {
    const lock = this.locks.get(key);
    return lock ? structuredClone(lock) : undefined;
  }
  async renewLock(key: string, owner: string, expiresAt: string) {
    const current = this.locks.get(key);
    if (!current || current.owner !== owner)
      throw new StorageConflictError("Lock não pertence ao ator.");
    const next = { ...current, heartbeatAt: new Date().toISOString(), expiresAt };
    this.locks.set(key, next);
    return next;
  }
  async releaseLock(key: string, owner: string) {
    if (this.locks.get(key)?.owner === owner) this.locks.delete(key);
  }

  async putObject(object: PrivateObject) {
    this.objects.set(object.key, structuredClone(object));
  }
  async getObject(key: string) {
    const value = this.objects.get(key);
    return value ? structuredClone(value) : undefined;
  }
  async listObjects(prefix: string, limit: number, cursor?: string): Promise<Page<PrivateObject>> {
    const items = [...this.objects.values()]
      .filter(({ key }) => key.startsWith(prefix) && (!cursor || key > cursor))
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(0, limit);
    return { items, cursor: items.length === limit ? items.at(-1)?.key : undefined };
  }
}
