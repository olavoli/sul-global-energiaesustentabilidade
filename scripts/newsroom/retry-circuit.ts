import { resolve } from "node:path";

import { loadDocument, saveDocument } from "./atomic-store";
import { circuitDocumentSchema, circuitSchema, type CircuitState } from "./automation-schema";
import { FeedTransportError } from "./transport";

const CIRCUITS_PATH = resolve("newsroom/circuits.json");
const TRANSIENT_HTTP = new Set([429, 502, 503, 504]);
const SECURITY_CODES = new Set([
  "too-large",
  "invalid-content-type",
  "suspicious-redirect",
  "redirect-limit",
]);

export function isTransientFailure(error: unknown): boolean {
  if (!(error instanceof FeedTransportError)) return false;
  if (error.code === "network") return true;
  return error.code === "http-error" && TRANSIENT_HTTP.has(error.metadata.httpStatus ?? 0);
}

export function retryAfterMs(error: unknown): number | undefined {
  if (!(error instanceof Error)) return undefined;
  const match = error.message.match(/retry-after[=: ]+(\d+)/i);
  return match ? Number(match[1]) * 1_000 : undefined;
}

export function deterministicBackoffMs(attempt: number, seed = 0): number {
  const jitter = ((seed * 31 + attempt * 17) % 101) - 50;
  return Math.max(0, 250 * 2 ** attempt + jitter);
}

export async function withLimitedRetries<T>(
  operation: (attempt: number) => Promise<T>,
  options: {
    retries: number;
    seed?: number;
    sleep?: (milliseconds: number) => Promise<void>;
    onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
  },
): Promise<{ value: T; retries: number }> {
  const sleep = options.sleep ?? ((milliseconds) => Bun.sleep(milliseconds));
  let lastError: unknown;
  for (let attempt = 0; attempt <= options.retries; attempt += 1) {
    try {
      return { value: await operation(attempt), retries: attempt };
    } catch (error) {
      lastError = error;
      if (attempt >= options.retries || !isTransientFailure(error)) throw error;
      const delay = retryAfterMs(error) ?? deterministicBackoffMs(attempt, options.seed);
      options.onRetry?.(attempt + 1, delay, error);
      await sleep(delay);
    }
  }
  throw lastError;
}

export function emptyCircuit(sourceId: string): CircuitState {
  return circuitSchema.parse({
    sourceId,
    state: "closed",
    consecutiveFailures: 0,
    securityViolation: false,
    halfOpenAttempts: 0,
    history: [],
  });
}

export function circuitAllowsAttempt(circuit: CircuitState, now = new Date()): boolean {
  if (circuit.state === "closed") return true;
  if (circuit.state === "open")
    return Boolean(circuit.retryAt && new Date(circuit.retryAt).valueOf() <= now.valueOf());
  return circuit.halfOpenAttempts < 1;
}

export function recordCircuitSuccess(
  circuit: CircuitState,
  actor: string,
  now = new Date(),
): CircuitState {
  return circuitSchema.parse({
    ...circuit,
    state: "closed",
    consecutiveFailures: 0,
    securityViolation: false,
    halfOpenAttempts: 0,
    openedAt: undefined,
    retryAt: undefined,
    lastFailure: undefined,
    history: [
      ...circuit.history,
      { action: "circuit-closed", at: now.toISOString(), actor, notes: "Coleta bem-sucedida." },
    ],
  });
}

export function recordCircuitFailure(
  circuit: CircuitState,
  error: unknown,
  input: { actor: string; threshold: number; openDurationMs: number; now?: Date },
): CircuitState {
  const now = input.now ?? new Date();
  const failures = circuit.consecutiveFailures + 1;
  const security = error instanceof FeedTransportError && SECURITY_CODES.has(error.code);
  const shouldOpen = security || failures >= input.threshold || circuit.state === "half-open";
  return circuitSchema.parse({
    ...circuit,
    state: shouldOpen ? "open" : circuit.state,
    consecutiveFailures: failures,
    securityViolation: circuit.securityViolation || security,
    halfOpenAttempts: circuit.state === "half-open" ? circuit.halfOpenAttempts + 1 : 0,
    openedAt: shouldOpen ? now.toISOString() : circuit.openedAt,
    retryAt: shouldOpen
      ? new Date(now.valueOf() + input.openDurationMs).toISOString()
      : circuit.retryAt,
    lastFailure: error instanceof Error ? error.message : String(error),
    history: [
      ...circuit.history,
      {
        action: shouldOpen ? "circuit-opened" : "failure-recorded",
        at: now.toISOString(),
        actor: input.actor,
        notes: security ? "ViolaÃ§Ã£o de seguranÃ§a." : "Falha de coleta.",
      },
    ],
  });
}

export async function loadCircuits(): Promise<CircuitState[]> {
  return (await loadDocument(CIRCUITS_PATH, circuitDocumentSchema, { version: 1, circuits: [] }))
    .circuits;
}

export async function saveCircuits(circuits: CircuitState[]): Promise<void> {
  await saveDocument(CIRCUITS_PATH, circuitDocumentSchema, { version: 1, circuits });
}
