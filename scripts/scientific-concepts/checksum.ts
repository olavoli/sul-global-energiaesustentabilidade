import { createHash } from "node:crypto";
import { stableStringify } from "../scientific-memory/identity";
import type { Concept, ConceptRelation } from "./contracts";

export const conceptChecksum = (concepts: Concept[], relations: ConceptRelation[]) =>
  createHash("sha256")
    .update(
      stableStringify({
        concepts: [...concepts].sort((a, b) => a.id.localeCompare(b.id)),
        relations: [...relations].sort((a, b) => a.id.localeCompare(b.id)),
      }),
    )
    .digest("hex")
    .toUpperCase();
