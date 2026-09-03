import type { ReactNode } from "react";

type Children = { children: ReactNode };

/** Semantic, keyboard-scrollable tables for explicit editorial content. */
export function EditorialTable({ title, children }: Children & { title: string }) {
  return (
    <div
      role="region"
      aria-label={title}
      tabIndex={0}
      className="my-8 max-w-full overflow-x-auto rounded-md border border-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
    >
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm leading-relaxed">
        <caption className="p-4 text-left font-semibold text-foreground">{title}</caption>
        {children}
      </table>
    </div>
  );
}
export const TableHead = ({ children }: Children) => <thead className="bg-muted">{children}</thead>;
export const TableBody = ({ children }: Children) => <tbody>{children}</tbody>;
export const TableRow = ({ children }: Children) => (
  <tr className="border-b border-border">{children}</tr>
);
export const TableHeader = ({ children }: Children) => (
  <th scope="col" className="p-4 align-top">
    {children}
  </th>
);
export const TableCell = ({ children }: Children) => <td className="p-4 align-top">{children}</td>;
export const Emphasis = ({ children }: Children) => <em>{children}</em>;
export const Strong = ({ children }: Children) => <strong>{children}</strong>;
export const Superscript = ({ children }: Children) => <sup>{children}</sup>;
export const Subscript = ({ children }: Children) => <sub>{children}</sub>;
export const Underline = ({ children }: Children) => <u>{children}</u>;
