import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { PublicComment, CommentPage } from "@/lib/comments/repository";
import type { ReactionValue } from "@/lib/comments/contracts";
import { commentRequest, mergeComments } from "./client";

const consent =
  "Li e concordo com as Regras de Participação e com a Política de Privacidade. Autorizo o uso do meu nome ou apelido para publicação do comentário e do meu e-mail apenas para moderação, segurança e atendimento a pedidos de exclusão. O e-mail não será exibido publicamente.";
const TURNSTILE_ACTION = "comment-submit";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          action: string;
          size?: "flexible" | "compact";
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

function SecurityCheck({
  siteKey,
  action,
  onToken,
  resetVersion,
}: {
  siteKey: string;
  action: string;
  onToken: (token: string) => void;
  resetVersion: number;
}) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | undefined>(undefined);
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    let renderedSize: "flexible" | "compact";
    const render = () => {
      if (cancelled || !window.turnstile || !container.current || widget.current) return;
      renderedSize = container.current.clientWidth < 300 ? "compact" : "flexible";
      widget.current = window.turnstile.render(container.current, {
        sitekey: siteKey,
        action,
        size: renderedSize,
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
    const observer = new ResizeObserver(() => {
      if (cancelled || !widget.current || !container.current || !window.turnstile) return;
      const size = container.current.clientWidth < 300 ? "compact" : "flexible";
      if (size === renderedSize) return;
      window.turnstile.remove(widget.current);
      widget.current = undefined;
      onToken("");
      render();
    });
    if (container.current) observer.observe(container.current);
    return () => {
      cancelled = true;
      observer.disconnect();
      script?.removeEventListener("load", render);
      script?.removeEventListener("error", failed);
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = undefined;
    };
  }, [siteKey, action, onToken]);
  useEffect(() => {
    if (widget.current && resetVersion > 0) {
      window.turnstile?.reset(widget.current);
      setError(false);
    }
  }, [resetVersion]);
  return (
    <div className="min-w-0 max-w-full">
      <div ref={container} aria-label="Verificação de segurança" />
      {error && (
        <p role="alert" className="text-sm">
          A verificação de segurança falhou. Recarregue a página para tentar novamente.
        </p>
      )}
    </div>
  );
}

function CommentForm({
  endpoint,
  articleSlug,
  siteKey,
  parent,
  onPublished,
  onCancel,
}: {
  endpoint: string;
  articleSlug: string;
  siteKey: string;
  parent?: PublicComment;
  onPublished: (comment: PublicComment) => void;
  onCancel?: () => void;
}) {
  const [body, setBody] = useState("");
  const [token, setToken] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [reset, setReset] = useState(0);
  const busy = useRef(false);
  const prefix = `comment-${parent?.id ?? "new"}`;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const element = event.currentTarget;
    const form = new FormData(element);
    busy.current = true;
    setSending(true);
    setMessage("");
    try {
      const result = await commentRequest<{ comment?: PublicComment }>(endpoint, {
        method: "POST",
        body: JSON.stringify({
          articleSlug,
          publicName: form.get("publicName"),
          email: form.get("email"),
          bodyText: form.get("bodyText"),
          consentAccepted: form.get("consentAccepted") === "on",
          honeypot: form.get("website"),
          turnstileToken: token,
          ...(parent ? { parentCommentId: parent.id } : {}),
        }),
      });
      if (result.comment) {
        onPublished(result.comment);
        setMessage("Comentário publicado.");
        element.reset();
        setBody("");
      } else setMessage("Envio recebido.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar o comentário.");
    } finally {
      busy.current = false;
      setSending(false);
      setToken("");
      setReset((value) => value + 1);
    }
  }
  const field = "mt-1 w-full min-w-0 rounded-md border border-border bg-background px-2 py-1.5";
  return (
    <form className="mt-3 min-w-0 space-y-2 text-sm" onSubmit={submit}>
      {parent && <p className="font-medium">Respondendo a {parent.publicName}</p>}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label htmlFor={`${prefix}-name`}>Nome ou apelido</label>
          <input
            id={`${prefix}-name`}
            name="publicName"
            minLength={2}
            maxLength={60}
            required
            className={field}
          />
        </div>
        <div>
          <label htmlFor={`${prefix}-email`}>E-mail (não será publicado)</label>
          <input
            id={`${prefix}-email`}
            name="email"
            type="email"
            maxLength={254}
            required
            className={field}
          />
        </div>
      </div>
      <div>
        <label htmlFor={`${prefix}-body`}>{parent ? "Resposta" : "Comentário"}</label>
        <textarea
          id={`${prefix}-body`}
          name="bodyText"
          rows={3}
          minLength={3}
          maxLength={2000}
          required
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className={field}
          aria-describedby={`${prefix}-counter`}
        />
        <p id={`${prefix}-counter`} className="text-right text-xs text-muted-foreground">
          {body.length}/2000
        </p>
      </div>
      <div className="hidden" aria-hidden="true">
        <label htmlFor={`${prefix}-website`}>Website</label>
        <input id={`${prefix}-website`} name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <details className="text-xs">
        <summary className="cursor-pointer font-medium">Regras de Participação</summary>
        <p className="mt-2">
          Comentários e respostas válidos são publicados imediatamente e sujeitos a moderação
          posterior. Mantenha o respeito e o foco no tema. Não publique ofensas, ameaças,
          discriminação, spam, dados pessoais, publicidade ou links maliciosos. Conteúdos que violem
          estas regras podem ser ocultados, classificados como spam ou excluídos. A exclusão apaga o
          conteúdo e não permite restauração.
        </p>
        <p className="mt-1">
          Dados pessoais de conteúdos ocultados ou classificados como spam são sujeitos à retenção
          de pelo menos 90 dias, com anonimização durante os acessos administrativos descritos na
          Política de Privacidade. Pedidos de exclusão seguem os canais ali indicados.
        </p>
      </details>
      <label className="flex items-start gap-2 text-xs">
        <input name="consentAccepted" type="checkbox" required className="mt-0.5 shrink-0" />
        <span>
          {consent}{" "}
          <Link to="/privacidade" className="underline">
            Política de Privacidade
          </Link>
          .
        </span>
      </label>
      <SecurityCheck
        siteKey={siteKey}
        action={TURNSTILE_ACTION}
        onToken={setToken}
        resetVersion={reset}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          disabled={sending || !token}
          type="submit"
          className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground disabled:opacity-60"
        >
          {sending ? "Enviando…" : "Comentar"}
        </button>
        {onCancel && (
          <button type="button" className="underline" onClick={onCancel}>
            Cancelar resposta
          </button>
        )}
      </div>
      {message && (
        <p role="status" aria-live="polite">
          {message}
        </p>
      )}
    </form>
  );
}

