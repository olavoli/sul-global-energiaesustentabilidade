import { siteConfig } from "@/config/site";
import { getPublicAuthors } from "@/data/authors";
import { categories } from "@/data/categories";
import { resolveCanonical } from "@/lib/seo";
import type { Article } from "@/types/content";

const XML_HEADERS = { "content-type": "application/xml; charset=utf-8" };

function escapeXml(value: string): string {
  return value.replace(
    /[<>&'"]/g,
    (character) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        '"': "&quot;",
      })[character] ?? character,
  );
}

export function generateRobots(indexingEnabled = siteConfig.indexingEnabled): string {
  return [
    "User-agent: *",
    indexingEnabled ? "Allow: /" : "Disallow: /",
    `Sitemap: ${resolveCanonical("/sitemap.xml")}`,
    "",
  ].join("\n");
}

export function generateSitemap(articles: readonly Article[], publishable = true): string {
  const staticPaths = [
    "/",
    "/sobre",
    "/contato",
    "/newsletter",
    "/privacidade",
    "/termos",
    "/politica-editorial",
    "/metodologia",
  ];
  const paths = [
    ...(publishable ? staticPaths : []),
    ...(publishable ? categories.map((category) => `/categoria/${category.slug}`) : []),
    ...(publishable ? getPublicAuthors(false).map((author) => `/autor/${author.slug}`) : []),
    ...(publishable
      ? articles.map((article) => article.canonicalUrl ?? `/artigo/${article.slug}`)
      : []),
  ];
  const entries = paths.map(
    (path) => `  <url><loc>${escapeXml(resolveCanonical(path))}</loc></url>`,
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");
}

export function generateRss(articles: readonly Article[], publishable = true): string {
  const items = (publishable ? articles : []).map((article) => {
    const url = resolveCanonical(article.canonicalUrl ?? `/artigo/${article.slug}`);
    const disclosure =
      article.sponsored && article.sponsorName
        ? `Conteúdo patrocinado por ${article.sponsorName}. `
        : "";
    return [
      "    <item>",
      `      <title>${escapeXml(article.title)}</title>`,
      `      <link>${escapeXml(url)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
      `      <description>${escapeXml(disclosure + article.excerpt)}</description>`,
      `      <pubDate>${new Date(`${article.publishedAt}T12:00:00Z`).toUTCString()}</pubDate>`,
      "    </item>",
    ].join("\n");
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0"><channel>',
    `  <title>${escapeXml(publishable ? siteConfig.name : `${siteConfig.name} — ambiente não oficial`)}</title>`,
    `  <link>${escapeXml(siteConfig.url)}</link>`,
    `  <description>${escapeXml(siteConfig.description)}</description>`,
    `  <language>${siteConfig.language}</language>`,
    ...items,
    "</channel></rss>",
    "",
  ].join("\n");
}

export function createDistributionResponse(
  pathname: string,
  articles: readonly Article[],
): Response | undefined {
  if (pathname === "/robots.txt")
    return new Response(generateRobots(), {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  if (pathname === "/sitemap.xml")
    return new Response(generateSitemap(articles, siteConfig.indexingEnabled), {
      headers: XML_HEADERS,
    });
  if (pathname === "/rss.xml")
    return new Response(generateRss(articles, siteConfig.indexingEnabled), {
      headers: { "content-type": "application/rss+xml; charset=utf-8" },
    });
  return undefined;
}
