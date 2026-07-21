export async function stableGraphId(
  prefix: "graph" | "sgn" | "sgr",
  value: string,
): Promise<string> {
  const bytes = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
  const hex = [...bytes]
    .slice(0, 8)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}-${hex}`;
}

export function normalizeExternalId(value: string): string {
  return value.trim().replace(/^https?:\/\/openalex\.org\//i, "");
}

export function normalizeOrcid(value: string | undefined): string | undefined {
  return (
    value
      ?.trim()
      .replace(/^https?:\/\/orcid\.org\//i, "")
      .toUpperCase() || undefined
  );
}

export function normalizeRor(value: string | undefined): string | undefined {
  return (
    value
      ?.trim()
      .replace(/^https?:\/\/ror\.org\//i, "")
      .toLowerCase() || undefined
  );
}
