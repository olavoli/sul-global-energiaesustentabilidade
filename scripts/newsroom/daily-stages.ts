import type { RunMode, StageName, StageResult } from "./automation-schema";

export function skippedStage(name: StageName, reason: string, now: Date): StageResult {
  const at = now.toISOString();
  return {
    name,
    status: "skipped",
    startedAt: at,
    finishedAt: at,
    durationMs: 0,
    input: {},
    output: {},
    warnings: [reason],
    errors: [],
    retryStrategy: "Sem retry.",
    interruptionPolicy: "Prosseguir quando seguro.",
  };
}

export function completedStage(
  name: StageName,
  now: Date,
  output: StageResult["output"] = {},
  warnings: string[] = [],
): StageResult {
  const at = now.toISOString();
  return {
    name,
    status: "completed",
    startedAt: at,
    finishedAt: at,
    durationMs: 0,
    input: {},
    output,
    warnings,
    errors: [],
    retryStrategy: ["source-health", "collection"].includes(name)
      ? "Falhas transitÃ³rias, no mÃ¡ximo dois retries."
      : "Sem retry automÃ¡tico.",
    interruptionPolicy: "Checkpoint consistente antes do prÃ³ximo estÃ¡gio.",
  };
}

export function modeSkips(mode: RunMode, stage: StageName): string | undefined {
  if (
    mode === "validate-only" &&
    ![
      "environment-check",
      "configuration-check",
      "daily-report",
      "notification",
      "cleanup",
      "lock-release",
    ].includes(stage)
  )
    return "Modo validate-only.";
  if (
    mode === "report-only" &&
    ![
      "environment-check",
      "configuration-check",
      "daily-report",
      "notification",
      "cleanup",
      "lock-release",
    ].includes(stage)
  )
    return "Modo report-only.";
  if (
    mode === "collect-only" &&
    ["clustering", "evidence-packages", "translation-queue", "orchestration"].includes(stage)
  )
    return "Modo collect-only.";
  if (mode === "process-existing" && ["source-health", "collection"].includes(stage))
    return "Modo process-existing nÃ£o acessa rede.";
  return undefined;
}
