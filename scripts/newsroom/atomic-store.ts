import { createHash } from "node:crypto";
import { relative, resolve } from "node:path";

import type { ZodType } from "zod";

import { loadStoredDocument, saveStoredDocument } from "./storage/documents";

function keyFor(path: string): string {
  const relativePath = relative(resolve("newsroom"), resolve(path)).replaceAll("\\", "/");
  if (relativePath.startsWith("../"))
    return `document/test/${createHash("sha256").update(resolve(path)).digest("hex")}`;
  return `document/${relativePath.replace(/\.json$/, "")}`;
}

export async function loadDocument<T>(path: string, schema: ZodType<T>, fallback: T): Promise<T> {
  return loadStoredDocument(keyFor(path), schema, fallback, path);
}

export async function saveDocument<T>(path: string, schema: ZodType<T>, value: T): Promise<void> {
  await saveStoredDocument(keyFor(path), schema, value, path);
}
