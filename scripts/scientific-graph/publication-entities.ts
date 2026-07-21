import type { GraphNode, GraphProvenance, GraphRelation } from "./contracts";
import { crossrefProvenance, graphNode, graphRelation, nested, oaProvenance } from "./factory";
import { normalizeExternalId } from "./ids";
import { records, stringValue, type SourceRecord } from "./sources";

export async function addPublicationEntities(input: {
  root: SourceRecord;
  crossref: SourceRecord;
  rootNode: GraphNode;
  rootEvidence: GraphProvenance[];
  doi: string;
  now: string;
  putNode: (node: GraphNode) => GraphNode;
  putRelation: (relation: GraphRelation) => void;
}) {
  const primary = nested(input.root.primary_location);
  const journal = nested(primary.source);
  if (stringValue(journal.display_name)) {
    const journalNode = input.putNode(
      await graphNode(
        "journal",
        stringValue(journal.id) ?? stringValue(journal.display_name)!,
        stringValue(journal.display_name)!,
        {
          ...(stringValue(journal.id)
            ? { openalex: normalizeExternalId(stringValue(journal.id)!) }
            : {}),
        },
        [oaProvenance(input.root, input.now, "fonte primária")],
        input.now,
      ),
    );
    input.putRelation(
      await graphRelation(
        input.rootNode.id,
        journalNode.id,
        "published-in",
        input.rootEvidence,
        input.now,
      ),
    );
  }
  const publisherName = stringValue(input.crossref.publisher);
  if (publisherName) {
    const publisher = input.putNode(
      await graphNode(
        "publisher",
        publisherName.toLocaleLowerCase("en"),
        publisherName,
        {},
        [crossrefProvenance(input.doi, input.now)],
        input.now,
      ),
    );
    input.putRelation(
      await graphRelation(
        input.rootNode.id,
        publisher.id,
        "published-by",
        [crossrefProvenance(input.doi, input.now)],
        input.now,
      ),
    );
  }
  for (const funder of records(input.crossref.funder)) {
    const name = stringValue(funder.name);
    if (!name) continue;
    const funderNode = input.putNode(
      await graphNode(
        "funder",
        stringValue(funder.DOI) ?? name.toLocaleLowerCase("en"),
        name,
        stringValue(funder.DOI) ? { doi: stringValue(funder.DOI)! } : {},
        [crossrefProvenance(input.doi, input.now)],
        input.now,
      ),
    );
    input.putRelation(
      await graphRelation(
        input.rootNode.id,
        funderNode.id,
        "funded-by",
        [crossrefProvenance(input.doi, input.now)],
        input.now,
      ),
    );
  }
}
