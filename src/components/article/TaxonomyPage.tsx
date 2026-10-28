import { Container } from "../layout/Container";
import { ArticleCard } from "./ArticleCard";
import { EditorialBreadcrumb } from "../navigation/EditorialBreadcrumb";
import type { LocalizedTopic } from "../../content/taxonomy-topics";
/** Shared language-specific category/tag view; drafts are excluded by its loader. */
export function TaxonomyPage({ topic }: { topic: LocalizedTopic }) {
  const en = topic.locale === "en",
    es = topic.locale === "es";
  const home = en ? "Home" : es ? "Inicio" : "Início";
  const kind =
    topic.term.kind === "category" ? (en ? "Category" : "Categoria") : en ? "Topic" : "Tema";
  return (
    <Container className="py-12">
      <header className="mb-10 border-b border-border pb-8">
        <EditorialBreadcrumb
          items={[
            {
              label: home,
              content: <a href={topic.locale === "pt-BR" ? "/" : `/${topic.locale}`}>{home}</a>,
            },
          ]}
          current={topic.label}
        />
        <span className="overline text-primary">{kind}</span>
        <h1 className="mt-2 break-words font-serif text-4xl font-bold tracking-tight md:text-5xl">
          {topic.label}
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground md:text-lg">{topic.description}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          {topic.articles.length}{" "}
          {en ? "published articles" : es ? "artículos publicados" : "artigos publicados"}
        </p>
      </header>
      {topic.articles.length ? (
        <div className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
          {topic.articles.map((a, i) => (
            <ArticleCard key={a.id} article={a} eager={i < 3} />
          ))}
        </div>
      ) : (
        <p role="status">
          {en
            ? "No articles published in this category yet."
            : es
              ? "Todavía no hay artículos publicados en esta categoría."
              : "Nenhum artigo publicado nesta categoria ainda."}
        </p>
      )}
    </Container>
  );
}
