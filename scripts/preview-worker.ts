import { spawn } from "node:child_process";

const MINIMUM_NODE_MAJOR = 20;

function run(
  command: string,
  args: string[],
  options: { capture?: boolean } = {},
): Promise<{ code: number; output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: process.env,
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
      windowsHide: true,
    });
    let output = "";
    if (options.capture) {
      child.stdout?.on("data", (chunk: Buffer) => {
        output += chunk.toString();
      });
      child.stderr?.on("data", (chunk: Buffer) => {
        output += chunk.toString();
      });
    }
    child.once("error", reject);
    child.once("exit", (code) => resolve({ code: code ?? 1, output: output.trim() }));
  });
}

async function main(): Promise<void> {
  const nodeBinary = process.env.NODE_BINARY?.trim() || "node";
  let version: { code: number; output: string };
  try {
    version = await run(nodeBinary, ["--version"], { capture: true });
  } catch {
    throw new Error(
      "Node.js não foi encontrado. Instale Node >=20 ou defina NODE_BINARY com o executável.",
    );
  }
  const major = Number(/^v?(\d+)/.exec(version.output)?.[1]);
  if (version.code !== 0 || !Number.isInteger(major) || major < MINIMUM_NODE_MAJOR) {
    throw new Error(`Preview exige Node >=${MINIMUM_NODE_MAJOR}; detectado: ${version.output}.`);
  }
  const result = await run(nodeBinary, [
    "node_modules/wrangler/bin/wrangler.js",
    "dev",
    "--config",
    ".output/server/wrangler.json",
  ]);
  process.exitCode = result.code;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(`[preview] ${error instanceof Error ? error.message : "Falha ao iniciar."}`);
    process.exitCode = 1;
  });
}
