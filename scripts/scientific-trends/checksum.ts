import { createHash } from "node:crypto";
import { stableStringify } from "../scientific-memory/identity";
import type { TrendSignal } from "./contracts";

export const trendChecksum = (signals: TrendSignal[]) =>
  createHash("sha256")
    .update(stableStringify([...signals].sort((a, b) => a.id.localeCompare(b.id))))
    .digest("hex")
    .toUpperCase();
