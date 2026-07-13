import { createFileRoute } from "@tanstack/react-router";

import { Container } from "@/components/layout/Container";
import { HeroStory } from "@/components/home/HeroStory";
import { SecondaryHighlights } from "@/components/home/SecondaryHighlights";
import { InPauta } from "@/components/home/InPauta";
import { SectionTitle } from "@/components/home/SectionTitle";
import { ArticleCard } from "@/components/article/ArticleCard";
import { NewsletterCTA } from "@/components/newsletter/NewsletterCTA";
import { getFeaturedArticles, getLatestArticles, getPublishedArticles } from "@/data/articles";
import { categories } from "@/data/categories";
import type { CategorySlug } from "@/types/content";
import { siteConfig } from "@/config/site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${siteConfig.name} — Portal editorial de energia e transição` },
      {
        name: "description",
        content: siteConfig.description,
      },
      {
        property: "og:title",
        content: `${siteConfig.name} — Portal editorial de energia e transição`,
      },
      {
        property: "og:description",
        content: siteConfig.description,
      },
    ],
  }),
  component: Index,
});

function Index() {
  const featured = getFeaturedArticles();
  const latest = getLatestArticles(12);
  const hero = featured[0] ?? latest[0];
  const secondary = latest.filter((a) => a.slug !== hero?.slug).slice(0, 2);
  const rest = latest.filter((a) => a.slug !== hero?.slug && !secondary.includes(a));

  if (!hero) {
    return (
      <Container className="py-20 text-center">
        <p className="text-muted-foreground">Nenhum artigo publicado ainda.</p>
      </Container>
    );
  }

  const published = getPublishedArticles();
  const byCategory = (slug: CategorySlug) =>
    published.filter((a) => a.category === slug).slice(0, 3);

  return (
    <>
      <Container className="pt-8 md:pt-12">
        <HeroStory article={hero} />
        <SecondaryHighlights articles={secondary} />
        <InPauta />
      </Container>

      <Container className="py-12">
        <SectionTitle label="Mais recentes" />
        <div className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
          {rest.slice(0, 6).map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      </Container>

      <NewsletterCTA />

      {categories.slice(0, 3).map((cat) => {
        const list = byCategory(cat.slug);
        if (list.length === 0) return null;
        return (
          <Container key={cat.slug} className="py-12">
            <SectionTitle label={cat.name} categorySlug={cat.slug} />
            <div className="grid gap-x-8 gap-y-10 md:grid-cols-3">
              {list.map((a) => (
                <ArticleCard key={a.id} article={a} size="sm" />
              ))}
            </div>
          </Container>
        );
      })}
    </>
  );
}
