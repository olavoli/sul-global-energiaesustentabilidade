import {
  appendFile,
  copyFile,
  mkdir,
  readFile,
  readdir,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { type ZodType } from "zod";

import { MemoryStorageAdapter } from "./memory-adapter";
import { StorageConflictError } from "./errors";
import { LocalObjectState } from "./local-object-state";
import { LocalOperationalState } from "./local-operational-state";
import type {
  AuditEvent,
  DistributedLock,
  DocumentWrite,
  Page,
  PrivateObject,
  StoredDocument,
  StoredSession,
  RateLimitState,
  StorageAdapter,
} from "./contracts";

interface LocalEnvelope {
  storageVersion: number;
  updatedAt: string;
  value: unknown;
}
function isEnvelope(value: unknown): value is LocalEnvelope {
  return Boolean(
    value &&
    typeof value === "object" &&
    "storageVersion" in value &&
    "updatedAt" in value &&
    "value" in value,
  );
}

export class LocalFileStorageAdapter extends MemoryStorageAdapter {
  override readonly driver: StorageAdapter["driver"] = "local";
  private readonly operational = new LocalOperationalState(this);
  private readonly objectState: LocalObjectState;

  constructor(private readonly root = resolve("newsroom")) {
    super();
    this.objectState = new LocalObjectState(this.root, (path, body) =>
      this.atomicWrite(path, body),
    );
  }

  override async healthCheck() {
    await mkdir(resolve(this.root, "storage"), { recursive: true });
    return { ok: true, driver: this.driver, detail: `Filesystem local: ${this.root}` };
  }

  private pathFor(key: string, localPath?: string): string {
    if (localPath) return resolve(localPath);
    if (!/^[a-z0-9][a-z0-9/_.-]*$/i.test(key) || key.includes(".."))
      throw new Error("Chave local inválida.");
    return resolve(this.root, "storage", `${key}.json`);
  }

  override async getDocument<T>(
    key: string,
    schema: ZodType<T>,
    fallback: T,
    localPath?: string,
  ): Promise<StoredDocument<T>> {
    const path = this.pathFor(key, localPath);
    try {
      const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
      const envelope = isEnvelope(parsed)
        ? parsed
        : { storageVersion: 0, updatedAt: new Date(0).toISOString(), value: parsed };
      return {
        key,
        value: schema.parse(envelope.value),
        version: envelope.storageVersion,
        updatedAt: envelope.updatedAt,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        return {
          key,
          value: schema.parse(fallback),
          version: 0,
          updatedAt: new Date(0).toISOString(),
        };
      throw new Error(`Documento operacional inválido (${key}).`);
    }
  }

  override async putDocument<T>(
    input: DocumentWrite,
    schema: ZodType<T>,
  ): Promise<StoredDocument<T>> {
    const path = this.pathFor(input.key, input.localPath);
    const current = await this.getDocument(
      input.key,
      schema,
      schema.parse(input.value),
      input.localPath,
    );
    if (input.expectedVersion !== undefined && current.version !== input.expectedVersion)
      throw new StorageConflictError();
    const next = {
      key: input.key,
      value: schema.parse(input.value),
      version: current.version + 1,
      updatedAt: new Date().toISOString(),
    };
    await this.atomicWrite(
      path,
      input.localPath
        ? `${JSON.stringify(next.value, null, 2)}\n`
        : `${JSON.stringify(
            { storageVersion: next.version, updatedAt: next.updatedAt, value: next.value },
            null,
            2,
          )}\n`,
    );
    return next;
  }

  override async listDocuments(prefix: string, limit: number, cursor = "") {
    const root = resolve(this.root, "storage");
    const names = await readdir(root, { recursive: true }).catch(() => []);
    const items: StoredDocument<unknown>[] = [];
    for (const name of names
      .filter((value) => value.endsWith(".json"))
      .map((value) => value.replaceAll("\\", "/").replace(/\.json$/, ""))
      .filter((key) => key.startsWith(prefix) && key > cursor)
      .sort()
      .slice(0, limit)) {
      const value = await this.getDocument(
        name,
        { parse: (input: unknown) => input } as ZodType<unknown>,
        undefined,
      );
      if (value.version) items.push(value);
    }
    return { items, cursor: items.length === limit ? items.at(-1)?.key : undefined };
  }

  override async deleteDocument(key: string, expectedVersion?: number, localPath?: string) {
    const current = await this.getDocument(
      key,
      { parse: (input: unknown) => input } as ZodType<unknown>,
      undefined,
      localPath,
    );
    if (expectedVersion !== undefined && current.version !== expectedVersion)
      throw new StorageConflictError();
    await unlink(this.pathFor(key, localPath)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }

  private async atomicWrite(path: string, body: string): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    const lock = `${path}.storage.lock`;
    try {
      await writeFile(lock, JSON.stringify({ at: new Date().toISOString() }), { flag: "wx" });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new StorageConflictError();
      throw error;
    }
    const temporary = `${path}.tmp`;
    try {
      await copyFile(path, `${path}.backup`).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
      });
      await writeFile(temporary, body, "utf8");
      JSON.parse(await readFile(temporary, "utf8"));
      await rename(temporary, path);
    } finally {
      await unlink(lock).catch(() => undefined);
      await unlink(temporary).catch(() => undefined);
    }
  }

  override async transaction(writes: DocumentWrite[]): Promise<void> {
    const snapshots = await Promise.all(
      writes.map(async (write) => {
        const path = this.pathFor(write.key, write.localPath);
        return readFile(path, "utf8").catch(() => undefined);
      }),
    );
    try {
      for (const write of writes)
        await this.putDocument(write, { parse: (value: unknown) => value } as ZodType<unknown>);
    } catch (error) {
      await Promise.all(
        writes.map(async (write, index) => {
          const path = this.pathFor(write.key, write.localPath);
          if (snapshots[index] === undefined) await unlink(path).catch(() => undefined);
          else await writeFile(path, snapshots[index], "utf8");
        }),
      );
      throw error;
    }
  }

  override async appendAudit(event: AuditEvent) {
    const path = resolve(this.root, "audit/storage-events.jsonl");
    await mkdir(dirname(path), { recursive: true });
    await appendFile(path, `${JSON.stringify(event)}\n`, "utf8");
  }

  override async listAudit(limit: number, cursor?: string): Promise<Page<AuditEvent>> {
    const path = resolve(this.root, "audit/storage-events.jsonl");
    const lines = await readFile(path, "utf8")
      .then((value) => value.split(/\r?\n/).filter(Boolean))
      .catch(() => []);
    const offset = cursor ? Number(cursor) : 0;
    const items = lines.slice(offset, offset + limit).map((line) => JSON.parse(line) as AuditEvent);
    return {
      items,
      cursor: offset + items.length < lines.length ? String(offset + items.length) : undefined,
    };
  }

  override async createSession(session: StoredSession) {
    if (process.env.NODE_ENV === "test") return super.createSession(session);
    return this.operational.createSession(session);
  }
  override async getSession(id: string) {
    if (process.env.NODE_ENV === "test") return super.getSession(id);
    return this.operational.getSession(id);
  }
  override async revokeSession(id: string, revokedAt: number) {
    if (process.env.NODE_ENV === "test") return super.revokeSession(id, revokedAt);
    return this.operational.revokeSession(id, revokedAt);
  }
  override async getRateLimit(key: string) {
    if (process.env.NODE_ENV === "test") return super.getRateLimit(key);
    return this.operational.getRateLimit(key);
  }
  override async putRateLimit(state: RateLimitState) {
    if (process.env.NODE_ENV === "test") return super.putRateLimit(state);
    return this.operational.putRateLimit(state);
  }
  override async deleteRateLimit(key: string) {
    if (process.env.NODE_ENV === "test") return super.deleteRateLimit(key);
    return this.operational.deleteRateLimit(key);
  }

  override async acquireLock(input: Omit<DistributedLock, "fencingToken">) {
    if (process.env.NODE_ENV === "test") return super.acquireLock(input);
    return this.operational.acquireLock(input);
  }
  override async getLock(key: string) {
    if (process.env.NODE_ENV === "test") return super.getLock(key);
    return this.operational.getLock(key);
  }
  override async renewLock(key: string, owner: string, expiresAt: string) {
    if (process.env.NODE_ENV === "test") return super.renewLock(key, owner, expiresAt);
    return this.operational.renewLock(key, owner, expiresAt);
  }
  override async releaseLock(key: string, owner: string) {
    if (process.env.NODE_ENV === "test") return super.releaseLock(key, owner);
    return this.operational.releaseLock(key, owner);
  }

  override async putObject(object: PrivateObject) {
    return this.objectState.put(object);
  }

  override async getObject(key: string) {
    return this.objectState.get(key);
  }

  override async listObjects(
    prefix: string,
    limit: number,
    cursor?: string,
  ): Promise<Page<PrivateObject>> {
    return this.objectState.list(prefix, limit, cursor);
  }
}
