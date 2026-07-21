export interface GraphSourceOptions {
  fetcher?: typeof fetch;
  timeoutMs?: number;
  maxRetries?: number;
}
export interface SourceBudget {
  requests: number;
  retries: number;
}

export type SourceRecord = Record<string, unknown>;

function object(value: unknown): SourceRecord {
  return value && typeof value === "object" ? (value as SourceRecord) : {};
}
export function records(value: unknown): SourceRecord[] {
  return Array.isArray(value) ? value.map(object) : [];
}
export function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
export function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
export function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

async function officialJson(
  url: URL,
  source: string,
  budget: SourceBudget,
  options: GraphSourceOptions,
): Promise<unknown> {
  const fetcher = options.fetcher ?? fetch;
  const attempts = Math.max(0, Math.min(options.maxRetries ?? 1, 1)) + 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    budget.requests += 1;
    const response = await fetcher(url, {
      headers: {
        accept: "application/json",
        "user-agent": "SulGlobalScientificGraph/1.0 (private supervised metadata)",
      },
      signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
    });
    if (response.ok) return response.json();
    if (![429, 502, 503, 504].includes(response.status) || attempt + 1 >= attempts)
      throw new Error(`${source} respondeu ${response.status}.`);
    budget.retries += 1;
  }
  throw new Error(`${source} não respondeu.`);
}

export async function openAlexWork(
  id: string,
  budget: SourceBudget,
  options: GraphSourceOptions = {},
) {
  return object(
    await officialJson(
      new URL(
        `https://api.openalex.org/works/${encodeURIComponent(id.replace(/^https?:\/\/openalex\.org\//i, ""))}`,
      ),
      "OpenAlex",
      budget,
      options,
    ),
  );
}

export async function openAlexWorks(
  ids: string[],
  budget: SourceBudget,
  options: GraphSourceOptions = {},
) {
  if (!ids.length) return [];
  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set(
    "filter",
    `openalex_id:${ids.map((id) => id.replace(/^https?:\/\/openalex\.org\//i, "")).join("|")}`,
  );
  url.searchParams.set("per-page", String(Math.min(ids.length, 50)));
  return records(object(await officialJson(url, "OpenAlex", budget, options)).results);
}

export async function citingWorks(
  id: string,
  limit: number,
  budget: SourceBudget,
  options: GraphSourceOptions = {},
) {
  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("filter", `cites:${id.replace(/^https?:\/\/openalex\.org\//i, "")}`);
  url.searchParams.set("per-page", String(Math.min(limit, 20)));
  return records(object(await officialJson(url, "OpenAlex", budget, options)).results);
}

export async function crossrefWork(
  doi: string,
  budget: SourceBudget,
  options: GraphSourceOptions = {},
) {
  return object(
    object(
      await officialJson(
        new URL(`https://api.crossref.org/works/${encodeURIComponent(doi)}`),
        "Crossref",
        budget,
        options,
      ),
    ).message,
  );
}
