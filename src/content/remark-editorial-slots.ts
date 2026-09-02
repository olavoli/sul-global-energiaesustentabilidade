interface EditorialNode {
  type: string;
  name?: string;
  depth?: number;
  value?: string;
  children?: EditorialNode[];
  attributes?: { type: string; name: string; value: string }[];
}

function nodeText(node: EditorialNode): string {
  return node.value ?? node.children?.map(nodeText).join("") ?? "";
}

/** Build-time layout only: never writes MDX or generates editorial text. */
export function remarkEditorialSlots() {
  return (tree: { children: EditorialNode[] }) => {
    const metadata: EditorialNode[] = [];
    const body: EditorialNode[] = [];
    const keyPoints: EditorialNode[] = [];
    const references: EditorialNode[] = [];
    let section: "body" | "navigation" | "references" = "body";
    let sectionDepth = 2;

    for (const node of tree.children) {
      if (node.type === "yaml" || node.type === "mdxjsEsm") {
        metadata.push(node);
        continue;
      }
      if (node.type === "heading") {
        const title = nodeText(node).trim().toLocaleLowerCase("pt-BR");
        if (section !== "body" && (node.depth ?? 6) <= sectionDepth) section = "body";
        if (title === "continue aprendendo") {
          section = "navigation";
          sectionDepth = node.depth ?? 2;
        } else if (title === "referências" || title === "fontes e referências") {
          section = "references";
          sectionDepth = node.depth ?? 2;
        }
      }
      // Historical navigation is replaced by the shared related cards, not duplicated.
      if (section === "navigation") continue;
      if (section === "references") {
        references.push(node);
        continue;
      }
      if (node.type === "mdxJsxFlowElement" && node.name === "KeyPoints") {
        const previous = body.at(-1);
        // Move the existing summary heading with its explicit takeaways (no orphan heading).
        if (previous?.type === "heading" && nodeText(previous).trim() === "Em resumo") {
          keyPoints.push(body.pop()!);
        }
        keyPoints.push(node);
      } else {
        body.push(node);
      }
    }

    const slot = (name: string, children: EditorialNode[]): EditorialNode => ({
      type: "mdxJsxFlowElement",
      name: "EditorialSlot",
      attributes: [{ type: "mdxJsxAttribute", name: "section", value: name }],
      children,
    });
    tree.children = [
      ...metadata,
      slot("keyPoints", keyPoints),
      slot("body", body),
      slot("references", references),
    ];
  };
}
