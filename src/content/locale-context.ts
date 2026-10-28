import { createContext, useContext } from "react";
import type { ContentLocale } from "./translation-schema";
export const EditorialLocaleContext = createContext<ContentLocale>("pt-BR");
export const useEditorialLocale = () => useContext(EditorialLocaleContext);
export const articleUi = {
  "pt-BR": {
    home: "Início",
    editionLanguage: "Publicado em português brasileiro.",
    originalRss: "RSS",
    points: "Pontos-chave",
    transparency: "Nota de Transparência",
    by: "Por",
    reading: "min de leitura",
    source: "Fonte",
    author: "Sobre o autor",
    related: "Continue aprendendo",
  },
  en: {
    home: "Home",
    editionLanguage: "English edition.",
    originalRss: "RSS (Portuguese)",
    points: "Key takeaways",
    transparency: "Transparency note",
    by: "By",
    reading: "min read",
    source: "Source",
    author: "About the author",
    related: "Keep learning",
  },
  es: {
    home: "Inicio",
    editionLanguage: "Edición en español.",
    originalRss: "RSS (portugués)",
    points: "Puntos clave",
    transparency: "Nota de transparencia",
    by: "Por",
    reading: "min de lectura",
    source: "Fuente",
    author: "Sobre el autor",
    related: "Siga aprendiendo",
  },
};

/** Supplied only by isolated presentation harnesses, never by the public router. */
export const LanguageNavigationContext = createContext<
  { locale: ContentLocale; href: string; fallback: boolean }[] | undefined
>(undefined);
