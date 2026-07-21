import type { ScientificDossier, ScientificWork } from "../scientific-radar/contracts";
import { normalizeDoi } from "../scientific-radar/sources";
import {
  graphRelationSchema,
  scientificGraphSchema,
  type GraphBuildReport,
  type GraphNode,
  type GraphRelation,
} from "./contracts";
import { stableGraphId, normalizeExternalId, normalizeOrcid, normalizeRor } from "./ids";
import {
  arrayStrings,
  crossrefProvenance,
  graphNode as node,
  graphRelation as relation,
  nested,
  oaProvenance,
  workIdentity,
} from "./factory";
import { addPublicationEntities } from "./publication-entities";
import {
  booleanValue,
  citingWorks,
  crossrefWork,
  numberValue,
  openAlexWork,
  openAlexWorks,
  records,
  stringValue,
  type GraphSourceOptions,
  type SourceBudget,
  type SourceRecord,
} from "./sources";

export interface BuildGraphOptions extends GraphSourceOptions {
  now?: Date;
  references?: number;
  citing?: number;
  related?: number;
}
const limits = {
  references: 20,
  citing: 20,
  related: 10,
  authors: 20,
  institutions: 20,
  topics: 20,
  nodes: 100,
  relations: 150,
} as const;
export async function buildScientificGraph(
  work: ScientificWork,
  dossier: ScientificDossier,
  options: BuildGraphOptions = {},
): Promise<GraphBuildReport> {
  if (dossier.scientificWorkId !== work.id || dossier.generatedContent)
    throw new Error("Dossiê científico incompatível.");
  if (
    work.retracted ||
    work.warnings.some(({ severity, resolved }) => severity === "blocker" && !resolved)
  )
    throw new Error("Trabalho principal bloqueado.");
  const now = (options.now ?? new Date()).toISOString();
  const budget: SourceBudget = { requests: 0, retries: 0 };
  const [root, crossref] = await Promise.all([
    openAlexWork(work.openAlexId, budget, options),
    crossrefWork(work.doi, budget, options),
  ]);
  if (normalizeDoi(stringValue(crossref.DOI) ?? "") !== work.doi)
    throw new Error("DOI não confirmado pelo Crossref.");
  const references = arrayStrings(root.referenced_works).slice(
    0,
    options.references ?? limits.references,
  );
  const related = arrayStrings(root.related_works).slice(0, options.related ?? limits.related);
  const [referenceRecords, citingRecords, relatedRecords] = await Promise.all([
    openAlexWorks(references, budget, options),
    citingWorks(work.openAlexId, options.citing ?? limits.citing, budget, options),
    openAlexWorks(related, budget, options),
  ]);
  const nodes = new Map<string, GraphNode>();
  const relations = new Map<string, GraphRelation>();
  let duplicates = 0;
  const incompleteRelations = 0;
  const putNode = (value: GraphNode) => {
    const key = `${value.type}:${value.externalIds.doi ?? value.externalIds.orcid ?? value.externalIds.ror ?? value.externalIds.openalex ?? value.label.toLocaleLowerCase("en")}`;
    if (nodes.has(key)) duplicates += 1;
    else if (nodes.size < limits.nodes) nodes.set(key, value);
    return nodes.get(key) ?? value;
  };
  const putRelation = (value: GraphRelation) => {
    const key = `${value.from}:${value.to}:${value.type}`;
    const prior = relations.get(key);
    if (prior) {
      duplicates += 1;
      relations.set(
        key,
        graphRelationSchema.parse({
          ...prior,
          source: [...new Set([...prior.source, ...value.source])],
          sourceEvidence: [
            ...prior.sourceEvidence,
            ...value.sourceEvidence.filter(
              (entry) => !prior.sourceEvidence.some(({ endpoint }) => endpoint === entry.endpoint),
            ),
          ],
        }),
      );
    } else if (relations.size < limits.relations) relations.set(key, value);
  };
  const rootEvidence = [
    oaProvenance(root, now, "OpenAlex ID", "confirmed"),
    crossrefProvenance(work.doi, now),
  ];
  const rootNode = putNode(
    await node(
      "scientific-work",
      work.doi,
      work.title,
      { doi: work.doi, openalex: normalizeExternalId(work.openAlexId) },
      rootEvidence,
      now,
      {
        publicationDate: work.publicationDate,
        openAccess: work.openAccess,
        retracted: false,
        corrected: work.corrected,
      },
    ),
  );
  const addWorkSet = async (items: SourceRecord[], type: "cites" | "cited-by" | "related-to") => {
    for (const record of items) {
      const identity = workIdentity(record);
      const warnings = identity.doi ? [] : ["trabalho-sem-doi"];
      const target = putNode(
        await node(
          "scientific-work",
          identity.key,
          identity.title,
          {
            ...(identity.doi ? { doi: identity.doi } : {}),
            ...(identity.openAlex ? { openalex: identity.openAlex } : {}),
          },
          [oaProvenance(record, now, identity.doi ? "DOI/OpenAlex" : "OpenAlex ID")],
          now,
          {
            publicationYear: numberValue(record.publication_year) ?? null,
            openAccess: booleanValue(nested(record.open_access).is_oa) ?? false,
            retracted: booleanValue(record.is_retracted) ?? false,
          },
          booleanValue(record.is_retracted) ? [...warnings, "trabalho-retratado"] : warnings,
        ),
      );
      const from = type === "cited-by" ? target.id : rootNode.id;
      const to = type === "cited-by" ? rootNode.id : target.id;
      putRelation(
        await relation(from, to, type, [oaProvenance(record, now, `vínculo ${type}`)], now),
      );
    }
  };
  await addWorkSet(referenceRecords, "cites");
  await addWorkSet(citingRecords, "cited-by");
  await addWorkSet(relatedRecords, "related-to");
  for (const authorship of records(root.authorships).slice(0, limits.authors)) {
    const author = nested(authorship.author);
    const openalex = normalizeExternalId(
      stringValue(author.id) ?? stringValue(author.display_name) ?? "autor",
    );
    const orcid = normalizeOrcid(stringValue(author.orcid));
    const authorNode = putNode(
      await node(
        "author",
        orcid ?? openalex,
        stringValue(author.display_name) ?? "Autor sem nome",
        { openalex, ...(orcid ? { orcid } : {}) },
        [oaProvenance(root, now, orcid ? "ORCID/OpenAlex" : "OpenAlex ID")],
        now,
        {},
        orcid ? [] : ["autor-sem-orcid"],
      ),
    );
    putRelation(await relation(rootNode.id, authorNode.id, "authored-by", rootEvidence, now));
    for (const institution of records(authorship.institutions).slice(0, limits.institutions)) {
      const instId = normalizeExternalId(
        stringValue(institution.id) ?? stringValue(institution.display_name) ?? "instituicao",
      );
      const ror = normalizeRor(stringValue(institution.ror));
      const instNode = putNode(
        await node(
          "institution",
          ror ?? instId,
          stringValue(institution.display_name) ?? "Instituição sem nome",
          { openalex: instId, ...(ror ? { ror } : {}) },
          [oaProvenance(root, now, ror ? "ROR/OpenAlex" : "OpenAlex ID")],
          now,
          {
            country: stringValue(institution.country_code) ?? null,
            institutionType: stringValue(institution.type) ?? null,
          },
          ror ? [] : ["instituição-sem-ror"],
        ),
      );
      putRelation(
        await relation(
          authorNode.id,
          instNode.id,
          "affiliated-with",
          [oaProvenance(root, now, "afiliação declarada")],
          now,
        ),
      );
    }
  }
  for (const topic of records(root.topics).slice(0, limits.topics)) {
    const topicId = normalizeExternalId(
      stringValue(topic.id) ?? stringValue(topic.display_name) ?? "tema",
    );
    const topicNode = putNode(
      await node(
        "topic",
        topicId,
        stringValue(topic.display_name) ?? "Tema sem nome",
        { openalex: topicId },
        [oaProvenance(root, now, "tópico fornecido")],
        now,
        { level: numberValue(topic.level) ?? null },
      ),
    );
    putRelation(
      await relation(
        rootNode.id,
        topicNode.id,
        "has-topic",
        [oaProvenance(root, now, "tópico fornecido")],
        now,
      ),
    );
  }
  await addPublicationEntities({
    root,
    crossref,
    rootNode,
    rootEvidence,
    doi: work.doi,
    now,
    putNode,
    putRelation,
  });
  const graph = scientificGraphSchema.parse({
    schemaVersion: 1,
    id: await stableGraphId("graph", work.id),
    scientificWorkId: work.id,
    rootNodeId: rootNode.id,
    createdAt: now,
    updatedAt: now,
    nodes: [...nodes.values()],
    relations: [...relations.values()],
    warnings: nodes.size >= limits.nodes ? ["limite-de-nos-atingido"] : [],
    budget: { ...budget, maxNodes: 100, maxRelations: 150 },
  });
  const count = (values: Array<{ type: string }>) =>
    values.reduce<Record<string, number>>(
      (result, item) => ({ ...result, [item.type]: (result[item.type] ?? 0) + 1 }),
      {},
    );
  return {
    graph,
    duplicates,
    incompleteRelations,
    nodesByType: count(graph.nodes),
    relationsByType: count(graph.relations),
    authorsWithoutOrcid: graph.nodes.filter(
      ({ type, externalIds }) => type === "author" && !externalIds.orcid,
    ).length,
    institutionsWithoutRor: graph.nodes.filter(
      ({ type, externalIds }) => type === "institution" && !externalIds.ror,
    ).length,
    worksWithoutDoi: graph.nodes.filter(
      ({ type, externalIds }) => type === "scientific-work" && !externalIds.doi,
    ).length,
    retractions: graph.nodes.filter(({ metadata }) => metadata.retracted === true).length,
    corrections: graph.nodes.filter(({ metadata }) => metadata.corrected === true).length,
    openAccessWorks: graph.nodes.filter(
      ({ type, metadata }) => type === "scientific-work" && metadata.openAccess === true,
    ).length,
    persisted: false,
  };
}
