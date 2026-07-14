import { useState, type CSSProperties } from "react";

import type { EditorialImage as EditorialImageContract } from "@/types/content";
import { cn } from "@/lib/utils";
import { imageFallbackText } from "@/lib/media";

/** Render the stable, non-interactive state used after an image request fails. */
export function EditorialImageFallback({ image }: { image: EditorialImageContract }) {
  return (
    <div
      role={image.decorative ? undefined : "img"}
      aria-label={image.decorative ? undefined : imageFallbackText(image.alt)}
      aria-hidden={image.decorative || undefined}
      className="flex h-full min-h-32 w-full items-center justify-center border border-border bg-muted p-4 text-center text-sm text-muted-foreground"
    >
      {!image.decorative && imageFallbackText(image.alt)}
    </div>
  );
}

function imageSrcSet(image: EditorialImageContract): string | undefined {
  if (!image.sources?.length) return undefined;
  return [...image.sources]
    .sort((left, right) => left.width - right.width)
    .map((source) => `${source.src} ${source.width}w`)
    .join(", ");
}

/** Render editorial media with stable geometry and an accessible error fallback. */
export function EditorialImage({
  image,
  priority = false,
  sizes = "100vw",
  aspectRatio,
  className,
  containerClassName,
}: {
  image: EditorialImageContract;
  priority?: boolean;
  sizes?: string;
  aspectRatio?: number;
  className?: string;
  containerClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const ratio = image.width && image.height ? image.width / image.height : aspectRatio;
  const position = image.focalPoint ? `${image.focalPoint.x}% ${image.focalPoint.y}%` : "50% 50%";
  const style: CSSProperties | undefined = ratio ? { aspectRatio: String(ratio) } : undefined;

  return (
    <div
      className={cn("relative w-full overflow-hidden bg-muted", containerClassName)}
      style={style}
    >
      {failed ? (
        <EditorialImageFallback image={image} />
      ) : (
        <img
          src={image.src}
          srcSet={imageSrcSet(image)}
          sizes={sizes}
          alt={image.decorative ? "" : image.alt}
          width={image.width}
          height={image.height}
          loading={priority ? "eager" : (image.loading ?? "lazy")}
          fetchPriority={priority ? "high" : (image.fetchPriority ?? "auto")}
          decoding="async"
          referrerPolicy="strict-origin-when-cross-origin"
          onError={() => setFailed(true)}
          style={{ objectPosition: position }}
          className={cn("h-full w-full object-cover", className)}
        />
      )}
    </div>
  );
}
