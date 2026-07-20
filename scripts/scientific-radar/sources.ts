import { z } from "zod";

const nullableText = z.string().trim().min(1).nullable().optional();

const openAlexWorkSchema = z.looseObject({
  id: z.url(),
  doi: nullableText,
  title: z.string().trim().min(1),
  publication_date: z.iso.date(),
  type: z.string().trim().min(1),
  cited_by_count: z.number().int().nonnegative().default(0),
  referenced_works: z.array(z.url()).default([]),
  related_works: z.array(z.url()).default([]),
  abstract_inverted_index: z
    .record(z.string(), z.array(z.number().int().nonnegative()))
    .nullable()
    .optional(),
  authorships: z
    .array(
      z.looseObject({
        author: z.looseObject({ display_name: z.string().trim().min(1) }),
        institutions: z
          .array(z.looseObject({ display_name: z.string().trim().min(1) }))
          .default([]),
      }),
    )
    .default([]),
  keywords: z.array(z.looseObject({ display_name: z.string().trim().min(1) })).default([]),
  topics: z.array(z.looseObject({ display_name: z.string().trim().min(1) })).default([]),
  primary_topic: z
    .looseObject({
      display_name: z.string().trim().min(1),
      field: z
        .looseObject({ display_name: z.string().trim().min(1) })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
  primary_location: z
    .looseObject({
      source: z
        .looseObject({
          display_name: z.string().trim().min(1),
          host_organization_name: nullableText,
        })
        .nullable()
        .optional(),
      license: nullableText,
      is_oa: z.boolean().nullable().optional(),
    })
    .nullable()
    .optional(),
  best_oa_location: z
    .looseObject({
      license: nullableText,
      is_oa: z.boolean().nullable().optional(),
    })
    .nullable()
    .optional(),
  open_access: z
    .looseObject({
      is_oa: z.boolean(),
    })
    .optional(),
});

const openAlexResponseSchema = z.looseObject({
  results: z.array(openAlexWorkSchema),
});

const crossrefMessageSchema = z.looseObject({
  DOI: z.string().trim().min(1),
  title: z.array(z.string()).default([]),
  author: z
    .array(
      z.looseObject({
        given: z.string().optional(),
        family: z.string().optional(),
        affiliation: z.array(z.looseObject({ name: z.string().trim().min(1) })).default([]),
      }),
    )
    .default([]),
  abstract: nullableText,
  publisher: nullableText,
  "container-title": z.array(z.string()).default([]),
  license: z.array(z.looseObject({ URL: z.url() })).default([]),
  type: nullableText,
  subject: z.array(z.string()).default([]),
  "is-referenced-by-count": z.number().int().nonnegative().optional(),
});

const crossrefResponseSchema = z.looseObject({
  status: z.literal("ok"),
  message: crossrefMessageSchema,
});

export type OpenAlexWork = z.infer<typeof openAlexWorkSchema>;
export type CrossrefWork = z.infer<typeof crossrefMessageSchema>;

export interface ScientificSourceClientOptions {
  fetcher?: typeof fetch;
  timeoutMs?: number;
}

async function boundedJson(
  url: URL,
  source: "OpenAlex" | "Crossref",
  options: ScientificSourceClientOptions,
): Promise<unknown> {
  const request = () =>
    (options.fetcher ?? fetch)(url, {
      headers: {
        accept: "application/json",
        "user-agent": "SulGlobalScientificRadar/1.0 (private supervised discovery)",
      },
      signal: AbortSignal.timeout(options.timeoutMs ?? 10_000),
    });
  let response = await request();
  if ([429, 502, 503, 504].includes(response.status)) {
    const retryAfter = Number(response.headers.get("retry-after") ?? 0);
    const delayMs = Math.min(Math.max(retryAfter * 1_000, 100), 2_000);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    response = await request();
  }
  if (!response.ok) throw new Error(`${source} respondeu ${response.status}.`);
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > 5_000_000) throw new Error(`${source} excedeu o limite de resposta.`);
  return response.json();
}

export async function queryOpenAlex(
  input: {
    apiKey: string;
    fromDate: string;
    perPage: number;
  },
  options: ScientificSourceClientOptions = {},
): Promise<OpenAlexWork[]> {
  if (!input.apiKey.trim()) throw new Error("OPENALEX_API_KEY é obrigatória.");
  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("api_key", input.apiKey);
  url.searchParams.set("search", "energy sustainability");
  url.searchParams.set("filter", `from_publication_date:${input.fromDate},has_doi:true`);
  url.searchParams.set("sort", "publication_date:desc");
  url.searchParams.set("per-page", String(Math.min(Math.max(input.perPage, 1), 50)));
  return openAlexResponseSchema.parse(await boundedJson(url, "OpenAlex", options)).results;
}

export async function validateCrossrefDoi(
  doi: string,
  mailto: string | undefined,
  options: ScientificSourceClientOptions = {},
): Promise<CrossrefWork | undefined> {
  const url = new URL(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
  if (mailto?.trim()) url.searchParams.set("mailto", mailto.trim());
  try {
    const parsed = crossrefResponseSchema.parse(await boundedJson(url, "Crossref", options));
    return normalizeDoi(parsed.message.DOI) === normalizeDoi(doi) ? parsed.message : undefined;
  } catch {
    return undefined;
  }
}

export function normalizeDoi(value: string): string {
  return decodeURIComponent(value)
    .trim()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
    .replace(/^doi:\s*/i, "")
    .toLocaleLowerCase("en");
}

export function reconstructAbstract(
  inverted: Record<string, number[]> | null | undefined,
): string | null {
  if (!inverted) return null;
  const positions = Object.entries(inverted).flatMap(([word, indexes]) =>
    indexes.map((index) => [index, word] as const),
  );
  if (!positions.length) return null;
  return positions
    .sort(([a], [b]) => a - b)
    .map(([, word]) => word)
    .join(" ");
}
