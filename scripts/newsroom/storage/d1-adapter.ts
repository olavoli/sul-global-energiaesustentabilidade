import type { ZodType } from "zod";

import type { D1Database } from "./d1-types";
import { StorageConflictError, StorageUnavailableError } from "./errors";
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

interface DocumentRow {
  key: string;
  value_json: string;
  version: number;
  updated_at: string;
}

export class D1StorageAdapter implements StorageAdapter {
  readonly driver = "d1" as const;
  constructor(
    private readonly database: D1Database,
    private readonly timeoutMs = 5_000,
  ) {}

  private async timed<T>(operation: Promise<T>): Promise<T> {
    return Promise.race([
      operation,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new StorageUnavailableError("Timeout no armazenamento D1.")),
          this.timeoutMs,
        ),
      ),
    ]);
  }

  async healthCheck() {
    const row = await this.timed(this.database.prepare("SELECT 1 AS ok").first<{ ok: number }>());
    return { ok: row?.ok === 1, driver: this.driver, detail: "Binding D1 disponível." };
  }

  async getDocument<T>(key: string, schema: ZodType<T>, fallback: T): Promise<StoredDocument<T>> {
    const row = await this.timed(
      this.database
        .prepare(
          "SELECT key, value_json, version, updated_at FROM newsroom_documents WHERE key = ?1",
        )
        .bind(key)
        .first<DocumentRow>(),
    );
    return row
      ? {
          key: row.key,
          value: schema.parse(JSON.parse(row.value_json)),
          version: row.version,
          updatedAt: row.updated_at,
        }
      : { key, value: schema.parse(fallback), version: 0, updatedAt: new Date(0).toISOString() };
  }

  async listDocuments(prefix: string, limit: number, cursor = "") {
    const result = await this.timed(
      this.database
        .prepare(
          "SELECT key, value_json, version, updated_at FROM newsroom_documents WHERE key LIKE ?1 AND key > ?2 ORDER BY key LIMIT ?3",
        )
        .bind(`${prefix}%`, cursor, Math.min(limit, 100))
        .all<DocumentRow>(),
    );
    const items = (result.results ?? []).map((row) => ({
      key: row.key,
      value: JSON.parse(row.value_json) as unknown,
      version: row.version,
      updatedAt: row.updated_at,
    }));
    return { items, cursor: items.length === limit ? items.at(-1)?.key : undefined };
  }

  async putDocument<T>(input: DocumentWrite, schema: ZodType<T>): Promise<StoredDocument<T>> {
    const value = schema.parse(input.value);
    const current = await this.getDocument(input.key, schema, value);
    if (input.expectedVersion !== undefined && current.version !== input.expectedVersion)
      throw new StorageConflictError();
    const updatedAt = new Date().toISOString();
    const result = await this.timed(
      this.database
        .prepare(
          `INSERT INTO newsroom_documents (key,value_json,version,updated_at) VALUES (?1,?2,1,?3)
           ON CONFLICT(key) DO UPDATE SET value_json=?2,version=version+1,updated_at=?3
           WHERE version=?4`,
        )
        .bind(input.key, JSON.stringify(value), updatedAt, current.version)
        .run(),
    );
    if ((result.meta?.changes ?? 0) !== 1) throw new StorageConflictError();
    return { key: input.key, value, version: current.version + 1, updatedAt };
  }

  async deleteDocument(key: string, expectedVersion?: number) {
    const sql =
      expectedVersion === undefined
        ? "DELETE FROM newsroom_documents WHERE key=?1"
        : "DELETE FROM newsroom_documents WHERE key=?1 AND version=?2";
    const result = await this.timed(this.database.prepare(sql).bind(key, expectedVersion).run());
    if (expectedVersion !== undefined && (result.meta?.changes ?? 0) !== 1)
      throw new StorageConflictError();
  }

  async transaction(writes: DocumentWrite[]) {
    const statements = writes.map((write) =>
      this.database
        .prepare(
          `INSERT INTO newsroom_documents (key,value_json,version,updated_at) VALUES (?1,?2,1,?3)
           ON CONFLICT(key) DO UPDATE SET value_json=?2,version=version+1,updated_at=?3
           WHERE (?4 IS NULL OR version=?4)`,
        )
        .bind(
          write.key,
          JSON.stringify(write.value),
          new Date().toISOString(),
          write.expectedVersion ?? null,
        ),
    );
    const results = await this.timed(this.database.batch(statements));
    if (results.some((result) => !result.success || (result.meta?.changes ?? 0) !== 1))
      throw new StorageConflictError("Transação recusada por conflito.");
  }

  async appendAudit(event: AuditEvent) {
    await this.timed(
      this.database
        .prepare("INSERT INTO newsroom_audit (id,timestamp,event_json) VALUES (?1,?2,?3)")
        .bind(event.id, event.timestamp, JSON.stringify(event))
        .run(),
    );
  }
  async listAudit(limit: number, cursor = ""): Promise<Page<AuditEvent>> {
    const result = await this.timed(
      this.database
        .prepare("SELECT id,event_json FROM newsroom_audit WHERE id>?1 ORDER BY id LIMIT ?2")
        .bind(cursor, Math.min(limit, 100))
        .all<{ id: string; event_json: string }>(),
    );
    const rows = result.results ?? [];
    return {
      items: rows.map(({ event_json }) => JSON.parse(event_json) as AuditEvent),
      cursor: rows.at(-1)?.id,
    };
  }

  async createSession(session: StoredSession) {
    await this.database
      .prepare("INSERT INTO newsroom_sessions (id,session_json,expires_at) VALUES (?1,?2,?3)")
      .bind(session.id, JSON.stringify(session), session.expiresAt)
      .run();
  }
  async getSession(id: string) {
    const row = await this.database
      .prepare("SELECT session_json FROM newsroom_sessions WHERE id=?1")
      .bind(id)
      .first<{ session_json: string }>();
    return row ? (JSON.parse(row.session_json) as StoredSession) : undefined;
  }
  async revokeSession(id: string, revokedAt: number) {
    const session = await this.getSession(id);
    if (session)
      await this.database
        .prepare("UPDATE newsroom_sessions SET session_json=?2 WHERE id=?1")
        .bind(id, JSON.stringify({ ...session, revokedAt }))
        .run();
  }
  async getRateLimit(key: string) {
    const row = await this.database
      .prepare("SELECT state_json FROM newsroom_rate_limits WHERE key=?1")
      .bind(key)
      .first<{ state_json: string }>();
    return row ? (JSON.parse(row.state_json) as RateLimitState) : undefined;
  }
  async putRateLimit(state: RateLimitState) {
    await this.database
      .prepare(
        "INSERT INTO newsroom_rate_limits (key,state_json,expires_at) VALUES (?1,?2,?3) ON CONFLICT(key) DO UPDATE SET state_json=?2,expires_at=?3",
      )
      .bind(state.key, JSON.stringify(state), state.expiresAt)
      .run();
  }
  async deleteRateLimit(key: string) {
    await this.database.prepare("DELETE FROM newsroom_rate_limits WHERE key=?1").bind(key).run();
  }

  async acquireLock(input: Omit<DistributedLock, "fencingToken">) {
    const result = await this.database
      .prepare(
        `INSERT INTO newsroom_locks (key,owner,run_id,acquired_at,heartbeat_at,expires_at,fencing_token)
       VALUES (?1,?2,?3,?4,?5,?6,1)
       ON CONFLICT(key) DO UPDATE SET owner=?2,run_id=?3,acquired_at=?4,heartbeat_at=?5,
       expires_at=?6,fencing_token=fencing_token+1 WHERE expires_at<=?4`,
      )
      .bind(
        input.key,
        input.owner,
        input.runId,
        input.acquiredAt,
        input.heartbeatAt,
        input.expiresAt,
      )
      .run();
    if ((result.meta?.changes ?? 0) !== 1) throw new StorageConflictError("Lock global ocupado.");
    const lock = await this.database
      .prepare("SELECT * FROM newsroom_locks WHERE key=?1")
      .bind(input.key)
      .first<Record<string, unknown>>();
    if (!lock) throw new StorageUnavailableError();
    return { ...input, fencingToken: Number(lock.fencing_token) };
  }
  async getLock(key: string) {
    const row = await this.database
      .prepare("SELECT * FROM newsroom_locks WHERE key=?1")
      .bind(key)
      .first<Record<string, unknown>>();
    return row
      ? {
          key,
          owner: String(row.owner),
          runId: String(row.run_id),
          acquiredAt: String(row.acquired_at),
          heartbeatAt: String(row.heartbeat_at),
          expiresAt: String(row.expires_at),
          fencingToken: Number(row.fencing_token),
        }
      : undefined;
  }
  async renewLock(key: string, owner: string, expiresAt: string) {
    const now = new Date().toISOString();
    const result = await this.database
      .prepare("UPDATE newsroom_locks SET heartbeat_at=?3,expires_at=?4 WHERE key=?1 AND owner=?2")
      .bind(key, owner, now, expiresAt)
      .run();
    if ((result.meta?.changes ?? 0) !== 1) throw new StorageConflictError();
    const row = await this.database
      .prepare("SELECT * FROM newsroom_locks WHERE key=?1")
      .bind(key)
      .first<Record<string, unknown>>();
    return {
      key,
      owner,
      runId: String(row?.run_id),
      acquiredAt: String(row?.acquired_at),
      heartbeatAt: now,
      expiresAt,
      fencingToken: Number(row?.fencing_token),
    };
  }
  async releaseLock(key: string, owner: string) {
    await this.database
      .prepare("DELETE FROM newsroom_locks WHERE key=?1 AND owner=?2")
      .bind(key, owner)
      .run();
  }

  async putObject(object: PrivateObject) {
    await this.putDocument({ key: `object/${object.key}`, value: object }, {
      parse: (value) => value,
    } as ZodType<PrivateObject>);
  }
  async getObject(key: string) {
    const value = await this.getDocument(
      `object/${key}`,
      { parse: (input) => input as PrivateObject } as ZodType<PrivateObject>,
      undefined as never,
    );
    return value.version ? value.value : undefined;
  }
  async listObjects(prefix: string, limit: number, cursor?: string) {
    const page = await this.listDocuments(`object/${prefix}`, limit, cursor);
    return { items: page.items.map(({ value }) => value as PrivateObject), cursor: page.cursor };
  }
}
