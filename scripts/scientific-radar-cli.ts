import { createStorageAdapter, setStorageAdapter } from "./newsroom/storage/runtime";
import { discoverScientificWorks } from "./scientific-radar/pipeline";

function option(name: string): string | undefined {
  const args = process.argv.slice(2);
  const inline = args.find((value) => value.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  if (!apply) {
    throw new Error("Descoberta exige --apply; nenhum dado foi consultado ou persistido.");
  }
  if (process.env.NEWSROOM_ENVIRONMENT === "production") {
    throw new Error("Radar Científico bloqueado em produção.");
  }
  const apiKey = process.env.OPENALEX_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENALEX_API_KEY é obrigatória.");
  const fromDate =
    option("from") ?? new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  setStorageAdapter(
    createStorageAdapter({
      NEWSROOM_STORAGE_DRIVER: option("storage") ?? process.env.NEWSROOM_STORAGE_DRIVER,
      NEWSROOM_ENVIRONMENT: process.env.NEWSROOM_ENVIRONMENT ?? "development",
    }),
  );
  const report = await discoverScientificWorks({
    apiKey,
    fromDate,
    perPage: Number(option("limit") ?? 25),
    crossrefMailto: process.env.SCIENTIFIC_RADAR_CONTACT_EMAIL,
  });
  console.log(
    JSON.stringify(
      {
        fetched: report.fetched,
        doiCandidates: report.doiCandidates,
        crossrefValidated: report.crossrefValidated,
        duplicates: report.duplicates,
        persisted: report.persisted,
        rejected: report.rejected,
        private: true,
        generatedContent: false,
      },
      null,
      2,
    ),
  );
}

try {
  await main();
} catch (error) {
  console.error(`[erro] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
