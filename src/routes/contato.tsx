import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Container } from "@/components/layout/Container";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Contato — Sul Global" },
      {
        name: "description",
        content:
          "Fale com a redação do Sul Global. Pautas, correções e parcerias editoriais.",
      },
      { property: "og:title", content: "Contato — Sul Global" },
      {
        property: "og:description",
        content:
          "Fale com a redação do Sul Global. Pautas, correções e parcerias.",
      },
    ],
  }),
  component: ContatoPage,
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ContatoPage() {
  const [form, setForm] = useState({ name: "", email: "", topic: "pauta", message: "" });
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (form.name.trim().length < 2) return setError("Informe seu nome.");
    if (!EMAIL_RE.test(form.email.trim())) return setError("E-mail inválido.");
    if (form.message.trim().length < 10)
      return setError("Descreva sua mensagem com pelo menos 10 caracteres.");
    setStatus("sent");
    setForm({ name: "", email: "", topic: "pauta", message: "" });
  }

  const input =
    "h-11 w-full rounded-md border border-input bg-background px-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-2xl">
        <span className="overline text-primary">Fale conosco</span>
        <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          Contato editorial
        </h1>
        <p className="mt-4 text-muted-foreground">
          Sugestões de pauta, correções factuais, propostas de coluna e
          parcerias editoriais.
        </p>

        <form onSubmit={submit} noValidate className="mt-10 space-y-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium">
              Nome
            </label>
            <input
              id="name"
              type="text"
              className={input}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              autoComplete="name"
              required
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              className={input}
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label htmlFor="topic" className="mb-1 block text-sm font-medium">
              Assunto
            </label>
            <select
              id="topic"
              className={input}
              value={form.topic}
              onChange={(e) => set("topic", e.target.value)}
            >
              <option value="pauta">Sugestão de pauta</option>
              <option value="correcao">Correção factual</option>
              <option value="coluna">Proposta de coluna</option>
              <option value="parceria">Parceria / patrocínio</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div>
            <label htmlFor="message" className="mb-1 block text-sm font-medium">
              Mensagem
            </label>
            <textarea
              id="message"
              rows={6}
              maxLength={2000}
              className="w-full rounded-md border border-input bg-background p-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={form.message}
              onChange={(e) => set("message", e.target.value)}
              required
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {status === "sent" && (
            <p role="status" aria-live="polite" className="text-sm text-foreground">
              Obrigado. Recebemos sua mensagem — esta é uma demonstração;
              nenhuma integração de e-mail está ativa nesta versão.
            </p>
          )}

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 font-medium text-primary-foreground hover:opacity-90"
          >
            Enviar mensagem
          </button>
        </form>
      </div>
    </Container>
  );
}