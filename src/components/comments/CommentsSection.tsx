import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";

const consent =
  "Li e concordo com as Regras de Participação e com a Política de Privacidade. Autorizo o uso do meu nome ou apelido para publicação do comentário e do meu e-mail apenas para moderação, segurança e atendimento a pedidos de exclusão. O e-mail não será exibido publicamente.";

interface PublicComment {
  id: string;
  publicName: string;
  bodyText: string;
  approvedAt: string;
}

const TURNSTILE_ACTION = "comment-submit";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          action: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback": () => void;
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export function CommentsSection({ articleSlug }: { articleSlug: string }) {
  const endpoint = `/api/articles/${articleSlug}/comments`;
  const [comments, setComments] = useState<PublicComment[] | null>(null);
  const [siteKey, setSiteKey] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const widgetContainer = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | undefined>(undefined);

  useEffect(() => {
    fetch(endpoint)
      .then(async (response) =>
        response.ok
          ? ((await response.json()) as { items: PublicComment[]; turnstileSiteKey: string })
          : null,
      )
      .then((result) => {
        if (!result) return;
        setComments(result.items);
        setSiteKey(result.turnstileSiteKey);
      })
      .catch(() => undefined);
  }, [endpoint]);

  useEffect(() => {
    if (!siteKey || !widgetContainer.current) return;
    let cancelled = false;
    const render = () => {
      if (cancelled || !window.turnstile || !widgetContainer.current || widgetId.current) return;
      widgetId.current = window.turnstile.render(widgetContainer.current, {
        sitekey: siteKey,
        action: TURNSTILE_ACTION,
        callback: setTurnstileToken,
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () => setTurnstileToken(""),
      });
    };
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-sges-turnstile="true"]',
    );
    if (existing) {
      if (window.turnstile) render();
      else existing.addEventListener("load", render, { once: true });
    } else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.sgesTurnstile = "true";
      script.addEventListener("load", render, { once: true });
      document.head.appendChild(script);
    }
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = undefined;
    };
  }, [siteKey]);

  if (comments === null) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        articleSlug,
        publicName: form.get("publicName"),
        email: form.get("email"),
        bodyText: form.get("bodyText"),
        consentAccepted: form.get("consentAccepted") === "on",
        honeypot: form.get("website"),
        turnstileToken,
      }),
    }).catch(() => undefined);
    setSending(false);
    setMessage(
      response?.status === 202
        ? "Comentário enviado para moderação."
        : "Não foi possível enviar o comentário.",
    );
    if (response?.status === 202) event.currentTarget.reset();
    setTurnstileToken("");
    window.turnstile?.reset(widgetId.current);
  }

  return (
    <section
      data-tts-exclude="true"
      aria-labelledby="comments-title"
      className="border-y border-border py-12"
    >
      <h2 id="comments-title" className="font-serif text-2xl font-semibold">
        Comentários
      </h2>
      {comments.length > 0 && (
        <ul className="mt-6 space-y-6">
          {comments.map((comment) => (
            <li key={comment.id}>
              <p className="font-semibold">{comment.publicName}</p>
              <p className="mt-1 whitespace-pre-wrap">{comment.bodyText}</p>
            </li>
          ))}
        </ul>
      )}
      <form className="mt-8 space-y-4" onSubmit={submit}>
        <div>
          <label htmlFor="comment-name" className="block text-sm font-medium">
            Nome ou apelido
          </label>
          <input
            id="comment-name"
            name="publicName"
            minLength={2}
            maxLength={60}
            required
            className="mt-1 w-full rounded-md border border-border bg-background p-2"
          />
        </div>
        <div>
          <label htmlFor="comment-email" className="block text-sm font-medium">
            E-mail (não será publicado)
          </label>
          <input
            id="comment-email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-md border border-border bg-background p-2"
          />
        </div>
        <div>
          <label htmlFor="comment-body" className="block text-sm font-medium">
            Comentário
          </label>
          <textarea
            id="comment-body"
            name="bodyText"
            minLength={3}
            maxLength={2000}
            required
            rows={6}
            className="mt-1 w-full rounded-md border border-border bg-background p-2"
          />
        </div>
        <div className="hidden" aria-hidden="true">
          <label htmlFor="comment-website">Website</label>
          <input id="comment-website" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <details className="rounded-md border border-border p-4">
          <summary className="cursor-pointer font-medium">Regras de Participação</summary>
          <p className="mt-3">
            Este é um espaço para dúvidas, opiniões e conversas respeitosas sobre os temas
            publicados no Sul Global.
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>use um nome ou apelido;</li>
            <li>mantenha o respeito pelas outras pessoas;</li>
            <li>não publique ofensas, ameaças, discriminação, spam ou dados pessoais;</li>
            <li>escreva sobre o assunto abordado na publicação;</li>
            <li>não inclua publicidade ou links maliciosos.</li>
          </ul>
          <p className="mt-2">
            Todos os comentários passam por moderação antes de aparecer no site. O Sul Global poderá
            rejeitar ou remover conteúdos que não respeitem estas regras.
          </p>
          <p className="mt-2">
            Comentários rejeitados ou classificados como spam terão seus dados pessoais anonimizados
            após 90 dias. Você poderá solicitar a exclusão de um comentário publicado pelos canais
            indicados na Política de Privacidade.
          </p>
        </details>
        <label className="flex items-start gap-3 text-sm">
          <input name="consentAccepted" type="checkbox" required className="mt-1" />
          <span>
            {consent}{" "}
            <Link to="/privacidade" className="underline">
              Política de Privacidade
            </Link>
            .
          </span>
        </label>
        <div ref={widgetContainer} aria-label="Verificação de segurança" />
        <button
          type="submit"
          disabled={sending || !turnstileToken}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-60"
        >
          {sending ? "Enviando…" : "Enviar comentário"}
        </button>
        <p role="status" aria-live="polite" className="text-sm">
          {message}
        </p>
      </form>
    </section>
  );
}
