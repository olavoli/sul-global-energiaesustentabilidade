import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Container } from "@/components/layout/Container";
import { ArticleCard } from "@/components/article/ArticleCard";
import { EditorialBreadcrumb } from "@/components/navigation/EditorialBreadcrumb";
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
  return (
    <Container className="py-12">
      <header className="mb-10 border-b border-border pb-8">
        <EditorialBreadcrumb
          items={[{ label: "Início", content: <Link to="/">Início</Link> }]}
          current={topic.name}
        />
        <span className="overline text-primary">Tema</span>
        <h1 className="mt-2 break-words font-serif text-4xl font-bold tracking-tight md:text-5xl">
          {topic.name}
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground md:text-lg">
          {topic.articles.length}{" "}
          {topic.articles.length === 1 ? "artigo publicado" : "artigos publicados"}
          {" sobre este tema."}
        </p>
      </header>
      <div className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
        {topic.articles.map((article, index) => (
          <ArticleCard key={article.slug} article={article} eager={index < 3} />
        ))}
      </div>
    </Container>
  );
}
