import { z } from "zod";

export const adminSections = [
  "dashboard",
  "inbox",
  "decisions",
  "clusters",
  "translations",
  "sources",
  "quarantine",
  "runs",
  "reports",
  "pitches",
  "scientific-radar",
  "scientific-memory",
  "scientific-trends",
  "scientific-concepts",
  "scientific-graph",
  "entity-resolution",
  "config",
] as const;

export const adminSectionSchema = z.enum(adminSections);
export type AdminSection = z.infer<typeof adminSectionSchema>;

export const loginSchema = z.object({
  secret: z.string().min(1).max(500),
  actor: z.string().trim().min(2).max(80),
});

export const adminActionSchema = z.object({
  action: z.string().min(1).max(80),
  id: z.string().min(1).max(120).optional(),
  actor: z.string().trim().min(2).max(80),
  note: z.string().trim().max(1_000).default(""),
  expectedVersion: z.number().int().nonnegative().optional(),
  requestId: z.string().max(100).optional(),
  values: z.record(z.string(), z.union([z.string(), z.array(z.string())])).default({}),
});

export type AdminAction = z.infer<typeof adminActionSchema>;

export function validOperationalId(value: string): boolean {
  return /^(?:(?:inbox|decision|cluster|translation|run|pitch|evidence|claim|radar|graph|sgr|duplicate|trend)-[a-f0-9]{16}|concept-relation-[a-f0-9]{16})$/.test(
    value,
  );
}

export function validAdminResourceId(section: AdminSection, value: string): boolean {
  if (section === "sources") return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
  return validOperationalId(value);
}
