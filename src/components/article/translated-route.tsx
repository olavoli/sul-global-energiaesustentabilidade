import { selectRelatedArticles } from "@/content/repository";
import { Link } from "@tanstack/react-router";
import { ArticleDetailView } from "@/routes/artigo.$slug";
import { searchTranslations, type TranslatedArticle } from "@/content/i18n";
import type { TranslationLocale } from "@/content/translation-schema";

export function TranslatedArticlePage({ article }: { article: TranslatedArticle }) {
  return (
    <ArticleDetailView
      article={article}
      related={selectRelatedArticles(article, searchTranslations(article.locale, ""), 3)}
      locale={article.locale}
    />
  );
}
export function TranslationNotFound({ locale }: { locale: TranslationLocale }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-20" lang={locale}>
      <h1>{locale === "en" ? "Translation not available" : "Traducción no disponible"}</h1>
      <p>
        {locale === "en"
          ? "This edition has not been published. Browse the available articles or the Portuguese portal."
          : "Esta edición no está publicada. Consulte los artículos disponibles o el portal en portugués."}
      </p>
      <Link to="/">Português</Link>
    </section>
  );
}
