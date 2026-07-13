import { Fragment, type ReactNode } from "react";

/**
 * Minimal markdown-lite renderer for demo content.
 * Supports: ## / ### headings, > blockquote, - lists, blank-line paragraphs.
 */
export function ArticleBody({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/);
  const rendered: ReactNode[] = [];
  let listBuffer: string[] = [];

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return;
    rendered.push(
      <ul key={`ul-${key}`}>
        {listBuffer.map((li, i) => (
          <li key={i}>{li}</li>
        ))}
      </ul>,
    );
    listBuffer = [];
  };

  blocks.forEach((raw, i) => {
    const block = raw.trim();
    if (!block) return;

    if (block.startsWith("### ")) {
      flushList(String(i));
      rendered.push(<h3 key={i}>{block.slice(4)}</h3>);
    } else if (block.startsWith("## ")) {
      flushList(String(i));
      rendered.push(<h2 key={i}>{block.slice(3)}</h2>);
    } else if (block.startsWith("> ")) {
      flushList(String(i));
      rendered.push(<blockquote key={i}>{block.slice(2)}</blockquote>);
    } else if (block.startsWith("- ")) {
      block.split("\n").forEach((line) => {
        if (line.startsWith("- ")) listBuffer.push(line.slice(2));
      });
      flushList(String(i));
    } else {
      flushList(String(i));
      rendered.push(<p key={i}>{block}</p>);
    }
  });
  flushList("tail");

  return (
    <div className="prose-editorial text-foreground">
      {rendered.map((el, i) => (
        <Fragment key={i}>{el}</Fragment>
      ))}
    </div>
  );
}
