import type { EditorialDecision, HumanAction } from "./orchestrator-schema";

export function applyHumanDecision(
  decision: EditorialDecision,
  action: HumanAction,
  actor: string,
  notes: string,
  now: string,
): EditorialDecision {
  if (!actor.trim()) throw new Error("Ação humana exige --actor.");
  if (!notes.trim()) throw new Error("Ação humana exige --notes.");
  if (action === "approve-for-pitch" && decision.blockers.length)
    throw new Error("Decisão possui bloqueadores; aprovação para pauta não é permitida.");
  const status: EditorialDecision["status"] =
    action === "approve-for-pitch"
      ? "approved-for-pitch"
      : action === "reject"
        ? "rejected"
        : action === "monitor" || action.startsWith("request-")
          ? "monitoring"
          : "archived";
  return {
    ...decision,
    status,
    updatedAt: now,
    reviewedAt: now,
    reviewedBy: actor,
    humanDecision: action,
    humanNotes: notes,
    history: [...decision.history, { action, at: now, actor, notes }],
  };
}
