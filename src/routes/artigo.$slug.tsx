import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { Container } from "@/components/layout/Container";
import { CategoryTag } from "@/components/article/CategoryTag";
import { Byline } from "@/components/article/Byline";
import { ArticleBody } from "@/components/article/ArticleBody";
import { SourceList } from "@/components/editorial/SourceList";
import { AiEditorialCredit } from "@/components/editorial/AiEditorialCredit";
import { ShareBar } from "@/components/article/ShareBar";
import { ArticleCard } from "@/components/article/ArticleCard";
import { NewsletterCTA } from "@/components/newsletter/NewsletterCTA";
import { EditorialImage } from "@/components/media/EditorialImage";
import { EditorialBreadcrumb } from "@/components/navigation/EditorialBreadcrumb";
import { SponsoredDisclosure } from "@/components/editorial/SponsoredDisclosure";
import { EditorialHistory } from "@/components/editorial/EditorialHistory";
import { DemoContentNotice } from "@/components/layout/DemoContentNotice";
import { getArticleBySlug, getRelatedArticles } from "@/content/repository";
import type { Article } from "@/types/content";
import { articleJsonLd, breadcrumbJsonLd, resolveCanonical, socialMeta } from "@/lib/seo";

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
    const canonical = resolveCanonical(article.canonicalUrl ?? `/artigo/${article.slug}`);
    const title = article.seoTitle ?? article.title;
    const description = article.seoDescription ?? article.excerpt;
    return {
      meta: [
        { title: `${title} — Sul Global` },
        { name: "description", content: description },
        { name: "author", content: article.author.displayName },
        { property: "article:published_time", content: article.publishedAt },
        ...(article.updatedAt
          ? [{ property: "article:modified_time", content: article.updatedAt }]
          : []),
        ...socialMeta({
          title,
          description,
          path: canonical,
          type: "article",
          image: article.cover.src,
          imageAlt: article.cover.alt,
          imageWidth: article.cover.width,
          imageHeight: article.cover.height,
        }),
      ],
      links: [{ rel: "canonical", href: canonical }],
      scripts: [
        articleJsonLd(article),
        breadcrumbJsonLd([
          { name: "Início", path: "/" },
          { name: article.title, path: canonical },
        ]),
      ].map((value) => ({ type: "application/ld+json", children: JSON.stringify(value) })),
    };
  },
  notFoundComponent: ArticleNotFound,
  component: ArticleDetail,
});

function ArticleNotFound() {
  return (
    <Container className="py-24 text-center">
      <span className="overline text-muted-foreground">404 — Artigo</span>
      <h1 className="mt-3 font-serif text-4xl font-bold">Artigo não encontrado</h1>
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
      <DemoContentNotice visible={article.isDemo} />
      <Container className="pt-10 pb-4 md:pt-14">
        <div className="mx-auto max-w-3xl text-center">
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
            current={article.title}
          />
          <CategoryTag slug={article.category} className="justify-self-center" />
          <h1 className="mt-4 font-serif text-3xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-4xl md:text-5xl">
            {article.title}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground md:text-xl">{article.subtitle}</p>
          <div className="mt-6 flex justify-center">
            <Byline article={article} />
          </div>
        </div>
      </Container>

      <Container className="pb-10">
        <figure className="mx-auto max-w-4xl">
          <EditorialImage
            image={article.cover}
            priority
            aspectRatio={16 / 9}
            sizes="(min-width: 1280px) 896px, (min-width: 768px) calc(100vw - 96px), calc(100vw - 32px)"
          />
          {(article.cover.caption || article.cover.credit) && (
            <figcaption className="mt-2 text-xs text-muted-foreground">
              {article.cover.caption}
              {article.cover.caption && article.cover.credit ? " — " : ""}
              {article.cover.credit}
            </figcaption>
          )}
        </figure>
      </Container>

      <Container className="pb-12">
        <div className="mx-auto max-w-[72ch]">
          {article.sponsored && article.sponsorName && (
            <SponsoredDisclosure sponsorName={article.sponsorName} />
          )}

          <ArticleBody slug={article.slug} />

          {article.updatedAt && (
            <p className="mt-8 text-sm text-muted-foreground">
              Atualizado em {article.updatedAt}
              {article.lastVerifiedAt
                ? ` · Informações verificadas em ${article.lastVerifiedAt}`
                : ""}
              .
            </p>
          )}

          <EditorialHistory updateNote={article.updateNote} corrections={article.corrections} />

          <AiEditorialCredit
            assistance={article.aiAssistance}
            publicationDate={article.publishedAt ?? article.createdAt}
          />

          <SourceList sources={article.sources} urls={article.sourceUrls} />

          {article.opinionDisclosure && (
            <p className="mt-8 rounded-md border border-border p-4 text-sm">
              <strong>Transparência da opinião:</strong> {article.opinionDisclosure}
            </p>
          )}

          {article.aiDisclosure && (
            <p className="mt-4 text-sm text-muted-foreground">
              <strong>Uso de IA:</strong> {article.aiDisclosure}
            </p>
          )}

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
            <Link
              to="/autor/$slug"
              params={{ slug: article.author.slug }}
              className="mt-2 block font-serif text-lg font-semibold text-foreground hover:underline"
            >
              {article.author.displayName}
            </Link>
            <p className="text-sm text-muted-foreground">{article.author.role}</p>
            <p className="mt-3 text-sm text-foreground">{article.author.shortBio}</p>
          </div>

          <div className="mt-8">
            <ShareBar title={article.title} path={`/artigo/${article.slug}`} />
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
