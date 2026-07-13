import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useState, type FormEvent } from "react";

import { Container } from "@/components/layout/Container";
import { ArticleCard } from "@/components/article/ArticleCard";
import { getPublishedArticles } from "@/data/articles";
import { searchArticles } from "@/lib/search";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/busca")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Busca — Sul Global" },
      {
        name: "description",
        content: "Encontre reportagens e análises do Sul Global por palavra-chave, tema ou autor.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BuscaPage,
});

function BuscaPage() {
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [value, setValue] = useState(q);

  const results = q ? searchArticles(getPublishedArticles(), q) : [];

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    navigate({ search: { q: value.trim() } });
  }

  return (
    <Container className="py-12">
      <header className="mb-8 border-b border-border pb-8">
        <span className="overline text-primary">Busca</span>
        <h1 className="mt-2 font-serif text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          O que você procura?
        </h1>
        <form role="search" onSubmit={onSubmit} className="mt-6 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="q" className="sr-only">
            Termo de busca
          </label>
          <input
            id="q"
            type="search"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Buscar por título, tema, autor…"
            className="h-11 flex-1 rounded-md border border-input bg-background px-3 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 font-medium text-primary-foreground hover:opacity-90"
          >
            Buscar
          </button>
        </form>
      </header>

      {q ? (
        results.length > 0 ? (
          <>
            <p className="mb-6 text-sm text-muted-foreground">
              {results.length} resultado{results.length === 1 ? "" : "s"} para{" "}
              <strong className="text-foreground">"{q}"</strong>.
            </p>
            <div className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
              {results.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          </>
        ) : (
          <div className="py-10">
            <p className="text-muted-foreground">
              Nenhum artigo encontrado para <strong className="text-foreground">"{q}"</strong>.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Tente outra palavra-chave ou volte para a{" "}
              <Link to="/" className="underline">
                página inicial
              </Link>
              .
            </p>
          </div>
        )
      ) : (
        <p className="text-muted-foreground">
          Digite um termo acima para buscar em todos os artigos publicados.
        </p>
      )}
    </Container>
  );
}
