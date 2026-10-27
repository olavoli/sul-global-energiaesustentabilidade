import type { Transport } from "../i18n-real-pilot/adapters";
import { readFile, mkdir, cp, readdir, lstat } from "node:fs/promises";
import { join, resolve, basename } from "node:path";
import { spawnSync } from "node:child_process";
import { loadBook } from "./ledger";
/** Private Git repository is a durable CAS store, never a disposable Actions cache. */
export class PrivateGitState {
  constructor(
    readonly checkout: string,
    readonly repository: string,
  ) {}
  private originMatches() {
    const origin = this.git(["remote", "get-url", "origin"]);
    let repo = "";
    try {
      const url = new URL(origin);
      if (url.hostname === "github.com")
        repo = url.pathname.replace(/^\//, "").replace(/\.git$/, "");
    } catch {
      repo = /^git@github.com:(.+?)(?:\.git)?$/.exec(origin)?.[1] ?? "";
    }
    if (repo !== this.repository) throw Error("automatic-private-state-unverified");
  }
  private git(args: string[]) {
    const r = spawnSync("git", args, {
      cwd: this.checkout,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (r.status !== 0) throw Error("state-persistence-failed");
    return r.stdout.trim();
  }
  async restore(root: string, anchor: string) {
    this.originMatches();
    const store = join(this.checkout, "operations"),
      book = await loadBook(store);
    if (!book.events.length || !book.events.some((e) => e.digest === anchor))
      throw Error("automatic-history-anchor-mismatch");
    try {
      await lstat(join(root, "i18n/storage"));
      throw Error("automatic-local-state-exists");
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
    await mkdir(join(root, "i18n"), { recursive: true });
    await cp(store, join(root, "i18n/storage"), {
      recursive: true,
      filter: async (src) => {
        if ((await lstat(src)).isSymbolicLink()) throw Error("state-persistence-failed");
        return basename(src) !== "lock" && !basename(src).endsWith(".pending");
      },
    });
  }
  async persist(directory: string) {
    try {
      this.originMatches();
      await loadBook(directory);
      const target = join(this.checkout, "operations");
      await mkdir(target, { recursive: true });
      for (const name of await readdir(directory)) {
        if (name === "lock" || name.endsWith(".pending")) continue;
        await cp(join(directory, name), join(target, name), {
          recursive: true,
          filter: async (src) => {
            if ((await lstat(src)).isSymbolicLink()) throw Error("state-persistence-failed");
            return basename(src) !== "lock" && !basename(src).endsWith(".pending");
          },
        });
      }
      this.git(["add", "--", "operations"]);
      const changed = spawnSync("git", ["diff", "--cached", "--quiet"], { cwd: this.checkout });
      if (changed.status === 0) return;
      if (changed.status !== 1) throw Error("state-persistence-failed");
      this.git([
        "-c",
        "user.name=Sul Global Translation Automation",
        "-c",
        "user.email=translation-automation@users.noreply.github.com",
        "commit",
        "-m",
        "chore(i18n-state): persist checkpoint",
      ]);
      this.git(["push", "origin", "HEAD:main"]);
      const head = this.git(["rev-parse", "HEAD"]),
        remote = this.git(["ls-remote", "origin", "refs/heads/main"]).split(/\s/)[0];
      if (head !== remote) throw Error("state-persistence-failed");
    } catch {
      throw Error("state-persistence-failed");
    }
  }
}
export async function verifyPrivateRepository(
  repository: string,
  token: string,
  transport: Transport = fetch,
) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !token)
    throw Error("automatic-private-state-required");
  const response = await transport(`https://api.github.com/repos/${repository}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    redirect: "error",
  });
  if (!response.ok) throw Error("automatic-private-state-unverified");
  const value: unknown = await response.json();
  if (!value || typeof value !== "object" || !("private" in value) || value.private !== true)
    throw Error("automatic-private-state-unverified");
}
export async function verifyCloudflare(
  account: string,
  token: string,
  transport: Transport = fetch,
) {
  if (!/^[a-f0-9]{32}$/i.test(account) || !token || /[\r\n]/.test(token))
    throw Error("invalid-credentials");
  const response = await transport("https://api.cloudflare.com/client/v4/user/tokens/verify", {
    headers: { Authorization: `Bearer ${token}` },
    redirect: "error",
  });
  const value: unknown = await response.json();
  if (
    !response.ok ||
    !value ||
    typeof value !== "object" ||
    !("success" in value) ||
    value.success !== true ||
    !("result" in value) ||
    !value.result ||
    typeof value.result !== "object" ||
    !("status" in value.result) ||
    value.result.status !== "active"
  )
    throw Error("automatic-credentials-unverified");
}

export async function verifyModelAccess(
  account: string,
  token: string,
  transport: Transport = fetch,
) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${account}/ai/models/schema?model=${encodeURIComponent("@cf/meta/llama-3.3-70b-instruct-fp8-fast")}`;
  const response = await transport(url, {
    headers: { Authorization: `Bearer ${token}` },
    redirect: "error",
  });
  const value: unknown = await response.json();
  if (
    !response.ok ||
    !value ||
    typeof value !== "object" ||
    !("success" in value) ||
    value.success !== true ||
    !("result" in value) ||
    !value.result ||
    typeof value.result !== "object" ||
    !("input" in value.result) ||
    !("output" in value.result)
  )
    throw Error("automatic-model-unverified");
}
