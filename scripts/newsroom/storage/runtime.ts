import { D1StorageAdapter } from "./d1-adapter";
import type { D1Database } from "./d1-types";
import { StorageConfigurationError } from "./errors";
import { LocalFileStorageAdapter } from "./local-adapter";
import { MemoryStorageAdapter } from "./memory-adapter";
import type { StorageAdapter } from "./contracts";

export interface StorageEnvironment {
  NEWSROOM_STORAGE_DRIVER?: string;
  NEWSROOM_ENVIRONMENT?: string;
  NEWSROOM_DB?: D1Database;
}

let configured: StorageAdapter | undefined;

export function setStorageAdapter(adapter: StorageAdapter | undefined): void {
  configured = adapter;
}

export function storageAdapter(): StorageAdapter {
  if (configured) return configured;
  if (process.env.NODE_ENV === "test") {
    configured = new LocalFileStorageAdapter();
    return configured;
  }
  configured = createStorageAdapter({
    NEWSROOM_STORAGE_DRIVER: process.env.NEWSROOM_STORAGE_DRIVER,
    NEWSROOM_ENVIRONMENT: process.env.NEWSROOM_ENVIRONMENT,
  });
  return configured;
}

export function createStorageAdapter(environment: StorageEnvironment): StorageAdapter {
  const stage = environment.NEWSROOM_ENVIRONMENT ?? process.env.VITE_APP_ENV ?? "development";
  const requested = environment.NEWSROOM_STORAGE_DRIVER?.trim();
  const driver = requested || (["development", "test"].includes(stage) ? "local" : undefined);
  if (driver === "local") {
    if (stage === "production")
      throw new StorageConfigurationError("Produção não permite filesystem local.");
    return new LocalFileStorageAdapter();
  }
  if (driver === "memory") {
    if (stage !== "test")
      throw new StorageConfigurationError("Driver memory é exclusivo de testes.");
    return new MemoryStorageAdapter();
  }
  if (driver === "d1") {
    if (!environment.NEWSROOM_DB)
      throw new StorageConfigurationError("Binding NEWSROOM_DB não configurado.");
    return new D1StorageAdapter(environment.NEWSROOM_DB);
  }
  throw new StorageConfigurationError(
    requested ? `Driver desconhecido: ${requested}.` : `Driver obrigatório no ambiente ${stage}.`,
  );
}

export function configureStorage(environment: unknown): StorageAdapter {
  if (process.env.NODE_ENV === "test") {
    const adapter = configured ?? new LocalFileStorageAdapter();
    setStorageAdapter(adapter);
    return adapter;
  }
  const record =
    environment && typeof environment === "object" ? (environment as Record<string, unknown>) : {};
  const adapter = createStorageAdapter({
    NEWSROOM_STORAGE_DRIVER:
      typeof record.NEWSROOM_STORAGE_DRIVER === "string"
        ? record.NEWSROOM_STORAGE_DRIVER
        : process.env.NEWSROOM_STORAGE_DRIVER,
    NEWSROOM_ENVIRONMENT:
      typeof record.NEWSROOM_ENVIRONMENT === "string"
        ? record.NEWSROOM_ENVIRONMENT
        : process.env.NEWSROOM_ENVIRONMENT,
    NEWSROOM_DB:
      record.NEWSROOM_DB && typeof record.NEWSROOM_DB === "object"
        ? (record.NEWSROOM_DB as D1Database)
        : undefined,
  });
  setStorageAdapter(adapter);
  return adapter;
}
