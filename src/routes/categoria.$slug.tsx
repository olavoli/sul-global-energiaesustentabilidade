import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { Container } from "@/components/layout/Container";
import { ArticleCard } from "@/components/article/ArticleCard";
import { getArticlesByCategory } from "@/content/repository";
import { getCategory, categories } from "@/data/categories";
import type { Article } from "@/types/content";
import { categoryBreadcrumb, resolveCanonical, socialMeta } from "@/lib/seo";
import { EditorialBreadcrumb } from "@/components/navigation/EditorialBreadcrumb";

export const Route = createFileRoute("/categoria/$slug")({
  loader: ({ params }) => {
    const category = getCategory(params.slug);
    if (!category) throw notFound();
    const articles = getArticlesByCategory(category.slug).sort((a, b) =>
      b.publishedAt.localeCompare(a.publishedAt),
    );
    return { category, articles };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Categoria não encontrada — Sul Global" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { category } = loaderData;
    return {
      meta: [
        { title: `${category.name} — Sul Global` },
        { name: "description", content: category.description },
        ...socialMeta({
          title: `${category.name} — Sul Global`,
          description: category.description,
          path: `/categoria/${category.slug}`,
        }),
      ],
      links: [{ rel: "canonical", href: resolveCanonical(`/categoria/${category.slug}`) }],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(categoryBreadcrumb(category)) },
      ],
    };
  },
  notFoundComponent: CategoryNotFound,
  component: CategoryPage,
});

function CategoryNotFound() {
  return (
    <Container className="py-24 text-center">
      <span className="overline text-muted-foreground">404 — Categoria</span>
      <h1 className="mt-3 font-serif text-4xl font-bold">Categoria não encontrada</h1>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {categories.map((c) => (
          <Link
            key={c.slug}
            to="/categoria/$slug"
            params={{ slug: c.slug }}
            className="rounded-full border border-border px-3 py-1 text-sm text-foreground hover:border-primary"
          >
            {c.name}
          </Link>
        ))}
      </div>
    </Container>
  );
}

function CategoryPage() {
  const { category, articles } = Route.useLoaderData();

  return (
    <Container className="py-12">
      <header className="mb-10 border-b border-border pb-8">
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
          current={category.name}
        />
        <span className="overline text-primary">Categoria</span>
        <h1 className="mt-2 font-serif text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          {category.name}
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground md:text-lg">{category.description}</p>
      </header>

      {articles.length === 0 ? (
        <p className="text-muted-foreground">Nenhum artigo publicado nesta categoria ainda.</p>
      ) : (
        <div className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
          {(articles as Article[]).map((a: Article, i: number) => (
            <ArticleCard key={a.id} article={a} eager={i < 3} />
          ))}
        </div>
      )}
    </Container>
  );
}
