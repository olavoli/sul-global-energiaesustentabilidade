import { useId, useRef, useState } from "react";
import { Content } from "@radix-ui/react-dialog";
import { useInfographicGestures } from "./useInfographicGestures";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const control =
  "inline-flex min-h-11 items-center justify-center rounded border border-border bg-background px-3 py-2 text-sm text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50";

/** Opt-in image enlargement with an independent, selectable text equivalent. */
export function InfographicAccessibility({
  src,
  alt,
  description,
  width,
}: {
  src: string;
  alt: string;
  description: string;
  width?: number;
}) {
  const id = useId();
  const viewport = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [baseWidth, setBaseWidth] = useState(width ?? 480);
  const gestures = useInfographicGestures(viewport, zoom, setZoom);

  return (
    <div className="mt-3 space-y-3 text-base text-foreground">
      <Dialog onOpenChange={() => setZoom(1)}>
        <DialogTrigger asChild>
          <button type="button" className={control} aria-label={`Ampliar infográfico: ${alt}`}>
            Ampliar infográfico
          </button>
        </DialogTrigger>
        <DialogPortal>
          <DialogOverlay className="z-[60] bg-background/90" />
          <Content
            aria-modal="true"
            className="fixed inset-3 z-[70] flex min-w-0 flex-col gap-3 overflow-hidden rounded-lg border border-border bg-background p-4 text-foreground shadow-lg sm:inset-6"
            onOpenAutoFocus={() => {
              setBaseWidth(Math.min(width ?? 480, viewport.current?.clientWidth ?? 480));
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <DialogTitle className="text-lg font-semibold">Infográfico ampliado</DialogTitle>
              <DialogClose asChild>
                <button type="button" className={control} aria-label="Fechar ampliação">
                  Fechar
                </button>
              </DialogClose>
            </div>
            <DialogDescription className="text-sm text-muted-foreground">
              Use os botões para ampliar e deslize a imagem para percorrê-la. O gesto de pinça
              permite ampliar com dois dedos. A descrição textual está abaixo da imagem na página.
            </DialogDescription>
            <div className="flex flex-wrap items-center gap-2" aria-label="Controles de ampliação">
              <button
                type="button"
                className={control}
                disabled={zoom <= 1}
                aria-label="Reduzir ampliação"
                onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
              >
                −
              </button>
              <output
                className="min-w-14 text-center text-sm"
                aria-live="polite"
                aria-atomic="true"
              >
                {Math.round(zoom * 100)}%
              </output>
              <button
                type="button"
                className={control}
                disabled={zoom >= 4}
                aria-label="Aumentar ampliação"
                onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
              >
                +
              </button>
              <button type="button" className={control} onClick={() => setZoom(1)}>
                Ajustar à tela
              </button>
              <a href={src} target="_blank" rel="noopener noreferrer" className={control}>
                Abrir original<span className="sr-only"> (abre em nova aba)</span>
              </a>
            </div>
            <div
              ref={viewport}
              {...gestures}
              tabIndex={0}
              role="region"
              aria-label="Imagem ampliada, área de rolagem"
              className="min-h-0 flex-1 overflow-auto overscroll-contain rounded border border-border bg-muted touch-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <img
                src={src}
                alt={alt}
                width={width}
                draggable={false}
                className="block h-auto max-w-none"
                style={{ width: baseWidth * zoom }}
              />
            </div>
          </Content>
        </DialogPortal>
      </Dialog>
      <details className="rounded border border-border bg-muted/30 p-3">
        <summary
          id={id}
          className="min-h-11 cursor-pointer rounded py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Ler descrição textual do infográfico
        </summary>
        <div role="region" aria-labelledby={id} className="mt-2 space-y-3 leading-relaxed">
          {description
            .split(/\n|\\n/)
            .filter(Boolean)
            .map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
        </div>
      </details>
    </div>
  );
}
