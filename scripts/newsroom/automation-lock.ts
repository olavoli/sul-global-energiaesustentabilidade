import { lockSchema, type GlobalLock } from "./automation-schema";
import { storageAdapter } from "./storage/runtime";

export const DAILY_LOCK_PATH = "daily-newsroom";

export function isOrphanLock(lock: GlobalLock, now = new Date()): boolean {
  return new Date(lock.expiresAt).valueOf() <= now.valueOf();
}

export async function readGlobalLock(path = DAILY_LOCK_PATH): Promise<GlobalLock | undefined> {
  const lock = await storageAdapter().getLock(path);
  return lock ? lockSchema.parse({ ...lock, pid: 0 }) : undefined;
}

export interface LockHandle {
  lock: GlobalLock;
  orphanOverridden: boolean;
  fencingToken: number;
  heartbeat(now?: Date): Promise<void>;
  release(): Promise<void>;
}

export async function acquireGlobalLock(
  input: { owner: string; runId: string; ttlMs: number; overrideOrphan?: boolean; now?: Date },
  path = DAILY_LOCK_PATH,
): Promise<LockHandle> {
  const now = input.now ?? new Date();
  const acquired = await storageAdapter().acquireLock({
    key: path,
    owner: input.owner,
    runId: input.runId,
    acquiredAt: now.toISOString(),
    heartbeatAt: now.toISOString(),
    expiresAt: new Date(now.valueOf() + input.ttlMs).toISOString(),
  });
  let lock = lockSchema.parse({ ...acquired, pid: process.pid });
  return {
    get lock() {
      return lock;
    },
    orphanOverridden: acquired.fencingToken > 1 && Boolean(input.overrideOrphan),
    fencingToken: acquired.fencingToken,
    async heartbeat(at = new Date()) {
      const renewed = await storageAdapter().renewLock(
        path,
        input.owner,
        new Date(at.valueOf() + input.ttlMs).toISOString(),
      );
      lock = lockSchema.parse({ ...renewed, pid: process.pid });
    },
    async release() {
      await storageAdapter().releaseLock(path, input.owner);
    },
  };
}
