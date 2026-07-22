import { createHash } from "node:crypto";
export const evidenceId = (
  prefix: "evidence-dossier" | "evidence-source" | "evidence-claim" | "evidence-item",
  value: string,
) => `${prefix}-${createHash("sha256").update(value).digest("hex").slice(0, 16)}`;
