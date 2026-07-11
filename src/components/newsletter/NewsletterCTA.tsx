import { useState, type FormEvent } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewsletterCTA() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "error"; message: string }
    | { kind: "notice"; message: string }
  >({ kind: "idle" });

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setStatus({ kind: "error", message: "Informe um e-mail válido." });
      return;
    }
    setStatus({
      kind: "notice",
      message:
        "Obrigado. A integração da newsletter será disponibilizada em breve — nenhum e-mail foi cadastrado nesta versão.",
    });
    setEmail("");
  }

  return (
    <section
      aria-label="Assine a newsletter"
      className="border-y border-border bg-muted/40 py-14"
    >
      <div className="mx-auto max-w-2xl px-4 text-center">
        <span className="overline text-primary">Newsletter Sul Global</span>
        <h2 className="mt-3 font-serif text-3xl font-semibold text-foreground md:text-4xl">
          Uma análise semanal sobre energia e transição.
        </h2>
        <p className="mt-3 text-muted-foreground">
          Reportagem original, sem ruído, para quem trabalha no setor.
        </p>
        <form
          onSubmit={handleSubmit}
          className="mt-6 flex flex-col gap-2 sm:flex-row"
          noValidate
        >
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
            onChange={(e) => {
              setEmail(e.target.value);
              if (status.kind !== "idle") setStatus({ kind: "idle" });
            }}
            className="h-11 flex-1 rounded-md border border-input bg-background px-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-invalid={status.kind === "error"}
          />
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Assinar
          </button>
        </form>
        {status.kind === "error" && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {status.message}
          </p>
        )}
        {status.kind === "notice" && (
          <p role="status" aria-live="polite" className="mt-3 text-sm text-foreground">
            {status.message}
          </p>
        )}
      </div>
    </section>
  );
}