function ReportForm({
  endpoint,
  siteKey,
  onClose,
}: {
  endpoint: string;
  siteKey: string;
  onClose: () => void;
}) {
  const [token, setToken] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [reset, setReset] = useState(0);
  const busy = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = new FormData(event.currentTarget);
    busy.current = true;
    setSending(true);
    setMessage("");
    try {
      await commentRequest(endpoint, {
        method: "POST",
        body: JSON.stringify({
          reason: form.get("reason"),
          ...(String(form.get("detail") ?? "").trim() ? { detail: form.get("detail") } : {}),
          turnstileToken: token,
        }),
      });
      setMessage("Denúncia recebida para análise. O conteúdo não é ocultado automaticamente.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível denunciar.");
    } finally {
      busy.current = false;
      setSending(false);
      setToken("");
      setReset((value) => value + 1);
    }
  }
  return (
    <form onSubmit={submit} className="mt-3 space-y-2 text-sm" aria-label="Denunciar comentário">
      <label className="block">
        Motivo
        <select name="reason" required className="ml-2 rounded border bg-background p-1">
          <option value="spam">Spam</option>
          <option value="abuso">Abuso</option>
          <option value="privacidade">Privacidade</option>
          <option value="outro">Outro</option>
        </select>
      </label>
      <label className="block">
        Detalhe (opcional)
        <textarea
          name="detail"
          maxLength={500}
          rows={2}
          className="mt-1 w-full rounded border bg-background p-2"
        />
      </label>
      <SecurityCheck
        siteKey={siteKey}
        action="comment-report"
        onToken={setToken}
        resetVersion={reset}
      />
      <div className="flex flex-wrap gap-3">
        <button disabled={sending || !token} className="underline">
          Enviar denúncia
        </button>
        <button type="button" onClick={onClose} className="underline">
          Fechar
        </button>
      </div>
      {message && (
        <p role="status" aria-live="polite">
          {message}
        </p>
      )}
    </form>
  );
}

