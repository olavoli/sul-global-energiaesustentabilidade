import { useState } from "react";
import { Link as LinkIcon, Check, Linkedin, MessageCircle } from "lucide-react";
import { siteConfig } from "@/config/site";
import { buildArticleShareUrls, copyArticleLink } from "./article-sharing";

export function ShareBar({ title, path }: { title: string; path: string }) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined" ? window.location.origin + path : `${siteConfig.url}${path}`;

  const shareUrls = buildArticleShareUrls(title, shareUrl);

  const copy = async () => {
    try {
      await copyArticleLink(navigator.clipboard, shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const btn =
    "inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs text-foreground transition-colors hover:bg-muted";

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Compartilhar">
      <span className="overline text-muted-foreground">Compartilhar</span>
      <a
        className={btn}
        href={shareUrls.whatsapp}
        target="_blank"
        rel="noreferrer noopener"
        aria-label="Compartilhar no WhatsApp"
      >
        <MessageCircle className="h-4 w-4" aria-hidden /> WhatsApp
      </a>
      <a
        className={btn}
        href={shareUrls.linkedin}
        target="_blank"
        rel="noreferrer noopener"
        aria-label="Compartilhar no LinkedIn"
      >
        <Linkedin className="h-4 w-4" aria-hidden /> LinkedIn
      </a>
      <button
        type="button"
        onClick={copy}
        className={btn}
        aria-label="Copiar link do artigo"
        aria-live="polite"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" aria-hidden /> Link copiado
          </>
        ) : (
          <>
            <LinkIcon className="h-4 w-4" aria-hidden /> Copiar link
          </>
        )}
      </button>
    </div>
  );
}
