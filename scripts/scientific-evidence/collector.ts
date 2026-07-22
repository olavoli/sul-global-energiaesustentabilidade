import { createHash } from "node:crypto";
import { evidenceClaimSchema, evidenceItemSchema, evidenceSourceSchema } from "./contracts";
import { evidenceId } from "./ids";
type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue =>
  value && typeof value === "object" ? (value as RecordValue) : {};
const strings = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
const cleanJats = (value: string) =>
  value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const claimType = (statement: string) => {
  const value = statement.toLocaleLowerCase("en");
  if (/\bpromise|poised|with continuing|realistic/.test(value)) return "hypothesis" as const;
  if (/\bcompared|in contrast|among/.test(value)) return "comparison" as const;
  if (/\bchallenge|limited|degradation|barrier/.test(value)) return "limitation" as const;
  if (/\bexplores|examined/.test(value)) return "objective" as const;
  return "result" as const;
};
export function extractCrossrefAbstract(payload: unknown, at: string) {
  const message = record(record(payload).message);
  const doi = typeof message.DOI === "string" ? message.DOI.toLowerCase() : "";
  if (doi !== "10.1002/advs.202510481") throw new Error("DOI externo não autorizado.");
  const licenses = Array.isArray(message.license) ? message.license.map(record) : [];
  if (
    !licenses.some(({ URL }) => /creativecommons\.org\/licenses\/by\/4\.0/.test(String(URL ?? "")))
  )
    throw new Error("Licença CC BY 4.0 não confirmada.");
  const abstract = typeof message.abstract === "string" ? cleanJats(message.abstract) : "";
  if (!abstract) throw new Error("Abstract oficial ausente.");
  const title = strings(message.title)[0] ?? doi;
  const authors = (Array.isArray(message.author) ? message.author : [])
    .map((entry) => {
      const author = record(entry);
      return `${String(author.given ?? "")} ${String(author.family ?? "")}`.trim();
    })
    .filter(Boolean);
  const sourceId = evidenceId("evidence-source", `${doi}:crossref-abstract`);
  const source = evidenceSourceSchema.parse({
    sourceId,
    type: "primary-paper",
    title,
    url: `https://doi.org/${doi}`,
    doi,
    publisher: String(message.publisher ?? "Wiley"),
    authors,
    license: "CC BY 4.0",
    accessType: "open",
    retrievedAt: at,
    verifiedAt: null,
    checksum: createHash("sha256").update(abstract).digest("hex").toUpperCase(),
    provenance: [
      { source: "crossref", sourceId: doi, retrievedAt: at, method: "official-jats-abstract" },
    ],
    warnings: ["abstract-only", "full-xml-unavailable-403"],
    humanStatus: "unread",
  });
  const sentences = abstract
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence.length >= 30 && sentence.length <= 500)
    .slice(0, 5);
  const evidence = sentences.map((statement, index) =>
    evidenceItemSchema.parse({
      evidenceId: evidenceId("evidence-item", `${doi}:abstract:${index}`),
      sourceId,
      type: "excerpt",
      location: `Crossref abstract, sentence ${index + 1}`,
      shortExcerpt: statement,
      confidence: "confirmed",
      warnings: ["abstract-only"],
      humanStatus: "unread",
    }),
  );
  const claims = sentences.map((statement, index) =>
    evidenceClaimSchema.parse({
      claimId: evidenceId("evidence-claim", `${doi}:abstract:${index}`),
      exactSourceReference: `Crossref abstract, sentence ${index + 1}`,
      sourceId,
      attributedTo: authors.join(", "),
      claimType: claimType(statement),
      statement,
      evidenceLocation: `Crossref abstract, sentence ${index + 1}`,
      supportingEvidenceIds: [evidence[index].evidenceId],
      opposingEvidenceIds: [],
      uncertainty: "Claim attributed to the authors; abstract-only evidence.",
      status: "candidate",
      warnings: ["abstract-only", "human-verification-required"],
      humanStatus: "unread",
      history: [],
    }),
  );
  return {
    source,
    claims,
    evidence,
    abstractStored: false as const,
    sourceBytes: JSON.stringify(payload).length,
  };
}
export async function collectAuthorizedCrossref(fetcher: typeof fetch = fetch) {
  const response = await fetcher("https://api.crossref.org/works/10.1002%2Fadvs.202510481", {
    headers: { Accept: "application/json", "User-Agent": "SulGlobalEvidenceCheckpoint/1.0" },
  });
  if (!response.ok) throw new Error(`Crossref respondeu HTTP ${response.status}.`);
  const body = await response.text();
  if (body.length > 200_000) throw new Error("Metadados excedem 200 KB.");
  return extractCrossrefAbstract(JSON.parse(body), new Date().toISOString());
}
