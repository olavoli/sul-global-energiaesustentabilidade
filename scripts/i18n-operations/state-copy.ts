import { readdir, lstat, readFile, mkdir, cp } from "node:fs/promises";
import { join, basename } from "node:path";
import { createHash } from "node:crypto";
type Copy = (source: string, target: string) => Promise<void>;
const digest = async (path: string) =>
  createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
/** Copy immutable bytes, explicitly replacing stale checkpoints; never accept a silent no-op. */
export async function copyStateChecked(
  source: string,
  target: string,
  copy: Copy = async (a, b) => {
    await cp(a, b, {
      recursive: true,
      force: true,
      filter: async (src) => {
        if ((await lstat(src)).isSymbolicLink()) throw Error("state-persistence-failed");
        return basename(src) !== "lock" && !basename(src).endsWith(".pending");
      },
    });
  },
) {
  await mkdir(target, { recursive: true });
  for (const name of await readdir(source)) {
    if (name === "lock" || name.endsWith(".pending")) continue;
    const a = join(source, name),
      b = join(target, name),
      stat = await lstat(a);
    if (stat.isSymbolicLink()) throw Error("state-persistence-failed");
    if (stat.isDirectory()) await copyStateChecked(a, b, copy);
    else if (stat.isFile()) {
      await copy(a, b);
      if ((await digest(a)) !== (await digest(b))) throw Error("state-persistence-failed");
    } else throw Error("state-persistence-failed");
  }
}
