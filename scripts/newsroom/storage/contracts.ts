import { z, type ZodType } from "zod";

export const storageRecordSchema = z.object({
  key: z.string().min(1).max(240),
  value: z.unknown(),
  version: z.number().int().nonnegative(),
  updatedAt: z.iso.datetime(),
});

export interface Page<T> {
  items: T[];
  cursor?: string;
}

export interface DocumentWrite {
  key: string;
  value: unknown;
  expectedVersion?: number;
  localPath?: string;
}

export interface StoredDocument<T> {
  key: string;
  value: T;
  version: number;
  updatedAt: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  reason?: string;
  origin: string;
  runId?: string;
  requestId?: string;
  success: boolean;
  version: number;
  before?: unknown;
  after?: unknown;
}

export interface StoredSession {
  id: string;
  actor: string;
  csrf: string;
  issuedAt: number;
  expiresAt: number;
  revokedAt?: number;
}

export interface RateLimitState {
  key: string;
  attempts: number[];
  expiresAt: number;
}

export interface DistributedLock {
  key: string;
  owner: string;
  runId: string;
  acquiredAt: string;
  heartbeatAt: string;
  expiresAt: string;
  fencingToken: number;
}

export interface PrivateObject {
  key: string;
  body: string;
  contentType: string;
  hash: string;
  size: number;
  createdAt: string;
}

export interface StorageAdapter {
  readonly driver: "local" | "memory" | "d1";
  healthCheck(): Promise<{ ok: boolean; driver: string; detail: string }>;
  getDocument<T>(
    key: string,
    schema: ZodType<T>,
    fallback: T,
    localPath?: string,
  ): Promise<StoredDocument<T>>;
  listDocuments(
    prefix: string,
    limit: number,
    cursor?: string,
  ): Promise<Page<StoredDocument<unknown>>>;
  putDocument<T>(input: DocumentWrite, schema: ZodType<T>): Promise<StoredDocument<T>>;
  deleteDocument(key: string, expectedVersion?: number, localPath?: string): Promise<void>;
  transaction(writes: DocumentWrite[]): Promise<void>;
  appendAudit(event: AuditEvent): Promise<void>;
  listAudit(limit: number, cursor?: string): Promise<Page<AuditEvent>>;
  createSession(session: StoredSession): Promise<void>;
  getSession(id: string): Promise<StoredSession | undefined>;
  revokeSession(id: string, revokedAt: number): Promise<void>;
  getRateLimit(key: string): Promise<RateLimitState | undefined>;
  putRateLimit(state: RateLimitState): Promise<void>;
  deleteRateLimit(key: string): Promise<void>;
  acquireLock(lock: Omit<DistributedLock, "fencingToken">): Promise<DistributedLock>;
  getLock(key: string): Promise<DistributedLock | undefined>;
  renewLock(key: string, owner: string, expiresAt: string): Promise<DistributedLock>;
  releaseLock(key: string, owner: string): Promise<void>;
  putObject(object: PrivateObject): Promise<void>;
  getObject(key: string): Promise<PrivateObject | undefined>;
  listObjects(prefix: string, limit: number, cursor?: string): Promise<Page<PrivateObject>>;
}

export interface EntityStore<T> {
  getById(id: string): Promise<T | undefined>;
  list(limit: number, cursor?: string): Promise<Page<T>>;
  create(value: T): Promise<void>;
  update(value: T, expectedVersion: number): Promise<void>;
}

export type SourceStore<T> = EntityStore<T>;
export type QueueStore<T> = EntityStore<T>;
export type QuarantineStore<T> = EntityStore<T>;
export type ClusterStore<T> = EntityStore<T>;
export type EvidenceStore<T> = EntityStore<T>;
export type TranslationStore<T> = EntityStore<T>;
export type DecisionStore<T> = EntityStore<T>;
export type PitchStore<T> = EntityStore<T>;
export type InboxStore<T> = EntityStore<T>;
export type RunStore<T> = EntityStore<T>;
export type ReportStore<T> = EntityStore<T>;
export type AuditStore = Pick<StorageAdapter, "appendAudit" | "listAudit">;
export type SessionStore = Pick<StorageAdapter, "createSession" | "getSession" | "revokeSession">;
export type RateLimitStore = Pick<
  StorageAdapter,
  "getRateLimit" | "putRateLimit" | "deleteRateLimit"
>;
export type LockStore = Pick<
  StorageAdapter,
  "acquireLock" | "getLock" | "renewLock" | "releaseLock"
>;
