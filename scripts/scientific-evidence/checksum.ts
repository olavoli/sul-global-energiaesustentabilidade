import { createHash } from "node:crypto";
import { stableStringify } from "../scientific-memory/identity";
import type { EvidenceDossier, EvidenceSource, EvidenceClaim, EvidenceItem } from "./contracts";
export const evidenceChecksum = (state: {
  dossiers: EvidenceDossier[];
  sources: EvidenceSource[];
  claims: EvidenceClaim[];
  evidence: EvidenceItem[];
}) => createHash("sha256").update(stableStringify(state)).digest("hex").toUpperCase();
