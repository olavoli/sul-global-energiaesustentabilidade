import { useState } from "react";
import { Link as LinkIcon, Check, Twitter, Linkedin } from "lucide-react";

export function ShareBar({ title, path }: { title: string; path: string }) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? window.location.origin + path
      : `https://sulglobal.example${path}`;

  const encoded = encodeURIComponent(shareUrl);
  const text = encodeURIComponent(title);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
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
        href={`https://twitter.com/intent/tweet?url=${encoded}&text=${text}`}
        target="_blank"
        rel="noreferrer noopener"
      >
        <Twitter className="h-4 w-4" aria-hidden /> X
      </a>
      <a
        className={btn}
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`}
        target="_blank"
        rel="noreferrer noopener"
      >
        <Linkedin className="h-4 w-4" aria-hidden /> LinkedIn
      </a>
      <button type="button" onClick={copy} className={btn} aria-live="polite">
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