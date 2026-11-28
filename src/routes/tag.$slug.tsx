import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Container } from "@/components/layout/Container";
import { ArticleCard } from "@/components/article/ArticleCard";
import { EditorialBreadcrumb } from "@/components/navigation/EditorialBreadcrumb";
import { getTopicEntry } from "@/content/topic-entries";
import { TopicEntryContent } from "@/components/article/TopicEntryContent";
import { getTagTopic } from "@/content/tags";
import { tagPageHead } from "@/lib/tag-seo";

export const Route = createFileRoute("/tag/$slug")({
  loader: ({ params }) => {
    const topic = getTagTopic(params.slug);
    if (!topic) throw notFound();
    return topic;
  },
  head: ({ loaderData }) => tagPageHead(loaderData),
  notFoundComponent: () => (
    <Container className="py-24 text-center">
      <h1 className="font-serif text-4xl font-bold">Tema não encontrado</h1>
      <Link to="/" className="mt-6 inline-block underline">
        Voltar para a página inicial
      </Link>
    </Container>
  ),
  component: TagPage,
});

function TagPage() {
  const topic = Route.useLoaderData();
  const entry = getTopicEntry(topic.slug);
  return (
    <Container className="py-12">
      <header
        className={entry ? "mb-6 border-b border-border pb-6" : "mb-10 border-b border-border pb-8"}
      >
        <EditorialBreadcrumb
          items={[{ label: "Início", content: <Link to="/">Início</Link> }]}
          current={topic.name}
        />
        <span className="overline text-primary">
          {entry ? "Verbetes · " + entry.editorialClassification : "Tema"}
        </span>
        <h1 className="mt-2 break-words font-serif text-4xl font-bold tracking-tight md:text-5xl">
          {entry?.title ?? topic.name}
        </h1>
        {entry && (
          <>
            <p className="mt-3 max-w-3xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              {entry.subtitle}
            </p>
            {entry.status === "prototype" && (
              <p className="mt-3 inline-block rounded border border-border bg-muted px-3 py-1 text-xs font-medium">
                Protótipo local · aguardando revisão e aprovação editorial
              </p>
            )}
          </>
        )}
        <p className="mt-3 max-w-2xl text-muted-foreground md:text-lg">
          {topic.articles.length}{" "}
          {topic.articles.length === 1 ? "artigo publicado" : "artigos publicados"}
          {" sobre este tema."}
        </p>
      </header>
      {entry && (
        <>
          <TopicEntryContent entry={entry} />
          <h2
            id="artigos-relacionados"
            className="mb-8 mt-12 scroll-mt-32 font-serif text-3xl font-semibold"
          >
            Artigos relacionados
          </h2>
        </>
      )}
      <div className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
        {topic.articles.map((article, index) => (
          <ArticleCard key={article.slug} article={article} eager={index < 3} />
        ))}
      </div>
    </Container>
  );
}