export function CommentEntry({
  comment,
  endpoint,
  siteKey,
  onReply,
  onUpdate,
}: {
  comment: PublicComment;
  endpoint: string;
  siteKey: string;
  onReply: () => void;
  onUpdate: (comment: PublicComment) => void;
}) {
  const [reporting, setReporting] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  async function react(value: ReactionValue) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setMessage("");
    try {
      const remove = comment.viewerReaction === value;
      const result = await commentRequest<{ comment: PublicComment }>(
        `${endpoint}/${comment.id}/reaction`,
        {
          method: remove ? "DELETE" : "PUT",
          ...(remove ? {} : { body: JSON.stringify({ value }) }),
        },
      );
      onUpdate(result.comment);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível reagir.");
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  const action =
    "rounded px-1 py-1 hover:text-primary aria-pressed:bg-primary/10 aria-pressed:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60";
  return (
    <div className="min-w-0 [overflow-wrap:anywhere]">
      <p className="font-semibold">{comment.publicName}</p>
      {comment.parentCommentId && (
        <p className="text-xs text-muted-foreground">
          Respondendo a {comment.replyingTo ?? "comentário indisponível"}
        </p>
      )}
      <p className="mt-1 whitespace-pre-wrap">{comment.bodyText}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <button
          className={action}
          disabled={busy}
          aria-pressed={comment.viewerReaction === "like"}
          onClick={() => react("like")}
        >
          👍 Gostei {comment.likes}
        </button>
        <button
          className={action}
          disabled={busy}
          aria-pressed={comment.viewerReaction === "dislike"}
          onClick={() => react("dislike")}
        >
          👎 Não gostei {comment.dislikes}
        </button>
        <button className={action} onClick={onReply}>
          Responder
        </button>
        <button
          className={action}
          onClick={() => setReporting((value) => !value)}
          aria-expanded={reporting}
        >
          Denunciar
        </button>
        <time
          dateTime={comment.publishedAt}
          title={new Date(comment.publishedAt).toLocaleString("pt-BR")}
          className="sm:ml-auto"
        >
          {formatDistanceToNow(new Date(comment.publishedAt), { locale: ptBR, addSuffix: true })}
        </time>
      </div>
      {message && (
        <p role="alert" className="text-sm">
          {message}
        </p>
      )}
      {reporting && (
        <ReportForm
          endpoint={`${endpoint}/${comment.id}/reports`}
          siteKey={siteKey}
          onClose={() => setReporting(false)}
        />
      )}
    </div>
  );
}

export function CommentsSection({ articleSlug }: { articleSlug: string }) {
  return <CommentsContent key={articleSlug} articleSlug={articleSlug} />;
}

function CommentsContent({ articleSlug }: { articleSlug: string }) {
  const endpoint = `/api/articles/${articleSlug}/comments`;
  const [page, setPage] = useState<CommentPage<PublicComment>>({ items: [] });
  const [replies, setReplies] = useState<
    Record<string, CommentPage<PublicComment> & { loaded?: boolean }>
  >({});
  const [replyErrors, setReplyErrors] = useState<Record<string, string>>({});
  const [siteKey, setSiteKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [replyTo, setReplyTo] = useState<PublicComment>();
  const [replyBusy, setReplyBusy] = useState<Record<string, boolean>>({});
  const mounted = useRef(true);
  const moreLock = useRef(false);
  const replyLock = useRef(new Set<string>());
  const generation = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    generation.current++;
    replyLock.current.clear();
    setReplies({});
    setReplyErrors({});
    setReplyBusy({});
    setReplyTo(undefined);
    setLoading(true);
    setError("");
    commentRequest<CommentPage<PublicComment> & { turnstileSiteKey: string }>(endpoint, {
      signal: controller.signal,
    })
      .then((result) => {
        if (!controller.signal.aborted) {
          setPage(result);
          setSiteKey(result.turnstileSiteKey);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Não foi possível carregar os comentários. Tente novamente.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [endpoint, version]);
  async function more() {
    if (!page.cursor || moreLock.current) return;
    moreLock.current = true;
    setLoadingMore(true);
    setError("");
    try {
      const next = await commentRequest<CommentPage<PublicComment>>(
        `${endpoint}?cursor=${encodeURIComponent(page.cursor)}`,
      );
      if (mounted.current)
        setPage((current) => ({
          items: mergeComments(current.items, next.items),
          cursor: next.cursor,
        }));
    } catch {
      if (mounted.current) setError("Não foi possível carregar mais comentários.");
    } finally {
      moreLock.current = false;
      if (mounted.current) setLoadingMore(false);
    }
  }
  async function loadReplies(rootId: string) {
    if (replyLock.current.has(rootId)) return;
    const currentGeneration = generation.current;
    replyLock.current.add(rootId);
    setReplyBusy((current) => ({ ...current, [rootId]: true }));
    setReplyErrors((current) => ({ ...current, [rootId]: "" }));
    const previous = replies[rootId];
    try {
      const next = await commentRequest<CommentPage<PublicComment>>(
        `${endpoint}/${rootId}/replies${previous?.cursor ? `?cursor=${encodeURIComponent(previous.cursor)}` : ""}`,
      );
      if (mounted.current && currentGeneration === generation.current)
        setReplies((current) => ({
          ...current,
          [rootId]: {
            items: mergeComments(current[rootId]?.items ?? [], next.items).sort(
              (a, b) => a.publishedAt.localeCompare(b.publishedAt) || a.id.localeCompare(b.id),
            ),
            cursor: next.cursor,
            loaded: true,
          },
        }));
    } catch {
      if (mounted.current && currentGeneration === generation.current)
        setReplyErrors((current) => ({
          ...current,
          [rootId]: "Não foi possível carregar as respostas.",
        }));
    } finally {
      if (currentGeneration === generation.current) {
        replyLock.current.delete(rootId);
        if (mounted.current) setReplyBusy((current) => ({ ...current, [rootId]: false }));
      }
    }
  }
  function update(comment: PublicComment) {
    if (comment.rootCommentId) {
      setReplies((current) => ({
        ...current,
        [comment.rootCommentId!]: {
          ...current[comment.rootCommentId!],
          items: mergeComments(current[comment.rootCommentId!]?.items ?? [], [comment]),
        },
      }));
    } else setPage((current) => ({ ...current, items: mergeComments(current.items, [comment]) }));
  }
  function published(comment: PublicComment) {
    if (comment.rootCommentId) {
      // Load the first page too when posting into a thread not yet opened.
      if (!replies[comment.rootCommentId]?.loaded) void loadReplies(comment.rootCommentId);
      update(comment);
      setReplyTo(undefined);
    } else setPage((current) => ({ ...current, items: mergeComments([comment], current.items) }));
  }
  const replyForm = (comment: PublicComment) =>
    replyTo?.id === comment.id ? (
      <CommentForm
        key={comment.id}
        endpoint={endpoint}
        articleSlug={articleSlug}
        siteKey={siteKey}
        parent={comment}
        onPublished={published}
        onCancel={() => setReplyTo(undefined)}
      />
    ) : null;
  return (
    <section
      data-tts-exclude="true"
      aria-labelledby="comments-title"
      className="mx-auto w-full max-w-[72ch] min-w-0 border-y border-border py-6"
    >
      <h2 id="comments-title" className="font-serif text-2xl font-semibold">
        Comentários
      </h2>
      {loading && (
        <p role="status" className="mt-3 text-sm">
          Carregando comentários…
        </p>
      )}
      {error && (
        <div role="alert" className="mt-3 text-sm">
          <p>{error}</p>
          <button onClick={() => setVersion((value) => value + 1)} className="underline">
            Tentar novamente
          </button>
        </div>
      )}
      {!loading && siteKey && (
        <CommentForm
          endpoint={endpoint}
          articleSlug={articleSlug}
          siteKey={siteKey}
          onPublished={published}
        />
      )}
      {!loading && siteKey && page.items.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">Seja a primeira pessoa a comentar.</p>
      )}
      <ul className="mt-5 divide-y divide-border">
        {page.items.map((comment) => (
          <li key={comment.id} className="min-w-0 py-4">
            <CommentEntry
              comment={comment}
              endpoint={endpoint}
              siteKey={siteKey}
              onReply={() => setReplyTo(comment)}
              onUpdate={update}
            />
            {replyForm(comment)}
            {replies[comment.id]?.items.length > 0 && (
              <ul className="mt-3 ml-3 min-w-0 divide-y divide-border border-l border-border pl-3">
                {replies[comment.id].items.map((reply) => (
                  <li key={reply.id} className="py-3">
                    <CommentEntry
                      comment={reply}
                      endpoint={endpoint}
                      siteKey={siteKey}
                      onReply={() => setReplyTo(reply)}
                      onUpdate={update}
                    />
                    {replyForm(reply)}
                  </li>
                ))}
              </ul>
            )}
            {replyErrors[comment.id] && (
              <p role="alert" className="mt-2 text-sm">
                {replyErrors[comment.id]}
              </p>
            )}
            {(!replies[comment.id]?.loaded || replies[comment.id].cursor) && (
              <button
                className="mt-2 text-xs underline"
                disabled={Boolean(replyBusy[comment.id])}
                onClick={() => loadReplies(comment.id)}
              >
                {replyBusy[comment.id]
                  ? "Carregando…"
                  : replyErrors[comment.id]
                    ? "Tentar novamente as respostas"
                    : replies[comment.id]?.loaded
                      ? "Mais respostas"
                      : "Ver respostas"}
              </button>
            )}
          </li>
        ))}
      </ul>
      {page.cursor && (
        <button className="mt-3 text-sm underline" disabled={loadingMore} onClick={more}>
          {loadingMore ? "Carregando…" : "Mais comentários"}
        </button>
      )}
    </section>
  );
}
