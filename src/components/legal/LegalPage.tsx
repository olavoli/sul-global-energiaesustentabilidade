import type { ReactNode } from "react";

import { Container } from "@/components/layout/Container";

/** Shared presentation for provisional legal and governance documents. */
export function LegalPage({
  eyebrow,
  title,
  updatedAt,
  children,
}: {
  eyebrow: string;
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <Container className="py-16">
      <article className="mx-auto max-w-3xl">
        <header className="border-b border-border pb-8">
          <span className="overline text-primary">{eyebrow}</span>
          <h1 className="mt-3 font-serif text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
          <p className="mt-4 text-sm text-muted-foreground">Atualizado em {updatedAt}.</p>
          <p className="mt-4 rounded-md border border-border bg-muted/40 p-4 text-sm text-foreground">
            Documento inicial para transparência operacional. Requer validação jurídica antes do
            primeiro lançamento público e não constitui aconselhamento jurídico.
          </p>
        </header>
        <div className="prose-editorial mt-10 text-foreground">{children}</div>
      </article>
    </Container>
  );
}
