import { migrateLocalScientificRadar } from "./scientific-radar/migration";

try {
  const report = await migrateLocalScientificRadar({ apply: process.argv.includes("--apply") });
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  console.error(`[erro] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
