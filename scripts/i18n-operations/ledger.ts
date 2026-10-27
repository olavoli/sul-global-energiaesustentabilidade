import { AsyncLocalStorage } from "node:async_hooks";
import { mkdir, readFile, open, rename, unlink } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { eventSchema, type Book, type Event } from "./ledger-types";
import { fingerprint } from "./policy";
import { replay } from "./ledger-replay";
export { replay } from "./ledger-replay";
export { held, checkBudget, checkBatchBudget } from "./ledger-budget";
export type { Book, Run, Event } from "./ledger-types";
export async function loadBook(dir: string): Promise<Book> {
  let text: string;
  try {
    text = await readFile(join(dir, "ledger.json"), "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    try {
      await readFile(join(dir, "head"));
    } catch (h) {
      if ((h as NodeJS.ErrnoException).code === "ENOENT") return replay([]);
      throw h;
    }
    throw new Error("missing-ledger");
  }
  const book = replay(z.array(eventSchema).parse(JSON.parse(text)));
  if ((await readFile(join(dir, "head"), "utf8")) !== book.digest)
    throw new Error("ledger-head-mismatch");
  return book;
}
export const durableCheckpoints = new AsyncLocalStorage<(directory: string) => Promise<void>>();
export async function append(
  dir: string,
  book: Book,
  kind: Event["kind"],
  run: string,
  data: Event["data"],
) {
  const body = {
    sequence: book.events.length + 1,
    previous: book.digest,
    at: new Date().toISOString(),
    kind,
    run,
    data,
  };
  const next = replay([...book.events, { ...body, digest: fingerprint(body) }]);
  await mkdir(dir, { recursive: true });
  const file = await open(join(dir, "ledger.pending"), "wx", 0o600);
  try {
    await file.writeFile(JSON.stringify(next.events, null, 2));
    await file.sync();
  } finally {
    await file.close();
  }
  await rename(join(dir, "ledger.pending"), join(dir, "ledger.json"));
  const head = await open(join(dir, "head.pending"), "wx", 0o600);
  try {
    await head.writeFile(next.digest);
    await head.sync();
  } finally {
    await head.close();
  }
  await rename(join(dir, "head.pending"), join(dir, "head"));
  const persist = durableCheckpoints.getStore();
  if (persist) await persist(dir);
  return next;
}
export async function locked<T>(dir: string, fn: () => Promise<T>): Promise<T> {
  await mkdir(dir, { recursive: true });
  const lock = await open(join(dir, "lock"), "wx", 0o600);
  try {
    return await fn();
  } finally {
    await lock.close();
    await unlink(join(dir, "lock"));
  }
}
