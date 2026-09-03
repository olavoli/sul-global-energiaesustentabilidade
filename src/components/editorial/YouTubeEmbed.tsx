export interface YouTubeEmbedProps {
  videoId: string;
  title: string;
  caption?: string;
  source?: string;
}

const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** Privacy-enhanced YouTube player for optional, complementary editorial material. */
export function YouTubeEmbed({ videoId, title, caption, source }: YouTubeEmbedProps) {
  if (!YOUTUBE_VIDEO_ID.test(videoId)) {
    throw new Error("YouTubeEmbed: videoId inválido.");
  }
  if (!title.trim()) {
    throw new Error("YouTubeEmbed: title é obrigatório.");
  }

  return (
    <figure className="my-8" data-editorial-auxiliary="true" data-tts-exclude="true">
      <p className="overline mb-3 text-primary">Vídeo complementar</p>
      <div className="aspect-video w-full overflow-hidden rounded-md border border-border bg-muted shadow-sm">
        <iframe
          className="h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${videoId}`}
          title={title}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      {(caption || source) && (
        <figcaption className="mt-2 text-xs text-muted-foreground">
          {caption}
          {caption && source ? " · " : ""}
          {source ? `Vídeo: ${source}` : ""}
        </figcaption>
      )}
    </figure>
  );
}
