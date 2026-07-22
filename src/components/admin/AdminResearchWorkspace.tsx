import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ResearchWorkspace } from "../../../scripts/research-workspace/contracts";
import type {
  ScientificDossier,
  ScientificWork,
} from "../../../scripts/scientific-radar/contracts";
import type { AdminSessionView } from "./admin-api";
import { AdminJson } from "./AdminJson";
import { ResearchChecklist } from "./ResearchChecklist";
import { ResearchNotes } from "./ResearchNotes";

const tabs = [
  "overview",
  "evidence",
  "graph",
  "concepts",
  "memory",
  "trends",
  "notes",
  "checklist",
  "history",
] as const;
const labels = {
  overview: "Visão geral",
  evidence: "Evidências",
  graph: "Grafo",
  concepts: "Conceitos",
  memory: "Memória",
  trends: "Tendências",
  notes: "Notas",
  checklist: "Checklist",
  history: "Histórico",
};

export function AdminResearchWorkspace({
  workspace,
  session,
  reload,
}: {
  workspace: ResearchWorkspace;
  session: AdminSessionView;
  reload: () => void;
}) {
  const work = workspace.work as ScientificWork;
  const dossier = workspace.dossier as ScientificDossier | undefined;
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const conceptTerms = workspace.concepts.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const record = entry as Record<string, unknown>;
      return [record.label, ...(Array.isArray(record.aliases) ? record.aliases : [])];
    });
    const haystack = [
      work.doi,
      work.title,
      ...work.authors,
      ...work.institutions,
      work.journal,
      work.publicationDate.slice(0, 4),
      ...work.categories,
      ...conceptTerms,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .every((term) => haystack.includes(term));
  }, [query, work, workspace.concepts]);
  return (
    <div className="space-y-5">
      <div className="rounded-lg border bg-background p-4">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por DOI, título, autor, instituição, conceito, categoria, periódico ou ano"
        />
        <p className="mt-2 text-sm text-muted-foreground">
          {matches ? `1 resultado local: ${work.title}` : "Nenhum resultado neste Workspace."}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {Object.entries(workspace.modules).map(([name, state]) => (
          <div key={name} className="rounded border bg-background p-3 text-sm">
            <strong>{name}</strong>
            <span className="block text-muted-foreground">
              {state.available ? `${state.count} registros` : "indisponível"}
            </span>
          </div>
        ))}
      </div>
      <Tabs defaultValue="overview">
        <TabsList className="h-auto flex-wrap justify-start">
          {tabs.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {labels[tab]}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview">
          <AdminJson
            value={{
              work,
              dossier,
              identities: workspace.identities,
              restrictions: workspace.restrictions,
            }}
          />
        </TabsContent>
        <TabsContent value="evidence">
          <AdminJson value={workspace.evidence ?? { state: "unavailable" }} />
        </TabsContent>
        <TabsContent value="graph">
          <AdminJson value={workspace.graph ?? { state: "unavailable" }} />
        </TabsContent>
        <TabsContent value="concepts">
          <AdminJson
            value={
              workspace.concepts.length ? workspace.concepts : { state: "partial", concepts: [] }
            }
          />
        </TabsContent>
        <TabsContent value="memory">
          <AdminJson value={workspace.memory} />
        </TabsContent>
        <TabsContent value="trends">
          <AdminJson value={workspace.trends} />
        </TabsContent>
        <TabsContent value="notes">
          <ResearchNotes
            workId={workspace.workId}
            dossierId={dossier?.id}
            notes={workspace.notes}
            session={session}
            reload={reload}
          />
        </TabsContent>
        <TabsContent value="checklist">
          <ResearchChecklist checklist={workspace.checklist} session={session} reload={reload} />
        </TabsContent>
        <TabsContent value="history">
          <AdminJson
            value={{
              workHistory: work.history,
              dossierHistory: dossier?.history,
              noteVersions: workspace.notes.map(({ noteId, version, updatedAt }) => ({
                noteId,
                version,
                updatedAt,
              })),
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
