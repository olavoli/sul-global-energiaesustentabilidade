import { environmentConfig } from "@/config/environment";

type SafeValue = string | number | boolean | null | undefined;
export type ObservabilityContext = Readonly<Record<string, SafeValue>>;

export interface MetricEvent {
  name: string;
  value: number;
  unit?: "count" | "milliseconds" | "bytes";
}

export interface ObservabilityReporter {
  reportError(error: unknown, context?: ObservabilityContext): void;
  reportWarning(message: string, context?: ObservabilityContext): void;
  reportMetric(metric: MetricEvent, context?: ObservabilityContext): void;
  reportEvent(name: string, context?: ObservabilityContext): void;
}

function safeErrorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

const consoleReporter: ObservabilityReporter = {
  reportError(error, context = {}) {
    if (environmentConfig.name === "development" || environmentConfig.name === "test") {
      console.error("[observability:error]", error, context);
      return;
    }
    console.error("[observability:error]", { error: safeErrorName(error), ...context });
  },
  reportWarning(message, context = {}) {
    console.warn("[observability:warning]", {
      warning: environmentConfig.name === "development" ? message : "OperationalWarning",
      ...context,
    });
  },
  reportMetric(metric, context = {}) {
    if (environmentConfig.name === "development" || environmentConfig.name === "test") {
      console.info("[observability:metric]", { ...metric, ...context });
    }
  },
  reportEvent(name, context = {}) {
    console.info("[observability:event]", {
      name,
      environment: environmentConfig.name,
      ...context,
    });
  },
};

let reporter: ObservabilityReporter = consoleReporter;

/** Replace the local reporter only when an approved provider is integrated. */
export function configureObservability(nextReporter: ObservabilityReporter): void {
  reporter = nextReporter;
}

export function reportError(error: unknown, context?: ObservabilityContext): void {
  reporter.reportError(error, context);
}

export function reportWarning(message: string, context?: ObservabilityContext): void {
  reporter.reportWarning(message, context);
}

export function reportMetric(metric: MetricEvent, context?: ObservabilityContext): void {
  reporter.reportMetric(metric, context);
}

export function reportEvent(name: string, context?: ObservabilityContext): void {
  reporter.reportEvent(name, context);
}
