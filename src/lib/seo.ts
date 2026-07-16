import { absoluteSiteUrl, siteConfig } from "@/config/site";
import type { Article, Author, Category } from "@/types/content";

export const SEARCH_ROBOTS = "noindex, follow";

export function resolveCanonical(pathOrUrl: string, baseUrl = siteConfig.url): string {
  return absoluteSiteUrl(pathOrUrl, baseUrl);
}

export function socialMeta({
  title,
  description,
  path,
  type = "website",
  image = siteConfig.socialImage,
  imageAlt = siteConfig.socialImageAlt,
  imageWidth,
  imageHeight,
}: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article" | "profile";
  image?: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
}) {
  const url = resolveCanonical(path);
  const resolvedImage = resolveCanonical(image);
  return [
    { property: "og:site_name", content: siteConfig.name },
    { property: "og:locale", content: siteConfig.locale },
    { property: "og:type", content: type },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:image", content: resolvedImage },
    { property: "og:image:alt", content: imageAlt },
    ...(imageWidth && imageHeight
      ? [
          { property: "og:image:width", content: String(imageWidth) },
          { property: "og:image:height", content: String(imageHeight) },
        ]
      : image === siteConfig.socialImage
        ? [
            { property: "og:image:width", content: String(siteConfig.socialImageWidth) },
            { property: "og:image:height", content: String(siteConfig.socialImageHeight) },
          ]
        : []),
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: resolvedImage },
    { name: "twitter:image:alt", content: imageAlt },
  ];
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: resolveCanonical(item.path),
    })),
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteConfig.url}/#organization`,
    name: siteConfig.name,
    url: siteConfig.url,
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteConfig.url}/#website`,
    name: siteConfig.name,
    url: siteConfig.url,
    inLanguage: siteConfig.language,
    publisher: { "@id": `${siteConfig.url}/#organization` },
  };
}

export function articleJsonLd(article: Article) {
  const canonical = resolveCanonical(article.canonicalUrl ?? `/artigo/${article.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": article.contentType === "news" ? "NewsArticle" : "Article",
    headline: article.title,
    description: article.seoDescription ?? article.excerpt,
    image: [resolveCanonical(article.cover.src)],
    datePublished: article.publishedAt,
    dateModified: article.updatedAt ?? article.publishedAt,
    mainEntityOfPage: canonical,
    inLanguage: siteConfig.language,
    author: {
      "@type": "Person",
      name: article.author.displayName,
      url: resolveCanonical(`/autor/${article.author.slug}`),
    },
    publisher: { "@id": `${siteConfig.url}/#organization` },
    isAccessibleForFree: !article.sponsored,
  };
}

export function personJsonLd(author: Author) {
  const sameAs = Object.values(author.socialLinks);
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.displayName,
    description: author.shortBio,
    jobTitle: author.role,
    url: resolveCanonical(`/autor/${author.slug}`),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

export function categoryBreadcrumb(category: Category) {
  return breadcrumbJsonLd([
    { name: "Início", path: "/" },
    { name: category.name, path: `/categoria/${category.slug}` },
  ]);
}
