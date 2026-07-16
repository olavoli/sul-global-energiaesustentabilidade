import type { ReactNode } from "react";
import { EditorialImage } from "@/components/media/EditorialImage";

/** Highlight an editorial context or caveat inside an article. */
export function Callout({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <aside className="my-8 border-l-4 border-primary bg-muted/40 px-5 py-4">
      {title && <p className="mb-2 font-semibold text-foreground">{title}</p>}
      <div className="text-foreground">{children}</div>
    </aside>
  );
}

/** Render a quotation with an optional attribution. */
export function Quote({ cite, children }: { cite?: string; children: ReactNode }) {
  return (
    <figure className="my-8 border-y border-border py-5">
      <blockquote className="font-serif text-xl text-foreground">{children}</blockquote>
      {cite && <figcaption className="mt-3 text-sm text-muted-foreground">— {cite}</figcaption>}
    </figure>
  );
}

/** Render a responsive editorial image with caption and credit. */
export function Figure({
  src,
  alt,
  width,
  height,
  caption,
  credit,
  sourceUrl,
  license,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  caption?: string;
  credit?: string;
  sourceUrl?: string;
  license?: string;
}) {
  return (
    <figure className="my-8">
      <EditorialImage
        image={{ src, alt, width, height, caption, credit, sourceUrl, license, decorative: false }}
        aspectRatio={16 / 9}
        sizes="(min-width: 768px) 72ch, 100vw"
      />
      {(caption || credit || license) && (
        <figcaption className="mt-2 text-xs text-muted-foreground">
          {caption}
          {caption && (credit || license) ? " — " : ""}
          {sourceUrl && credit ? (
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
              {credit}
            </a>
          ) : (
            credit
          )}
          {credit && license ? ` · ${license}` : !credit ? license : ""}
        </figcaption>
      )}
    </figure>
  );
}

/** Group the most important takeaways of an article. */
export function KeyPoints({ children }: { children: ReactNode }) {
  return (
    <section
      className="my-8 rounded-md border border-border bg-muted/30 p-5"
      aria-label="Pontos-chave"
    >
      <p className="overline mb-3 text-primary">Pontos-chave</p>
      {children}
    </section>
  );
}
