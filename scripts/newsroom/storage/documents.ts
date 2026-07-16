import type { ZodType } from "zod";

import { storageAdapter } from "./runtime";

export async function loadStoredDocument<T>(
  key: string,
  schema: ZodType<T>,
  fallback: T,
  localPath?: string,
): Promise<T> {
  return (await storageAdapter().getDocument(key, schema, fallback, localPath)).value;
}

export async function saveStoredDocument<T>(
  key: string,
  schema: ZodType<T>,
  value: T,
  localPath?: string,
  expectedVersion?: number,
): Promise<void> {
  await storageAdapter().putDocument({ key, value, localPath, expectedVersion }, schema);
}
