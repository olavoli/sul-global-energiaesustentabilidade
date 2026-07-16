import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { editorialPolicySchema, type EditorialPolicy } from "./orchestrator-schema";

export const DEFAULT_POLICY_PATH = resolve("newsroom/policies/editorial-policy.json");

export async function loadEditorialPolicy(path = DEFAULT_POLICY_PATH): Promise<EditorialPolicy> {
  const input: unknown = JSON.parse(await readFile(path, "utf8"));
  return editorialPolicySchema.parse(input);
}
