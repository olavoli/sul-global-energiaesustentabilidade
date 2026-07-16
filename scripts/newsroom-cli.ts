import { createAudit, printAudit } from "./newsroom/audit";
import { createCliContext } from "./newsroom/cli-types";
import { runCommand } from "./newsroom/commands";
import { appendAudit, withMutationLock } from "./newsroom/queue";
import { createStorageAdapter, setStorageAdapter } from "./newsroom/storage/runtime";

const context = createCliContext();
setStorageAdapter(
  createStorageAdapter({
    NEWSROOM_STORAGE_DRIVER: context.option("storage") ?? process.env.NEWSROOM_STORAGE_DRIVER,
    NEWSROOM_ENVIRONMENT: process.env.NEWSROOM_ENVIRONMENT ?? "development",
  }),
);
const started = Date.now();

async function execute(): Promise<void> {
  const result = await runCommand(context);
  const entry = createAudit(context.command, context.actor, !context.apply, started, result);
  if (context.apply) await appendAudit(entry);
  printAudit(entry);
  if (entry.errors.length) process.exitCode = 1;
}

try {
  if (context.apply) await withMutationLock(execute);
  else await execute();
} catch (error) {
  console.error(`[erro] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
