import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { loadDocument, saveDocument } from "./atomic-store";
import { qualityPassed, runQualityChecks } from "./translation-quality";
import { translationProvider } from "./translation-providers";
import { translationDocumentSchema, type TranslationEntry } from "./translation-schema";
import type { StoryCluster } from "./story-schema";

const PATH = resolve("newsroom/translations.json");
const GLOSSARY = resolve("newsroom/glossary.pt-BR.json");

function stableId(clusterId: string, text: string): string {
  return `translation-${createHash("sha256").update(`${clusterId}|${text}`).digest("hex").slice(0, 16)}`;
}

export async function glossaryVersion(): Promise<string> {
  const raw = await readFile(GLOSSARY, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("version" in parsed) ||
    typeof parsed.version !== "string"
  )
    throw new Error("Glossário inválido.");
  return parsed.version;
}

export async function loadTranslations(): Promise<TranslationEntry[]> {
  return (await loadDocument(PATH, translationDocumentSchema, { version: 1, entries: [] })).entries;
}

export async function saveTranslations(entries: TranslationEntry[]): Promise<void> {
  await saveDocument(PATH, translationDocumentSchema, { version: 1, entries });
}

export async function queueTranslation(
  cluster: StoryCluster,
  existing: TranslationEntry[],
  now: string,
  actor: string,
): Promise<TranslationEntry[]> {
  const id = stableId(cluster.id, cluster.canonicalTitle);
  if (existing.some((entry) => entry.id === id)) return existing;
  const sourceLanguage = cluster.languages[0];
  const isPortuguese = sourceLanguage.toLowerCase().startsWith("pt");
  return [
    ...existing,
    {
      id,
      clusterId: cluster.id,
      sourceLanguage,
      targetLanguage: "pt-BR",
      sourceText: cluster.canonicalTitle.slice(0, 500),
      provider: isPortuguese ? "passthrough" : "fixture",
      providerVersion: isPortuguese ? "passthrough-v1" : "fixture-v1",
      status: isPortuguese ? "not-required" : "queued",
      glossaryVersion: await glossaryVersion(),
      qualityChecks: [],
      createdAt: now,
      updatedAt: now,
      attempts: 0,
      history: [
        { action: "queued", at: now, actor, notes: "Fila local; nenhuma chamada externa." },
      ],
    },
  ];
}

export async function runTranslation(
  entry: TranslationEntry,
  now: string,
  actor: string,
): Promise<TranslationEntry> {
  if (entry.status !== "queued" && entry.status !== "failed")
    throw new Error("Tradução não está disponível para execução.");
  try {
    const provider = translationProvider(entry.provider);
    const translatedText = await provider.translate(entry.sourceText, entry.sourceLanguage);
    const qualityChecks = runQualityChecks(entry.sourceText, translatedText);
    return {
      ...entry,
      translatedText,
      qualityChecks,
      status: qualityPassed(qualityChecks) ? "review-required" : "failed",
      updatedAt: now,
      attempts: entry.attempts + 1,
      history: [
        ...entry.history,
        {
          action: "translated",
          at: now,
          actor,
          notes: `Provider local ${provider.version}; revisão obrigatória.`,
        },
      ],
    };
  } catch (error) {
    return {
      ...entry,
      status: "failed",
      updatedAt: now,
      attempts: entry.attempts + 1,
      reviewNotes: error instanceof Error ? error.message : String(error),
      history: [
        ...entry.history,
        {
          action: "translation-failed",
          at: now,
          actor,
          notes: "Falha local; original preservado.",
        },
      ],
    };
  }
}

export function reviewTranslation(
  entry: TranslationEntry,
  decision: "approve" | "reject" | "retry",
  actor: string,
  notes: string,
  now: string,
): TranslationEntry {
  if (!actor.trim() || !notes.trim()) throw new Error("Revisão exige ator e notas.");
  if (decision === "approve" && entry.status !== "review-required")
    throw new Error("Somente tradução pendente de revisão pode ser aprovada.");
  const status =
    decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "queued";
  return {
    ...entry,
    status,
    updatedAt: now,
    reviewedBy: actor,
    reviewedAt: now,
    reviewNotes: notes,
    history: [...entry.history, { action: decision, at: now, actor, notes }],
  };
}
