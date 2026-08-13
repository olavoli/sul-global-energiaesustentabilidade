import { Link } from "@tanstack/react-router";
import type { Article } from "@/types/content";
import { CategoryTag } from "@/components/article/CategoryTag";
import { Byline } from "@/components/article/Byline";
import { EditorialImage } from "@/components/media/EditorialImage";

export function HeroStory({ article }: { article: Article }) {
  return (
    <article className="grid gap-8 border-b border-border pb-12 md:grid-cols-[minmax(0,45fr)_minmax(0,55fr)] md:gap-10">
      <Link
        to="/artigo/$slug"
        params={{ slug: article.slug }}
        className="block overflow-hidden bg-muted md:self-center"
        aria-label={article.title}
      >
        <EditorialImage
          image={article.cover}
          priority
          aspectRatio={16 / 10}
          sizes="(min-width: 768px) 45vw, 100vw"
        />
      </Link>
      <div className="flex flex-col justify-center gap-4">
        <CategoryTag slug={article.category} />
        <h1 className="font-serif text-3xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-4xl md:text-5xl">
          <Link to="/artigo/$slug" params={{ slug: article.slug }} className="hover:underline">
            {article.title}
          </Link>
        </h1>
        <p className="text-base text-muted-foreground md:text-lg">{article.subtitle}</p>
        <Byline article={article} />
      </div>
    </article>
  );
}
