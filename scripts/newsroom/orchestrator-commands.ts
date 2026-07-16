import type { CliContext, CommandResult } from "./cli-types";
import { applyHumanDecision } from "./decision-actions";
import {
  loadDecisions,
  loadPitches,
  mergeEvaluations,
  saveDecisions,
  savePitches,
} from "./decision-store";
import { evaluateAll } from "./orchestrator-service";
import {
  humanActions,
  type EditorialDecision,
  type HumanAction,
  type Pitch,
} from "./orchestrator-schema";
import { calculateOrchestratorMetrics } from "./orchestrator-metrics";
import { createPitch, updatePitch } from "./pitch";
import { loadClusters, loadEvidencePackages } from "./story-store";
import { loadTranslations } from "./translation";

const COMMANDS = new Set([
  "orchestrate",
  "decision:list",
  "decision:show",
  "decision:review",
  "decision:act",
  "decision:stats",
  "pitch:create",
  "pitch:list",
  "pitch:show",
  "pitch:update",
]);

export function isOrchestratorCommand(command: string): boolean {
  return COMMANDS.has(command);
}

function printDecision(decision: EditorialDecision): void {
  console.log(
    `${decision.id} | ${decision.status} | ${decision.recommendation} | risco=${decision.riskLevel} | bloqueadores=${decision.blockers.length} | ${decision.clusterId}`,
  );
}

function filterDecisions(decisions: EditorialDecision[], context: CliContext): EditorialDecision[] {
  return decisions.filter(
    (decision) =>
      (!context.option("risk") || decision.riskLevel === context.option("risk")) &&
      (!context.option("recommendation") ||
        decision.recommendation === context.option("recommendation")) &&
      (!context.option("topic") || decision.topics.includes(context.option("topic") ?? "")) &&
      (!context.option("readiness") ||
        decision.readiness.overallReady.state === context.option("readiness")),
  );
}

async function decisionsCommand(context: CliContext): Promise<CommandResult> {
  if (context.command === "orchestrate") {
    const evaluated = await evaluateAll();
    evaluated.decisions.forEach(printDecision);
    if (context.apply)
      await saveDecisions(
        mergeEvaluations(await loadDecisions(), evaluated.decisions),
        evaluated.policyVersion,
      );
    else console.log("Dry-run: decisões não persistidas e nenhuma pauta criada.");
    return {
      itemsRead: evaluated.decisions.length,
      decisionsEvaluated: evaluated.decisions.length,
    };
  }
  const decisions = await loadDecisions();
  if (context.command === "decision:list") {
    filterDecisions(decisions, context).forEach(printDecision);
    return { itemsRead: decisions.length };
  }
  if (context.command === "decision:stats") {
    console.log(JSON.stringify(calculateOrchestratorMetrics(decisions), null, 2));
    return { itemsRead: decisions.length };
  }
  const id = context.positional[0];
  const index = decisions.findIndex((decision) => decision.id === id);
  if (index < 0) throw new Error(`Decisão não encontrada: ${id ?? "(id ausente)"}.`);
  if (["decision:show", "decision:review"].includes(context.command)) {
    const [clusters, packages, translations] = await Promise.all([
      loadClusters(),
      loadEvidencePackages(),
      loadTranslations(),
    ]);
    const cluster = clusters.find(({ id: clusterId }) => clusterId === decisions[index].clusterId);
    const evidence = packages.find(({ clusterId }) => clusterId === decisions[index].clusterId);
    console.log(
      JSON.stringify(
        {
          decision: decisions[index],
          cluster,
          evidence,
          translations: translations.filter(
            ({ clusterId }) => clusterId === decisions[index].clusterId,
          ),
        },
        null,
        2,
      ),
    );
    return { itemsRead: 1 };
  }
  const action = context.positional[1] as HumanAction | undefined;
  if (!action || !humanActions.includes(action))
    throw new Error("Ação humana inválida; publish não existe.");
  decisions[index] = applyHumanDecision(
    decisions[index],
    action,
    context.option("actor") ?? "",
    context.option("notes") ?? "",
    new Date().toISOString(),
  );
  if (context.apply) await saveDecisions(decisions, decisions[index].policyVersion);
  else console.log("Dry-run: ação humana não persistida.");
  return { itemsRead: 1, humanActions: 1 };
}

function printPitch(pitch: Pitch): void {
  console.log(`${pitch.id} | ${pitch.status} | ${pitch.provisionalTitle}`);
}

async function pitchCommand(context: CliContext): Promise<CommandResult> {
  const pitches = await loadPitches();
  if (context.command === "pitch:list") {
    pitches.forEach(printPitch);
    if (!pitches.length) console.log("Nenhuma pauta criada; amostra permanece sem ação humana.");
    return { itemsRead: pitches.length };
  }
  const id = context.positional[0];
  if (context.command === "pitch:create") {
    const decision = (await loadDecisions()).find(({ id: decisionId }) => decisionId === id);
    if (!decision) throw new Error("Decisão não encontrada.");
    const [clusters, packages, translations] = await Promise.all([
      loadClusters(),
      loadEvidencePackages(),
      loadTranslations(),
    ]);
    const cluster = clusters.find(({ id: clusterId }) => clusterId === decision.clusterId);
    const evidence = packages.find(({ clusterId }) => clusterId === decision.clusterId);
    if (!cluster || !evidence) throw new Error("Cluster ou evidência ausente.");
    const pitch = createPitch(
      decision,
      cluster,
      evidence,
      translations,
      context.option("actor") ?? "",
      new Date().toISOString(),
    );
    if (pitches.some(({ id: pitchId }) => pitchId === pitch.id))
      throw new Error("Pauta já existe.");
    if (context.apply) await savePitches([...pitches, pitch]);
    else console.log(JSON.stringify(pitch, null, 2));
    return { pitchesCreated: 1 };
  }
  const index = pitches.findIndex((pitch) => pitch.id === id);
  if (index < 0) throw new Error("Pauta não encontrada.");
  if (context.command === "pitch:show") {
    console.log(JSON.stringify(pitches[index], null, 2));
    return { itemsRead: 1 };
  }
  pitches[index] = updatePitch(
    pitches[index],
    context.option("actor") ?? "",
    context.option("reason") ?? "",
    new Date().toISOString(),
    context.option("status") as Pitch["status"] | undefined,
  );
  if (context.apply) await savePitches(pitches);
  else console.log("Dry-run: pauta não alterada.");
  return { itemsRead: 1 };
}

export async function runOrchestratorCommand(context: CliContext): Promise<CommandResult> {
  return context.command.startsWith("pitch:") ? pitchCommand(context) : decisionsCommand(context);
}
