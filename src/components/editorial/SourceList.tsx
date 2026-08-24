import type { EditorialSource } from "@/content/schema";

/** List structured and legacy references with safe external links. */
export function SourceList({
  sources = [],
  urls,
}: {
  sources?: EditorialSource[];
  urls: string[];
}) {
  if (sources.length === 0 && urls.length === 0) return null;
  const structuredUrls = new Set(sources.map((source) => source.url));
  const legacyUrls = [...new Set(urls)].filter((url) => !structuredUrls.has(url));

  return (
    <section className="mt-10 border-t border-border pt-6" aria-labelledby="article-sources">
      <h2 id="article-sources" className="font-serif text-2xl font-semibold">
        Fontes e referências
      </h2>
      <ul className="mt-4 space-y-2 text-sm">
        {sources.map((source) => (
          <li key={source.url}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline decoration-border underline-offset-4 hover:decoration-primary"
            >
              {source.title}
            </a>
            <span className="text-muted-foreground">
              {` — ${source.organizationOrAuthor}; verificada em ${source.verifiedAt}.`}
            </span>
            {source.note && <p className="mt-1 text-muted-foreground">{source.note}</p>}
          </li>
        ))}
        {legacyUrls.map((url) => (
          <li key={url}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all underline decoration-border underline-offset-4 hover:decoration-primary"
            >
              {url}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
