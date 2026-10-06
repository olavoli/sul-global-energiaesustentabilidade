import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TURNSTILE_ACTION = "newsletter-subscribe";

type Status =
  | { kind: "loading" }
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | { kind: "unavailable" };

function NewsletterSecurityCheck({
  siteKey,
  onToken,
  resetVersion,
}: {
  siteKey: string;
  onToken: (token: string) => void;
  resetVersion: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    const render = () => {
      if (cancelled || !window.turnstile || !container.current || widget.current) return;
      widget.current = window.turnstile.render(container.current, {
        sitekey: siteKey,
        action: TURNSTILE_ACTION,
        size: container.current.clientWidth < 300 ? "compact" : "flexible",
        callback: (token) => {
          onToken(token);
          setError(false);
        },
        "expired-callback": () => onToken(""),
        "error-callback": () => {
          onToken("");
          setError(true);
        },
      });
    };
    const failed = () => setError(true);
    let script = document.querySelector<HTMLScriptElement>('script[data-sges-turnstile="true"]');
    const isNew = !script;
    if (!script) {
      script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.sgesTurnstile = "true";
    }
    script.addEventListener("load", render);
    script.addEventListener("error", failed);
    if (window.turnstile) render();
    if (isNew) document.head.appendChild(script);
    return () => {
      cancelled = true;
      script?.removeEventListener("load", render);
      script?.removeEventListener("error", failed);
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = undefined;
    };
  }, [siteKey, onToken]);
  useEffect(() => {
    if (widget.current && resetVersion > 0) window.turnstile?.reset(widget.current);
  }, [resetVersion]);
  return (
    <div className="min-w-0 max-w-full">
      <div ref={container} aria-label="Verificação de segurança" />
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          A verificação de segurança falhou. Recarregue a página para tentar novamente.
        </p>
      )}
    </div>
  );
}

export function NewsletterCTA() {
  const [email, setEmail] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [siteKey, setSiteKey] = useState("");
  const [resetVersion, setResetVersion] = useState(0);
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const onToken = useCallback((token: string) => setTurnstileToken(token), []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/newsletter/subscriptions", { headers: { accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error("unavailable");
        return (await response.json()) as { enabled?: boolean; turnstileSiteKey?: string };
      })
      .then((config) => {
        if (cancelled) return;
        if (!config.enabled || !config.turnstileSiteKey) {
          setStatus({ kind: "unavailable" });
          return;
        }
        setSiteKey(config.turnstileSiteKey);
        setStatus({ kind: "idle" });
      })
      .catch(() => {
        if (!cancelled) setStatus({ kind: "unavailable" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setStatus({ kind: "error", message: "Informe um e-mail válido." });
      return;
    }
    if (!consentAccepted) {
      setStatus({ kind: "error", message: "Confirme o consentimento para continuar." });
      return;
    }
    if (!turnstileToken) {
      setStatus({ kind: "error", message: "Conclua a verificação de segurança." });
      return;
    }
    setStatus({ kind: "submitting" });
    const form = event.currentTarget;
    const honeypot = new FormData(form).get("website");
    try {
      const response = await fetch("/api/newsletter/subscriptions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: value,
          consentAccepted: true,
          turnstileToken,
          honeypot: typeof honeypot === "string" ? honeypot : "",
        }),
      });
      const result = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível enviar.");
      setEmail("");
      setConsentAccepted(false);
      setTurnstileToken("");
      setResetVersion((version) => version + 1);
      setStatus({
        kind: "success",
        message: result.message ?? "Confira sua caixa de entrada para confirmar sua inscrição.",
      });
    } catch (error) {
      setTurnstileToken("");
      setResetVersion((version) => version + 1);
      setStatus({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível iniciar a confirmação. Tente novamente.",
      });
    }
  }

  const disabled = ["loading", "submitting", "unavailable"].includes(status.kind);
  return (
    <section aria-label="Assine a newsletter" className="border-y border-border bg-muted/40 py-14">
      <div className="mx-auto max-w-2xl px-4 text-center">
        <span className="overline text-primary">Newsletter Sul Global</span>
        <h2 className="mt-3 font-serif text-3xl font-semibold text-foreground md:text-4xl">
          Energia e sustentabilidade explicadas para todos.
        </h2>
        <p className="mt-3 text-muted-foreground">
          Receba reportagens, curiosidades e informações sobre as transformações que afetam o nosso
          dia a dia e o futuro do planeta.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left" noValidate>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor="newsletter-email" className="sr-only">
              Seu e-mail
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              autoComplete="email"
              placeholder="seu@email.com"
              value={email}
              disabled={disabled}
              onChange={(event) => {
                setEmail(event.target.value);
                if (status.kind === "error" || status.kind === "success")
                  setStatus({ kind: "idle" });
              }}
              className="h-11 flex-1 rounded-md border border-input bg-background px-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              aria-invalid={status.kind === "error"}
            />
            <button
              type="submit"
              disabled={disabled}
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 font-medium text-primary-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status.kind === "submitting" ? "Enviando…" : "Quero receber"}
            </button>
          </div>
          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              required
              checked={consentAccepted}
              disabled={disabled}
              onChange={(event) => setConsentAccepted(event.target.checked)}
              className="mt-1 size-4 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span>
              Quero receber a newsletter do Sul Global e concordo com o tratamento do meu e-mail
              conforme a{" "}
              <a href="/privacidade" className="underline hover:text-foreground">
                Política de Privacidade
              </a>
              .
            </span>
          </label>
          <div
            className="absolute -left-[10000px] top-auto size-px overflow-hidden"
            aria-hidden="true"
          >
            <label htmlFor="newsletter-website">Não preencha este campo</label>
            <input
              id="newsletter-website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>
          {siteKey && (
            <NewsletterSecurityCheck
              siteKey={siteKey}
              onToken={onToken}
              resetVersion={resetVersion}
            />
          )}
        </form>
        {status.kind === "unavailable" && (
          <p role="status" className="mt-3 text-sm text-muted-foreground">
            A newsletter está temporariamente indisponível.
          </p>
        )}
        {status.kind === "error" && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {status.message}
          </p>
        )}
        {status.kind === "success" && (
          <p role="status" aria-live="polite" className="mt-3 text-sm text-foreground">
            {status.message}
          </p>
        )}
      </div>
    </section>
  );
}
