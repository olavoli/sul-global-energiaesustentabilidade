import { resolve } from "node:path";

import { assertActivationEvidence, type SourceEvidence } from "./evidence";
import { validateExternalUrl } from "./security";
import { sourceSchema, type NewsSource } from "./schema";
import { loadStoredDocument, saveStoredDocument } from "./storage/documents";

export const DEFAULT_CATALOG_PATH = resolve("newsroom/sources/catalog.json");

export async function loadCatalog(path = DEFAULT_CATALOG_PATH): Promise<NewsSource[]> {
  return loadStoredDocument("sources/catalog", sourceSchema.array(), [], path);
}

export function prepareSourceAdd(
  input: unknown,
  catalog: readonly NewsSource[],
  evidence?: SourceEvidence,
): NewsSource {
  const source = sourceSchema.parse(input);
  if (source.collectionMethod === "local-fixture") {
    throw new Error("source:add aceita somente fonte real RSS ou Atom.");
  }
  validateExternalUrl(source.homepage);
  if (!source.feedUrl) throw new Error("Fonte real exige feedUrl confirmada.");
  validateExternalUrl(source.feedUrl);
  if (catalog.some(({ id }) => id === source.id))
    throw new Error(`ID já cadastrado: ${source.id}.`);
  const normalizedFeed = new URL(source.feedUrl).toString();
  if (catalog.some(({ feedUrl }) => feedUrl && new URL(feedUrl).toString() === normalizedFeed)) {
    throw new Error("Feed já cadastrado em outra fonte.");
  }
  if (source.active) {
    if (!evidence) throw new Error("Fonte não pode ser ativada sem dossiê verificável.");
    assertActivationEvidence(source, evidence);
  }
  return source;
}

export function prepareSourceDisable(id: string, catalog: readonly NewsSource[]): NewsSource[] {
  const index = catalog.findIndex((source) => source.id === id);
  if (index < 0) throw new Error(`Fonte não encontrada: ${id}.`);
  if (!catalog[index].active) throw new Error(`Fonte já está desativada: ${id}.`);
  return catalog.map((source, candidate) =>
    candidate === index ? sourceSchema.parse({ ...source, active: false }) : source,
  );
}

export function sourceDiff(source: NewsSource): string {
  return JSON.stringify(source, null, 2)
    .split("\n")
    .map((line) => `+ ${line}`)
    .join("\n");
}

export async function saveCatalog(
  sources: readonly NewsSource[],
  path = DEFAULT_CATALOG_PATH,
): Promise<void> {
  await saveStoredDocument("sources/catalog", sourceSchema.array(), [...sources], path);
}
