import type { AuditEntry } from "./schema";

export interface CliContext {
  command: string;
  args: string[];
  positional: string[];
  apply: boolean;
  actor: string;
  has(name: string): boolean;
  option(name: string): string | undefined;
}

export type CommandResult = Partial<
  Pick<
    AuditEntry,
    | "source"
    | "itemsFetched"
    | "itemsAccepted"
    | "itemsRejected"
    | "duplicates"
    | "errors"
    | "itemsRead"
    | "clustersCreated"
    | "clustersChanged"
    | "translationsQueued"
    | "translationsApproved"
    | "decisionsEvaluated"
    | "humanActions"
    | "pitchesCreated"
  >
>;

export function createCliContext(values = process.argv.slice(2)): CliContext {
  const command = values[0] ?? "";
  const args = values.slice(1);
  const option = (name: string): string | undefined => {
    const inline = args.find((value) => value.startsWith(`--${name}=`));
    if (inline) return inline.slice(name.length + 3);
    const index = args.indexOf(`--${name}`);
    const next = args[index + 1];
    return index >= 0 && next && !next.startsWith("--") ? next : undefined;
  };
  const consumed = new Set<number>();
  args.forEach((value, index) => {
    if (!value.startsWith("--")) return;
    consumed.add(index);
    if (!value.includes("=") && args[index + 1] && !args[index + 1].startsWith("--")) {
      consumed.add(index + 1);
    }
  });
  return {
    command,
    args,
    positional: args.filter((_, index) => !consumed.has(index)),
    apply: args.includes("--apply"),
    actor: option("actor") ?? "local-operator",
    has: (name) =>
      args.includes(`--${name}`) || args.some((value) => value.startsWith(`--${name}=`)),
    option,
  };
}
