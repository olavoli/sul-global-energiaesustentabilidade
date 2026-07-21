import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

const navigation = [
  ["Visão geral", ""],
  ["Inbox", "inbox"],
  ["Decisões", "decisions"],
  ["Clusters", "clusters"],
  ["Traduções", "translations"],
  ["Fontes", "sources"],
  ["Quarentena", "quarantine"],
  ["Execuções", "runs"],
  ["Relatórios", "reports"],
  ["Pautas", "pitches"],
  ["Radar Científico", "scientific-radar"],
  ["Configuração", "config"],
] as const;

export function AdminShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const logout = async () => {
    try {
      const response = await fetch("/api/admin/session");
      if (response.ok) {
        const session = (await response.json()) as { csrf?: string };
        await fetch("/api/admin/logout", {
          method: "POST",
          headers: session.csrf ? { "x-csrf-token": session.csrf } : {},
        });
      }
    } finally {
      window.location.assign("/admin/login");
    }
  };
  const links = (
    <ul className="space-y-1">
      {navigation.map(([label, section]) => (
        <li key={label}>
          {section ? (
            <Link
              to="/admin/newsroom/$section"
              params={{ section }}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              activeProps={{ className: "bg-muted text-foreground font-semibold" }}
            >
              {label}
            </Link>
          ) : (
            <Link
              to="/admin/newsroom"
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              activeProps={{ className: "bg-muted text-foreground font-semibold" }}
            >
              {label}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
  return (
    <div className="min-h-dvh bg-muted/40 text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="flex h-16 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="lg:hidden"
              aria-label="Abrir navegação da Central"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu aria-hidden />
            </Button>
            <div>
              <p className="overline text-primary">Sul Global</p>
              <p className="font-serif text-lg font-semibold">Central Editorial</p>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={logout}>
            Sair
          </Button>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[240px_1fr]">
        <aside className="hidden min-h-[calc(100dvh-4rem)] border-r bg-background p-4 lg:block">
          <nav aria-label="Central Editorial">{links}</nav>
        </aside>
        {open && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navegação da Central Editorial"
            className="fixed inset-0 z-50 bg-background p-4 lg:hidden"
          >
            <div className="mb-6 flex items-center justify-between">
              <strong className="font-serif text-xl">Central Editorial</strong>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Fechar navegação"
                onClick={() => setOpen(false)}
              >
                <X aria-hidden />
              </Button>
            </div>
            <nav aria-label="Central Editorial móvel">{links}</nav>
          </div>
        )}
        <main id="conteudo-admin" className="min-w-0 p-4 sm:p-6 lg:p-8">
          <nav aria-label="Breadcrumb" className="mb-3 text-sm text-muted-foreground">
            Central Editorial / {title}
          </nav>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">{description}</p>
          <div className="mt-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
