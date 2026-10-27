import { translationRecords } from "@/content/generated/translations";
import type { TranslationRecord } from "@/content/translation-schema";
import { publishedTranslations, articleAlternates } from "@/content/i18n";
import { translatedArticlePath, type TranslationLocale } from "@/content/translation-schema";
import { siteConfig } from "@/config/site";
import { getPublicAuthors } from "@/data/authors";
import { categories } from "@/data/categories";
import { resolveCanonical } from "@/lib/seo";
import { buildTagTopics } from "@/content/tags";
import { isCategoryIndexable } from "@/lib/category-seo";
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

export function generateSitemap(
  articles: readonly Article[],
  publishable = true,
  translations: readonly TranslationRecord[] = translationRecords,
): string {
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
    ...(publishable
      ? categories
          .filter((category) =>
            isCategoryIndexable(
              articles.filter((article) => article.category === category.slug).length,
            ),
          )
          .map((category) => `/categoria/${category.slug}`)
      : []),
    ...(publishable ? getPublicAuthors(false).map((author) => `/autor/${author.slug}`) : []),
    ...(publishable
      ? articles.map((article) => article.canonicalUrl ?? `/artigo/${article.slug}`)
      : []),
    ...(publishable
      ? buildTagTopics(articles)
          .filter((topic) => topic.indexable)
          .map((topic) => `/tag/${topic.slug}`)
      : []),
  ];
  const translated = publishable ? publishedTranslations(translations) : [];
  paths.push(...translated.map((article) => translatedArticlePath(article.locale, article.slug)));
  for (const locale of ["en", "es"] as const) {
    if (translated.filter((a) => a.locale === locale).length >= 2) paths.push(`/${locale}`);
  }
  const entries = paths.map((path) => {
    const original =
      articles.find((a) => (a.canonicalUrl ?? `/artigo/${a.slug}`) === path)?.slug ??
      translated.find((a) => a.canonicalUrl === path)?.translationOf;
    const alternates = original
      ? articleAlternates(original, translations)
          .map(
            (link) =>
              `<xhtml:link rel="alternate" hreflang="${link.hrefLang}" href="${escapeXml(link.href)}"/>`,
          )
          .join("")
      : "";
    return `  <url><loc>${escapeXml(resolveCanonical(path))}</loc>${alternates}</url>`;
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");
}

export function generateRss(
  articles: readonly Article[],
  publishable = true,
  language: "pt-BR" | TranslationLocale = "pt-BR",
): string {
  const channelPath = language === "pt-BR" ? "/" : `/${language}`;
  const channelTitle =
    language === "pt-BR"
      ? siteConfig.name
      : `${siteConfig.name} — ${language === "en" ? "English" : "Español"}`;
  const channelDescription =
    language === "pt-BR"
      ? siteConfig.description
      : language === "en"
        ? "Editorial analysis on energy, sustainability, science, and public policy."
        : "Análisis editorial sobre energía, sostenibilidad, ciencia y políticas públicas.";
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
    `  <title>${escapeXml(publishable ? channelTitle : `${channelTitle} — ambiente não oficial`)}</title>`,
    `  <link>${escapeXml(language === "pt-BR" ? siteConfig.url : resolveCanonical(channelPath))}</link>`,
    `  <description>${escapeXml(channelDescription)}</description>`,
    `  <language>${language === "pt-BR" ? siteConfig.language : language}</language>`,
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
  const languageFeed = pathname.match(/^\/(en|es)\/rss\.xml$/);
  if (languageFeed) {
    const locale = languageFeed[1] as TranslationLocale;
    return new Response(
      generateRss(
        publishedTranslations().filter((a) => a.locale === locale),
        siteConfig.indexingEnabled,
        locale,
      ),
      { headers: { "content-type": "application/rss+xml; charset=utf-8" } },
    );
  }
  if (pathname === "/rss.xml")
    return new Response(generateRss(articles, siteConfig.indexingEnabled), {
      headers: { "content-type": "application/rss+xml; charset=utf-8" },
    });
  return undefined;
}
