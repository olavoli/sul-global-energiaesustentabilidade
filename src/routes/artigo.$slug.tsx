import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { Container } from "@/components/layout/Container";
import { CategoryTag } from "@/components/article/CategoryTag";
import { Byline } from "@/components/article/Byline";
import { ArticleBody } from "@/components/article/ArticleBody";
import { ShareBar } from "@/components/article/ShareBar";
import { ArticleCard } from "@/components/article/ArticleCard";
import { NewsletterCTA } from "@/components/newsletter/NewsletterCTA";
import { getArticleBySlug, getRelatedArticles } from "@/data/articles";
import type { Article } from "@/types/content";

export const Route = createFileRoute("/artigo/$slug")({
  loader: ({ params }) => {
    const article = getArticleBySlug(params.slug);
    if (!article) throw notFound();
    return { article, related: getRelatedArticles(article, 3) };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Artigo indisponível — Sul Global" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { article } = loaderData;
    return {
      meta: [
        { title: `${article.title} — Sul Global` },
        { name: "description", content: article.excerpt },
        { name: "author", content: article.author.name },
        { property: "article:published_time", content: article.publishedAt },
        { property: "og:type", content: "article" },
        { property: "og:title", content: article.title },
        { property: "og:description", content: article.excerpt },
        { property: "og:image", content: article.coverImage },
        { name: "twitter:title", content: article.title },
        { name: "twitter:description", content: article.excerpt },
        { name: "twitter:image", content: article.coverImage },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            headline: article.title,
            description: article.excerpt,
            image: [article.coverImage],
            datePublished: article.publishedAt,
            author: [{ "@type": "Person", name: article.author.name }],
            publisher: {
              "@type": "Organization",
              name: "Sul Global",
            },
          }),
        },
      ],
    };
  },
  notFoundComponent: ArticleNotFound,
  component: ArticleDetail,
});

function ArticleNotFound() {
  return (
    <Container className="py-24 text-center">
      <span className="overline text-muted-foreground">404 — Artigo</span>
      <h1 className="mt-3 font-serif text-4xl font-bold">
        Artigo não encontrado
      </h1>
      <p className="mt-3 text-muted-foreground">
        Verifique o endereço ou volte para a página inicial.
      </p>
      <div className="mt-6">
        <Link
          to="/"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Voltar para a home
        </Link>
      </div>
    </Container>
  );
}

function ArticleDetail() {
  const { article, related } = Route.useLoaderData();
  const typedArticle: Article = article;
  const typedRelated: Article[] = related;

  return (
    <article>
      <Container className="pt-10 pb-4 md:pt-14">
        <div className="mx-auto max-w-3xl text-center">
          <CategoryTag slug={article.category} className="justify-self-center" />
          <h1 className="mt-4 font-serif text-3xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {article.title}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground md:text-xl">
            {article.subtitle}
          </p>
          <div className="mt-6 flex justify-center">
            <Byline article={article} />
          </div>
        </div>
      </Container>

      <Container className="pb-10">
        <figure className="mx-auto max-w-4xl">
          <img
            src={article.coverImage}
            alt={article.coverImageAlt}
            loading="eager"
            decoding="async"
            className="aspect-[16/9] w-full object-cover"
          />
          <figcaption className="mt-2 text-xs text-muted-foreground">
            {article.coverImageAlt}
          </figcaption>
        </figure>
      </Container>

      <Container className="pb-12">
        <div className="mx-auto max-w-[72ch]">
          <ArticleBody content={article.content} />

          <div className="mt-10 flex flex-wrap gap-2">
            {typedArticle.tags.map((t: string) => (
              <span
                key={t}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
              >
                #{t}
              </span>
            ))}
          </div>

          <div className="mt-10 rounded-md border border-border bg-muted/40 p-5">
            <p className="overline text-muted-foreground">Sobre o autor</p>
            <p className="mt-2 font-serif text-lg font-semibold text-foreground">
              {article.author.name}
            </p>
            <p className="text-sm text-muted-foreground">{article.author.role}</p>
            <p className="mt-3 text-sm text-foreground">{article.author.bio}</p>
          </div>

          <div className="mt-8">
            <ShareBar
              title={article.title}
              path={`/artigo/${article.slug}`}
            />
          </div>
        </div>
      </Container>

      {typedRelated.length > 0 && (
        <Container className="py-12">
          <h2 className="mb-6 border-b border-border pb-3 font-serif text-2xl font-semibold">
            Leia também
          </h2>
          <div className="grid gap-x-8 gap-y-10 md:grid-cols-3">
            {typedRelated.map((a: Article) => (
              <ArticleCard key={a.id} article={a} size="sm" />
            ))}
          </div>
        </Container>
      )}

      <NewsletterCTA />
    </article>
  );
}