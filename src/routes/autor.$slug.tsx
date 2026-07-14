import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { ArticleCard } from "@/components/article/ArticleCard";
import { Container } from "@/components/layout/Container";
import { getArticlesByAuthor } from "@/content/repository";
import { getAuthor } from "@/data/authors";
import { breadcrumbJsonLd, personJsonLd, resolveCanonical, socialMeta } from "@/lib/seo";
import { EditorialBreadcrumb } from "@/components/navigation/EditorialBreadcrumb";

export const Route = createFileRoute("/autor/$slug")({
  loader: ({ params }) => {
    const author = getAuthor(params.slug);
    if (!author) throw notFound();
    return { author, articles: getArticlesByAuthor(author.slug) };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ name: "robots", content: "noindex, follow" }] };
    const { author } = loaderData;
    const path = `/autor/${author.slug}`;
    return {
      meta: [
        { title: `${author.name} — Sul Global` },
        { name: "description", content: author.bio },
        ...socialMeta({
          title: `${author.name} — Sul Global`,
          description: author.bio,
          path,
          type: "profile",
        }),
      ],
      links: [{ rel: "canonical", href: resolveCanonical(path) }],
      scripts: [
        personJsonLd(author),
        breadcrumbJsonLd([
          { name: "Início", path: "/" },
          { name: author.name, path },
        ]),
      ].map((value) => ({ type: "application/ld+json", children: JSON.stringify(value) })),
    };
  },
  notFoundComponent: () => (
    <Container className="py-24 text-center">
      <h1 className="font-serif text-4xl font-bold">Autor não encontrado</h1>
      <Link to="/" className="mt-6 inline-block underline">
        Voltar para o início
      </Link>
    </Container>
  ),
  component: AuthorPage,
});

function AuthorPage() {
  const { author, articles } = Route.useLoaderData();
  return (
    <Container className="py-12">
      <header className="mb-10 max-w-3xl border-b border-border pb-8">
        <EditorialBreadcrumb
          items={[
            {
              label: "Início",
              content: (
                <Link to="/" className="hover:underline">
                  Início
                </Link>
              ),
            },
          ]}
          current={author.name}
        />
        <span className="overline text-primary">Autor</span>
        <h1 className="mt-2 font-serif text-4xl font-bold md:text-5xl">{author.name}</h1>
        <p className="mt-2 font-medium text-muted-foreground">{author.role}</p>
        <p className="mt-4 text-lg text-foreground">{author.bio}</p>
      </header>
      <h2 className="mb-6 font-serif text-2xl font-semibold">Artigos publicados</h2>
      {articles.length ? (
        <div className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">Nenhum artigo publicado por este autor ainda.</p>
      )}
    </Container>
  );
}
