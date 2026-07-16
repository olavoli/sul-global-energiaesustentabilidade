import { resolve } from "node:path";

import { loadDocument, saveDocument } from "./atomic-store";
import {
  decisionDocumentSchema,
  pitchDocumentSchema,
  type EditorialDecision,
  type Pitch,
} from "./orchestrator-schema";

const DECISIONS = resolve("newsroom/decisions/index.json");
const PITCHES = resolve("newsroom/pitches/index.json");

export async function loadDecisions(): Promise<EditorialDecision[]> {
  return (
    await loadDocument(DECISIONS, decisionDocumentSchema, {
      version: 1,
      policyVersion: "none",
      decisions: [],
    })
  ).decisions;
}

export async function saveDecisions(
  decisions: EditorialDecision[],
  policyVersion: string,
): Promise<void> {
  await saveDocument(DECISIONS, decisionDocumentSchema, {
    version: 1,
    policyVersion,
    decisions: retain(decisions),
  });
}

function retain(decisions: EditorialDecision[], days = 180): EditorialDecision[] {
  const cutoff = Date.now() - days * 86_400_000;
  return decisions.filter(
    (decision) =>
      decision.status !== "archived" || new Date(decision.updatedAt).valueOf() >= cutoff,
  );
}

export async function loadPitches(): Promise<Pitch[]> {
  return (await loadDocument(PITCHES, pitchDocumentSchema, { version: 1, pitches: [] })).pitches;
}

export async function savePitches(pitches: Pitch[]): Promise<void> {
  await saveDocument(PITCHES, pitchDocumentSchema, { version: 1, pitches });
}

export function mergeEvaluations(
  current: EditorialDecision[],
  evaluated: EditorialDecision[],
): EditorialDecision[] {
  const byCluster = new Map(current.map((decision) => [decision.clusterId, decision]));
  const next: EditorialDecision[] = [];
  for (const decision of evaluated) {
    const previous = byCluster.get(decision.clusterId);
    if (
      previous?.inputFingerprint === decision.inputFingerprint &&
      previous.policyVersion === decision.policyVersion
    ) {
      next.push(previous);
      continue;
    }
    if (previous?.policyVersion === decision.policyVersion) {
      next.push({
        ...decision,
        history: [
          ...previous.history,
          ...decision.history,
          {
            action: "re-evaluated",
            at: decision.updatedAt,
            actor: "deterministic-orchestrator",
            notes: "Entrada ou regra executável mudou; avaliação anterior preservada no histórico.",
          },
        ],
      });
      continue;
    }
    if (previous) next.push({ ...previous, status: "superseded" });
    next.push(decision);
  }
  return next;
}
