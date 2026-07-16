import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { ArticleCard } from "@/components/article/ArticleCard";
import { Container } from "@/components/layout/Container";
import { getArticlesByAuthor } from "@/content/repository";
import { demoContentEnabled } from "@/config/editorial";
import { getPublicAuthor } from "@/data/authors";
import { breadcrumbJsonLd, personJsonLd, resolveCanonical, socialMeta } from "@/lib/seo";
import { EditorialBreadcrumb } from "@/components/navigation/EditorialBreadcrumb";

export const Route = createFileRoute("/autor/$slug")({
  loader: ({ params }) => {
    const author = getPublicAuthor(params.slug, demoContentEnabled);
    if (!author) throw notFound();
    return { author, articles: getArticlesByAuthor(author.slug) };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ name: "robots", content: "noindex, follow" }] };
    const { author } = loaderData;
    const path = `/autor/${author.slug}`;
    return {
      meta: [
        { title: `${author.displayName} — Sul Global` },
        { name: "description", content: author.shortBio },
        ...socialMeta({
          title: `${author.displayName} — Sul Global`,
          description: author.shortBio,
          path,
          type: "profile",
        }),
      ],
      links: [{ rel: "canonical", href: resolveCanonical(path) }],
      scripts: [
        personJsonLd(author),
        breadcrumbJsonLd([
          { name: "Início", path: "/" },
          { name: author.displayName, path },
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
          current={author.displayName}
        />
        <span className="overline text-primary">Autor</span>
        <h1 className="mt-2 font-serif text-4xl font-bold md:text-5xl">{author.displayName}</h1>
        {author.role ? (
          <p className="mt-2 font-medium text-muted-foreground">{author.role}</p>
        ) : null}
        <p className="mt-4 text-lg text-foreground">{author.shortBio}</p>
        {author.fullBio ? (
          <div className="mt-6 space-y-4 text-foreground">
            {author.fullBio.split("\n\n").map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        ) : null}
        {author.credentials.length > 0 ? (
          <section className="mt-6" aria-labelledby="author-credentials">
            <h2 id="author-credentials" className="font-serif text-xl font-semibold">
              Formação informada e confirmada
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {author.credentials.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}
        {author.expertise.length > 0 ? (
          <section className="mt-6" aria-labelledby="author-expertise">
            <h2 id="author-expertise" className="font-serif text-xl font-semibold">
              Áreas de interesse
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {author.expertise.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}
        {author.researchLines && author.researchLines.length > 0 ? (
          <section className="mt-6" aria-labelledby="author-research-lines">
            <h2 id="author-research-lines" className="font-serif text-xl font-semibold">
              Linhas de pesquisa
            </h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {author.researchLines.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}
        {author.mission ? (
          <section className="mt-6" aria-labelledby="author-mission">
            <h2 id="author-mission" className="font-serif text-xl font-semibold">
              Missão
            </h2>
            <p className="mt-2">{author.mission}</p>
          </section>
        ) : null}
        {Object.keys(author.socialLinks).length > 0 ? (
          <section className="mt-6" aria-labelledby="author-links">
            <h2 id="author-links" className="font-serif text-xl font-semibold">
              Links públicos
            </h2>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {Object.entries(author.socialLinks).map(([label, url]) => (
                <li key={label}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="underline">
                    {label.toUpperCase()}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {author.disclosure ? (
          <section className="mt-6" aria-labelledby="author-disclosure">
            <h2 id="author-disclosure" className="font-serif text-xl font-semibold">
              Conflitos de interesse
            </h2>
            <p className="mt-2">{author.disclosure}</p>
          </section>
        ) : null}
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
