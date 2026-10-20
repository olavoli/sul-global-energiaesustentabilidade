import { useEffect, useRef, useState } from "react";
import {
  ADSTERRA_FRAME_PATH,
  ARTICLE_AD_MEDIA_QUERY,
  hasArticleAdSpace,
} from "@/lib/advertising/adsterra";

/** No iframe, vendor script or network hint is emitted during SSR or on narrow screens. */
export function ArticleAdRail({ articleKey }: { articleKey: string }) {
  const railRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(ARTICLE_AD_MEDIA_QUERY);
    const measure = () => {
      const rail = railRef.current;
      setVisible(
        Boolean(
          rail &&
          hasArticleAdSpace(
            media.matches,
            rail.getBoundingClientRect().left,
            document.documentElement.clientWidth,
          ),
        ),
      );
    };
    measure();
    media.addEventListener("change", measure);
    window.addEventListener("resize", measure);
    const observer = new ResizeObserver(measure);
    observer.observe(document.documentElement);
    return () => {
      media.removeEventListener("change", measure);
      window.removeEventListener("resize", measure);
      observer.disconnect();
    };
  }, []);

  return (
    <aside
      ref={railRef}
      aria-label="Publicidade"
      className="absolute left-[calc(100%+2rem)] top-0 hidden w-[160px] min-[1440px]:block"
    >
      {visible && (
        <>
          <p className="mb-2 text-center text-[11px] text-muted-foreground">Publicidade</p>
          <iframe
            key={articleKey}
            title="Publicidade Adsterra 160 × 600"
            src={ADSTERRA_FRAME_PATH}
            width={160}
            height={600}
            className="block h-[600px] w-[160px] border-0"
            sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </>
      )}
    </aside>
  );
}
