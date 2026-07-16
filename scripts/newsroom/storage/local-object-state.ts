import { readFile, readdir, stat } from "node:fs/promises";
import { extname, resolve } from "node:path";

import type { Page, PrivateObject } from "./contracts";
import { sha256 } from "./sha256";

function safeKey(key: string): void {
  if (!/^[a-z0-9][a-z0-9/_.-]*$/i.test(key) || key.includes(".."))
    throw new Error("Chave de objeto inválida.");
}

function contentType(path: string): string {
  if (extname(path) === ".md") return "text/markdown; charset=utf-8";
  return "application/json; charset=utf-8";
}

export class LocalObjectState {
  constructor(
    private readonly root: string,
    private readonly atomicWrite: (path: string, body: string) => Promise<void>,
  ) {}

  private path(key: string): string {
    safeKey(key);
    return resolve(this.root, "storage", `objects/${key}.json`);
  }

  async put(object: PrivateObject): Promise<void> {
    await this.atomicWrite(this.path(object.key), `${JSON.stringify(object, null, 2)}\n`);
  }

  async get(key: string): Promise<PrivateObject | undefined> {
    try {
      const object = JSON.parse(await readFile(this.path(key), "utf8")) as PrivateObject;
      if ((await sha256(object.body)) !== object.hash) throw new Error("Checksum inválido.");
      return object;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    if (!key.startsWith("reports/") && !key.startsWith("briefings/")) return undefined;
    safeKey(key);
    const path = resolve(this.root, key);
    try {
      const body = await readFile(path, "utf8");
      const metadata = await stat(path);
      return {
        key,
        body,
        contentType: contentType(path),
        hash: await sha256(body),
        size: new TextEncoder().encode(body).byteLength,
        createdAt: metadata.mtime.toISOString(),
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
  }

  async list(prefix: string, limit: number, cursor = ""): Promise<Page<PrivateObject>> {
    const objectRoot = resolve(this.root, "storage", "objects");
    const stored = (await readdir(objectRoot, { recursive: true }).catch(() => []))
      .filter((value) => value.endsWith(".json"))
      .map((value) => value.replaceAll("\\", "/").replace(/\.json$/, ""));
    const legacyRoots = ["reports", "briefings"];
    const legacy = (
      await Promise.all(
        legacyRoots.map(async (directory) =>
          (await readdir(resolve(this.root, directory), { recursive: true }).catch(() => []))
            .filter((value) => /\.(?:json|md)$/i.test(value))
            .map((value) => `${directory}/${value.replaceAll("\\", "/")}`),
        ),
      )
    ).flat();
    const keys = [...new Set([...stored, ...legacy])]
      .filter((key) => key.startsWith(prefix) && key > cursor)
      .sort()
      .slice(0, limit);
    const items = (await Promise.all(keys.map((key) => this.get(key)))).filter(
      (value): value is PrivateObject => Boolean(value),
    );
    return { items, cursor: keys.length === limit ? keys.at(-1) : undefined };
  }
}
