import type { ReactNode } from "react";
import { EditorialImage } from "@/components/media/EditorialImage";
import { imageAiProvenanceSchema } from "@/content/schema";
import { ImageAiCredit } from "./ImageAiCredit";

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
  source720,
  source1200,
  sourceFull,
  caption,
  credit,
  sourceUrl,
  license,
  aiProvenanceStatus,
  aiGenerationTool,
  aiEditingTool,
  aiCreditYear,
}: {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  source720?: string;
  source1200?: string;
  sourceFull?: string;
  caption?: string;
  credit?: string;
  sourceUrl?: string;
  license?: string;
  aiProvenanceStatus?: "verified" | "partially-verified" | "unverified";
  aiGenerationTool?: string;
  aiEditingTool?: string;
  aiCreditYear?: number | string;
}) {
  const normalizedWidth = typeof width === "string" ? Number(width) : width;
  const normalizedHeight = typeof height === "string" ? Number(height) : height;
  const responsiveSources = [
    source720 ? { src: source720, width: 720 } : undefined,
    source1200 ? { src: source1200, width: 1200 } : undefined,
    sourceFull && normalizedWidth ? { src: sourceFull, width: normalizedWidth } : undefined,
  ].filter((source): source is { src: string; width: number } => Boolean(source));
  const aiContributions = [
    aiGenerationTool ? { role: "generation" as const, tool: aiGenerationTool } : undefined,
    aiEditingTool ? { role: "editing" as const, tool: aiEditingTool } : undefined,
  ].filter((item): item is { role: "generation" | "editing"; tool: string } => Boolean(item));
  const aiProvenance = aiProvenanceStatus
    ? imageAiProvenanceSchema.parse({
        status: aiProvenanceStatus,
        contributions: aiContributions,
        year: Number(aiCreditYear),
      })
    : undefined;

  return (
    <figure className="my-8">
      <EditorialImage
        image={{
          src,
          alt,
          width: normalizedWidth,
          height: normalizedHeight,
          sources: responsiveSources.length ? responsiveSources : undefined,
          caption,
          credit,
          sourceUrl,
          license,
          decorative: false,
        }}
        aspectRatio={
          normalizedWidth && normalizedHeight ? normalizedWidth / normalizedHeight : 16 / 9
        }
        sizes="(min-width: 768px) 72ch, 100vw"
        className="object-contain"
      />
      {(caption || credit || license || aiProvenance?.status === "verified") && (
        <figcaption className="mt-2 text-xs text-muted-foreground">
          {caption}
          {caption && (credit || license || aiProvenance?.status === "verified") ? " — " : ""}
          <ImageAiCredit provenance={aiProvenance} />
          {aiProvenance?.status === "verified" && credit ? " · " : ""}
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
