import { readFile, writeFile, mkdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { hash } from "../i18n-simulation/pipeline";
import { editorialPlan } from "./editorial-policy-plan";
const entrySchema = z.object({
  path: z.string().regex(/^content\/translations\/(en|es)\/[a-z0-9-]+\.mdx$/),
  before: z.string(),
  after: z.string(),
});
const journalSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{64}$/),
  entries: z.array(entrySchema),
  state: z.enum(["prepared", "applied", "rolled-back"]),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
});
async function transaction<T>(root: string, fn: () => Promise<T>) {
  const directory = join(root, ".i18n-private-state/editorial");
  await mkdir(directory, { recursive: true });
  const lock = join(directory, "lock");
  await mkdir(lock); // A competing process or unreconciled crash fails closed.
  try {
    return await fn();
  } finally {
    await rm(lock, { recursive: true });
  }
}
function verifyJournal(j: z.infer<typeof journalSchema>) {
  if (j.contentHash !== hash(JSON.stringify({ id: j.id, entries: j.entries })))
    throw Error("editorial-journal-integrity");
  return j;
}
async function save(path: string, value: z.infer<typeof journalSchema>) {
  verifyJournal(value);
  await writeFile(path + ".pending", JSON.stringify(value), { mode: 0o600 });
  await rename(path + ".pending", path);
}
/** Local materialization only; explicit batch hash, recoverable backups and no external operation. */
export async function installPolicyPlan(
  root: string,
  plan: Awaited<ReturnType<typeof editorialPlan>>,
  confirmation: string,
) {
  if (confirmation !== plan.id || !plan.results.some((r) => r.state === "READY"))
    throw Error("editorial-plan-not-authorized");
  return transaction(root, async () => {
    const file = join(root, ".i18n-private-state/editorial", plan.id + ".json");
    let previous: z.infer<typeof journalSchema> | undefined;
    try {
      previous = verifyJournal(journalSchema.parse(JSON.parse(await readFile(file, "utf8"))));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
    if (previous) {
      if (previous.state !== "applied") throw Error("editorial-install-recovery-required");
      for (const e of previous.entries)
        if ((await readFile(join(root, e.path), "utf8")) !== e.after)
          throw Error("editorial-install-conflict");
      return "ALREADY_APPLIED";
    }
    const current = await editorialPlan(
      root,
      plan.results.map((r) => r.slug),
      new Date(plan.generatedAt),
    );
    if (current.id !== plan.id || JSON.stringify(current.results) !== JSON.stringify(plan.results))
      throw Error("editorial-plan-stale");
    const journalData = {
      id: plan.id,
      state: "prepared",
      entries: plan.results.flatMap((r) =>
        r.editions.map((e) => ({
          path: `content/translations/${e.locale}/${r.slug}.mdx`,
          before: e.before,
          after: e.candidate,
        })),
      ),
    };
    const journal = journalSchema.parse({
      ...journalData,
      contentHash: hash(JSON.stringify({ id: journalData.id, entries: journalData.entries })),
    });
    // Durable rollback copy before any content replacement.
    await save(file, journal);
    try {
      for (const e of journal.entries) {
        if (hash(await readFile(join(root, e.path), "utf8")) !== hash(e.before))
          throw Error("editorial-install-conflict");
        await writeFile(join(root, e.path) + ".auto-pending", e.after, { flag: "wx" });
      }
      for (const e of journal.entries)
        await rename(join(root, e.path) + ".auto-pending", join(root, e.path));
      journal.state = "applied";
      await save(file, journal);
      return "APPLIED_LOCALLY_AWAIT_CI";
    } catch (e) {
      throw new Error("editorial-install-recovery-required", { cause: e });
    }
  });
}
/** Roll back only exact members of this plan, refusing unrelated later edits. */
export async function rollbackPolicyPlan(root: string, id: string) {
  if (!/^[a-f0-9]{64}$/.test(id)) throw Error("editorial-invalid-plan-id");
  return transaction(root, async () => {
    const file = join(root, ".i18n-private-state/editorial", id + ".json");
    const journal = verifyJournal(journalSchema.parse(JSON.parse(await readFile(file, "utf8"))));
    if (journal.id !== id || journal.state === "rolled-back")
      throw Error("editorial-rollback-invalid");
    for (const e of journal.entries) {
      const current = await readFile(join(root, e.path), "utf8");
      if (current !== e.before && current !== e.after) throw Error("editorial-rollback-conflict");
    }
    for (const e of journal.entries) {
      await writeFile(join(root, e.path), e.before);
      try {
        const pending = join(root, e.path) + ".auto-pending";
        if ((await readFile(pending, "utf8")) !== e.after)
          throw Error("editorial-rollback-conflict");
        await rm(pending);
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      }
    }
    journal.state = "rolled-back";
    await save(file, journal);
    return "ROLLED_BACK_LOCALLY_REGENERATE_INDEX";
  });
}
