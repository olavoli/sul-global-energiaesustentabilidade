import type { Article } from "@/types/content";
import { ArticleCard } from "@/components/article/ArticleCard";

export function SecondaryHighlights({ articles }: { articles: Article[] }) {
  if (articles.length === 0) return null;
  return (
    <section
      aria-label="Destaques secundários"
      className="grid gap-8 border-b border-border py-10 md:grid-cols-2 md:gap-10"
    >
      {articles.slice(0, 2).map((a) => (
        <ArticleCard key={a.id} article={a} size="lg" />
      ))}
    </section>
  );
}
