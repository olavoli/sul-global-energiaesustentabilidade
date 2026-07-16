import { buildCoverageReport } from "./coverage";
import { acquireGlobalLock, type LockHandle } from "./automation-lock";
import { loadAutomationPolicy, resolveAutomationSwitches } from "./automation-config";
import { stageNames, type DailyNewsroomReport, type NewsroomRun } from "./automation-schema";
import { buildDailyReport, saveDailyReport } from "./daily-report";
import { runDailyCollection } from "./daily-collection";
import { runDailyProcessing } from "./daily-processing";
import { loadDailyState } from "./daily-state";
import { completedStage, modeSkips, skippedStage } from "./daily-stages";
import { loadEditorialPolicy } from "./editorial-policy";
import type { DailyPipelineOptions, DailyPipelineResult } from "./daily-pipeline-types";
import { DisabledNotificationProvider } from "./notifications";
import {
  createRun,
  finishRun,
  initializeStages,
  loadRuns,
  saveRuns,
  updateStage,
  upsertRun,
} from "./run-store";

export async function executeDailyPipeline(
  options: DailyPipelineOptions,
): Promise<DailyPipelineResult> {
  const now = options.now ?? new Date();
  const [automation, editorial] = await Promise.all([
    loadAutomationPolicy(),
    loadEditorialPolicy(),
  ]);
  const switches = resolveAutomationSwitches(options.env);
  const mutable = options.apply === true || options.mode === "apply" || options.mode === "recovery";
  let run = initializeStages(
    createRun({
      runType: options.runType,
      mode: options.mode,
      environment: options.environment ?? "local",
      actor: options.actor,
      now,
      configurationVersion: automation.version,
      policyVersion: editorial.version,
      recoveryOfRunId: options.recoveryOfRunId,
    }),
  );
  run = { ...run, dryRun: !mutable };
  let lock: LockHandle | undefined;
  let report: DailyNewsroomReport | undefined;
  const provider = options.notificationProvider ?? new DisabledNotificationProvider();
  let runs = mutable ? await loadRuns() : [];
  const persistRun = async () => {
    if (mutable) {
      runs = upsertRun(runs, run);
      await saveRuns(runs);
    }
  };
  try {
    run = { ...run, status: "running" };
    run = updateStage(
      run,
      completedStage("environment-check", now, { environment: run.environment }),
    );
    if (
      mutable &&
      (!switches.newsroom || (options.runType === "scheduled" && !switches.schedule))
    ) {
      const reason = !switches.newsroom
        ? "NEWSROOM_ENABLED=false."
        : "NEWSROOM_SCHEDULE_ENABLED=false.";
      run = updateStage(run, completedStage("configuration-check", now, {}, [reason]));
      for (const stage of stageNames.slice(2))
        run = updateStage(run, skippedStage(stage, "Kill switch global ativo.", now));
      run = finishRun(
        run,
        "skipped",
        now,
        !switches.newsroom ? "kill-switch" : "schedule-disabled",
      );
    } else {
      run = updateStage(run, completedStage("configuration-check", now, { mode: options.mode }));
      if (mutable) {
        lock = await acquireGlobalLock({
          owner: options.actor,
          runId: run.id,
          ttlMs: automation.lockTtlMs,
          overrideOrphan: options.overrideLock,
          now,
        });
        run = updateStage(
          run,
          completedStage("lock-acquisition", now, { orphanOverride: lock.orphanOverridden }),
          true,
        );
        if (lock.orphanOverridden)
          run = { ...run, warnings: [...run.warnings, "Override de lock Ã³rfÃ£o auditado."] };
        await persistRun();
      } else
        run = updateStage(
          run,
          skippedStage("lock-acquisition", "Dry-run nÃ£o adquire lock mutÃ¡vel.", now),
        );

      let state = await loadDailyState();
      run = {
        ...run,
        sourceIds: state.catalog.filter(({ active }) => active).map(({ id }) => id),
      };
      const networkAllowed =
        switches.collection &&
        !["process-existing", "report-only", "validate-only"].includes(options.mode);
      run = updateStage(
        run,
        networkAllowed
          ? completedStage("source-health", now, { sources: run.sourceIds.length })
          : skippedStage(
              "source-health",
              modeSkips(options.mode, "source-health") ?? "Coleta externa desativada.",
              now,
            ),
      );

      if (networkAllowed) {
        const collected = await runDailyCollection(state, {
          policy: automation,
          actor: options.actor,
          now,
          persist: mutable,
        });
        state = collected.state;
        run = {
          ...run,
          itemsFetched: collected.counters.fetched,
          itemsAccepted: collected.counters.accepted,
          itemsRejected: collected.counters.rejected,
          quarantined: collected.counters.quarantined,
          warnings: [...run.warnings, ...collected.counters.warnings],
          stopReason: collected.counters.stopReason,
        };
        run = updateStage(
          run,
          completedStage("collection", now, {
            fetched: run.itemsFetched,
            accepted: run.itemsAccepted,
          }),
          mutable,
        );
      } else
        run = updateStage(
          run,
          skippedStage(
            "collection",
            modeSkips(options.mode, "collection") ?? "NEWSROOM_COLLECTION_ENABLED=false.",
            now,
          ),
        );

      for (const stage of ["normalization", "deduplication", "classification", "scoring"] as const)
        run = updateStage(
          run,
          completedStage(stage, now, { items: state.queue.length }),
          mutable && networkAllowed,
        );
      const skipProcessing = modeSkips(options.mode, "clustering");
      if (skipProcessing) {
        for (const stage of [
          "clustering",
          "evidence-packages",
          "translation-queue",
          "orchestration",
        ] as const)
          run = updateStage(run, skippedStage(stage, skipProcessing, now));
      } else {
        const processed = await runDailyProcessing(state, {
          automation,
          editorial,
          actor: options.actor,
          now,
          persist: mutable,
          translationEnabled: switches.translation,
          orchestrationEnabled: switches.orchestration,
        });
        state = processed.state;
        run = {
          ...run,
          clustersCreated: processed.counters.clusters,
          translationsQueued: processed.counters.translationsQueued,
          decisionsCreated: processed.counters.decisionsCreated,
          decisionsUpdated: processed.counters.decisionsUpdated,
          humanReviewsPending: processed.counters.reviewsPending,
        };
        run = updateStage(
          run,
          completedStage("clustering", now, { clusters: state.clusters.length }),
          mutable,
        );
        run = updateStage(
          run,
          completedStage("evidence-packages", now, { packages: state.packages.length }),
          mutable,
        );
        if (switches.translation) {
          run = updateStage(
            run,
            completedStage("translation-queue", now, { queued: run.translationsQueued }),
            mutable,
          );
        } else
          run = updateStage(
            run,
            skippedStage("translation-queue", "NEWSROOM_TRANSLATION_ENABLED=false.", now),
          );
        if (switches.orchestration || !mutable) {
          run = updateStage(
            run,
            completedStage("orchestration", now, {
              decisions: state.decisions.length,
              inbox: state.inbox.length,
            }),
            mutable,
          );
        } else
          run = updateStage(
            run,
            skippedStage("orchestration", "NEWSROOM_ORCHESTRATION_ENABLED=false.", now),
          );
      }

      report = buildDailyReport({
        run,
        runtimes: state.runtimes,
        clusters: state.clusters,
        decisions: state.decisions,
        translations: state.translations,
        coverage: buildCoverageReport(state.catalog, state.queue),
        now,
      });
      if (mutable) await saveDailyReport(report);
      run = updateStage(
        run,
        completedStage("daily-report", now, { report: report.runId }),
        mutable,
      );
      if (switches.notifications && provider.enabled)
        await provider.notify({
          runId: run.id,
          status: run.status,
          reviewsPending: run.humanReviewsPending,
          highRisks: report.highRisks,
          reportId: report.runId,
        });
      run = updateStage(
        run,
        switches.notifications
          ? completedStage("notification", now, { provider: provider.id })
          : skippedStage("notification", "NotificaÃ§Ãµes desativadas.", now),
      );
      run = updateStage(run, completedStage("cleanup", now, { removed: 0 }), false);
      run = finishRun(
        run,
        run.warnings.length ? "completed-with-warnings" : "completed",
        now,
        run.stopReason,
      );
    }
  } catch (error) {
    run = finishRun(
      { ...run, errors: [...run.errors, error instanceof Error ? error.message : String(error)] },
      "failed",
      now,
      "stage-error",
    );
    throw error;
  } finally {
    if (lock) await lock.release();
    if (!run.stages.some(({ name, status }) => name === "lock-release" && status === "completed"))
      run = updateStage(
        run,
        completedStage("lock-release", now, { released: Boolean(lock) }),
        false,
      );
    if (run.status !== "skipped") await persistRun();
  }
  report ??= buildDailyReport({
    run,
    runtimes: [],
    clusters: [],
    decisions: [],
    translations: [],
    coverage: buildCoverageReport([]),
    now,
  });
  return { run, report, persisted: mutable && run.status !== "skipped" };
}
