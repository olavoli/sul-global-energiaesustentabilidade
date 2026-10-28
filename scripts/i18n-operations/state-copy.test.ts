import { test, expect } from "bun:test";
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { copyStateChecked } from "./state-copy";
async function temporary(fn: (source: string, target: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), "sg-state-copy-")),
    source = join(root, "source"),
    target = join(root, "target");
  try {
    await mkdir(source);
    await mkdir(target);
    await fn(source, target);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
test("existing ledger/head and nested artifacts must be overwritten byte-for-byte", () =>
  temporary(async (a, b) => {
    for (const name of ["ledger.json", "head"]) {
      await writeFile(join(a, name), "new-synthetic-snapshot");
      await writeFile(join(b, name), "stale-synthetic-snapshot");
    }
    await mkdir(join(a, "review"));
    await mkdir(join(b, "review"));
    await writeFile(join(a, "review/en.mdx"), "new synthetic draft");
    await writeFile(join(b, "review/en.mdx"), "stale draft");
    await writeFile(join(a, "lock"), "private lock");
    await writeFile(join(a, "ledger.pending"), "partial");
    await copyStateChecked(a, b);
    for (const name of ["ledger.json", "head", "review/en.mdx"])
      expect(await readFile(join(b, name))).toEqual(await readFile(join(a, name)));
    await expect(readFile(join(b, "lock"))).rejects.toThrow();
    await expect(readFile(join(b, "ledger.pending"))).rejects.toThrow();
  }));
test("a silent copy no-op is rejected before any checkpoint can be acknowledged", () =>
  temporary(async (a, b) => {
    await writeFile(join(a, "ledger.json"), "new");
    await writeFile(join(b, "ledger.json"), "old");
    await expect(copyStateChecked(a, b, async () => {})).rejects.toThrow(
      "state-persistence-failed",
    );
  }));
test("symlink state is rejected and no unrelated target history is deleted", () =>
  temporary(async (a, b) => {
    await writeFile(join(b, "retained-history.json"), "original");
    await symlink(join(b, "retained-history.json"), join(a, "link"));
    await expect(copyStateChecked(a, b)).rejects.toThrow("state-persistence-failed");
    expect(await readFile(join(b, "retained-history.json"), "utf8")).toBe("original");
  }));
