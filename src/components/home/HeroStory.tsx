import { Link } from "@tanstack/react-router";
import type { Article } from "@/types/content";
import { CategoryTag } from "@/components/article/CategoryTag";
import { Byline } from "@/components/article/Byline";
import { EditorialImage } from "@/components/media/EditorialImage";

export function HeroStory({ article }: { article: Article }) {
  return (
    <article className="grid gap-8 border-b border-border pb-12 md:grid-cols-12 md:gap-10">
      <Link
        to="/artigo/$slug"
        params={{ slug: article.slug }}
        className="block overflow-hidden bg-muted md:col-span-7"
        aria-label={article.title}
      >
        <EditorialImage
          image={article.cover}
          priority
          aspectRatio={16 / 10}
          sizes="(min-width: 768px) 58vw, 100vw"
        />
      </Link>
      <div className="flex flex-col justify-center gap-4 md:col-span-5">
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
