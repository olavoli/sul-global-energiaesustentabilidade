import { mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { hash, type Outcome } from "./pipeline";
const keySchema = z.string().regex(/^[a-f0-9]{64}$/);
const entrySchema = z.object({ checksum: z.string(), payload: z.unknown() });
/** Caller supplies an isolated output directory; keys cannot contain paths. No editorial writes. */
export class SimulationStore {
  constructor(readonly directory: string) {}
  private file(key: string, suffix: string) {
    return join(this.directory, keySchema.parse(key) + suffix);
  }
  async cached<T>(
    key: string,
    validate: (value: unknown) => T,
    generate: () => Promise<T>,
  ): Promise<{ value: T; hit: boolean }> {
    await mkdir(this.directory, { recursive: true });
    const lock = this.file(key, ".lock");
    let handle;
    try {
      handle = await open(lock, "wx");
    } catch {
      throw new Error("Cache busy; review required");
    }
    try {
      const file = this.file(key, ".json");
      let raw: string;
      try {
        raw = await readFile(file, "utf8");
      } catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
        const value = validate(await generate());
        const payload = JSON.stringify(value);
        await writeFile(
          this.file(key, ".tmp"),
          JSON.stringify({ checksum: hash(payload), payload: value }),
          { flag: "wx" },
        );
        await rename(this.file(key, ".tmp"), file);
        return { value, hit: false };
      }
      const entry = entrySchema.parse(JSON.parse(raw));
      if (entry.checksum !== hash(JSON.stringify(entry.payload)))
        throw new Error("Cache integrity failure");
      return { value: validate(entry.payload), hit: true };
    } finally {
      await handle.close();
      await unlink(lock);
    }
  }
  async previous(key: string): Promise<Outcome | undefined> {
    try {
      return z
        .enum(["PASS", "REVIEW_REQUIRED", "BLOCK"])
        .parse(JSON.parse(await readFile(this.file(key, ".decision.json"), "utf8")));
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined;
      throw error;
    }
  }
  async record(key: string, outcome: Outcome) {
    await mkdir(this.directory, { recursive: true });
    const previous = await this.previous(key);
    const worst =
      previous === "BLOCK" || outcome === "BLOCK"
        ? "BLOCK"
        : previous === "REVIEW_REQUIRED" || outcome === "REVIEW_REQUIRED"
          ? "REVIEW_REQUIRED"
          : outcome;
    // No automatic override/reset API. The CLI is serial; concurrent decision writers are unsupported.
    await writeFile(this.file(key, ".decision.json"), JSON.stringify(worst));
  }
}
