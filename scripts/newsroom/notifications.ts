import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export interface NotificationSummary {
  runId: string;
  status: string;
  reviewsPending: number;
  highRisks: number;
  reportId?: string;
}

export interface NotificationProvider {
  id: "console" | "file" | "disabled";
  enabled: boolean;
  notify(summary: NotificationSummary): Promise<boolean>;
}

export class ConsoleNotificationProvider implements NotificationProvider {
  readonly id = "console" as const;
  readonly enabled = true;
  async notify(summary: NotificationSummary): Promise<boolean> {
    console.log(`[newsroom] ${JSON.stringify(summary)}`);
    return true;
  }
}

export class FileNotificationProvider implements NotificationProvider {
  readonly id = "file" as const;
  readonly enabled = true;
  constructor(private readonly path = resolve("newsroom/notifications/events.jsonl")) {}
  async notify(summary: NotificationSummary): Promise<boolean> {
    await mkdir(dirname(this.path), { recursive: true });
    await appendFile(this.path, `${JSON.stringify(summary)}\n`, "utf8");
    return true;
  }
}

export class DisabledNotificationProvider implements NotificationProvider {
  readonly id = "disabled" as const;
  readonly enabled = false;
  async notify(_summary: NotificationSummary): Promise<boolean> {
    return false;
  }
}
