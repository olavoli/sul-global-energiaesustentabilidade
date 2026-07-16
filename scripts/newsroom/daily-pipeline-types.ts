import type { DailyNewsroomReport, NewsroomRun, RunMode } from "./automation-schema";
import type { NotificationProvider } from "./notifications";

export interface DailyPipelineOptions {
  mode: RunMode;
  apply?: boolean;
  actor: string;
  environment?: string;
  runType?: NewsroomRun["runType"];
  recoveryOfRunId?: string;
  overrideLock?: boolean;
  now?: Date;
  env?: Record<string, string | undefined>;
  notificationProvider?: NotificationProvider;
}

export interface DailyPipelineResult {
  run: NewsroomRun;
  report: DailyNewsroomReport;
  persisted: boolean;
}
