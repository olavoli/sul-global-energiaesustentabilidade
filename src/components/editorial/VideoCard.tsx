import { Play } from "lucide-react";

export interface VideoCardProps {
  url: string;
  title: string;
  source?: string;
  thumbnail?: string;
}

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);

function validateVideoUrl(value: string) {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error("VideoCard: url inválida.");
  }

  if (parsed.protocol !== "https:" || !YOUTUBE_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new Error("VideoCard: use uma URL HTTPS do YouTube.");
  }
}

/** Link editorial para vídeo complementar, sem iframe ou carregamento implícito do YouTube. */
export function VideoCard({ url, title, source, thumbnail }: VideoCardProps) {
  validateVideoUrl(url);

  if (!title.trim()) {
    throw new Error("VideoCard: title é obrigatório.");
  }

  return (
    <figure
      className="my-8 overflow-hidden rounded-xl border border-border bg-card shadow-sm"
      data-editorial-auxiliary="true"
      data-tts-exclude="true"
    >
      <a
        className="group relative block aspect-video w-full overflow-hidden bg-muted no-underline"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Abrir vídeo no YouTube: ${title}`}
      >
        {thumbnail ? (
          <img
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.01]"
            src={thumbnail}
            alt=""
            loading="lazy"
          />
        ) : (
          <span
            className="absolute inset-0 bg-gradient-to-br from-muted to-secondary"
            aria-hidden="true"
          />
        )}
        <span
          className="absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-background/90 text-primary shadow-md transition-transform duration-200 group-hover:scale-105 group-focus-visible:scale-105 sm:size-16"
          aria-hidden="true"
        >
          <Play className="ml-1 size-6 fill-current sm:size-7" />
        </span>
      </a>

      <figcaption className="space-y-1.5 p-4 sm:p-5">
        <a
          className="font-serif text-lg font-semibold leading-snug text-foreground underline-offset-4 hover:underline"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {title}
        </a>
        {source ? <p className="text-sm text-muted-foreground">Fonte/Canal: {source}</p> : null}
        <p className="break-all text-xs text-muted-foreground">
          Vídeo:{" "}
          <a href={url} target="_blank" rel="noopener noreferrer">
            {url}
          </a>
        </p>
      </figcaption>
    </figure>
  );
}
