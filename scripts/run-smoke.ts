async function run(command: string[], environment: Record<string, string>): Promise<void> {
  const child = Bun.spawn(command, {
    cwd: process.cwd(),
    env: { ...process.env, ...environment },
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) throw new Error(`${command.join(" ")} encerrou com código ${exitCode}.`);
}

const previewEnvironment = {
  VITE_APP_ENV: "preview",
  VITE_PUBLIC_SITE_URL: "http://localhost:8080",
};

console.log("[smoke] Build de preview com demos explicitamente habilitadas.");
await run(["bun", "run", "build"], {
  ...previewEnvironment,
  VITE_ALLOW_DEMO_CONTENT: "true",
});
await run(["bun", "run", "scripts/smoke-worker.ts", "--expect-demo"], previewEnvironment);

console.log("[smoke] Rebuild seguro com demos bloqueadas.");
await run(["bun", "run", "build"], {
  ...previewEnvironment,
  VITE_ALLOW_DEMO_CONTENT: "false",
});
await run(["bun", "run", "scripts/smoke-worker.ts"], previewEnvironment);

export {};
