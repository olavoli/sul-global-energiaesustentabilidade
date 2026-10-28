import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterContextProvider,
} from "@tanstack/react-router";
import { SiteFooter } from "./SiteFooter";
import { EditorialLocaleContext } from "@/content/locale-context";
import { languageForPath } from "@/content/i18n";

function footer(path: string) {
  const router = createRouter({
    routeTree: createRootRoute(),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  return renderToStaticMarkup(
    <RouterContextProvider router={router}>
      <EditorialLocaleContext.Provider value={languageForPath(path)}>
        <SiteFooter />
      </EditorialLocaleContext.Provider>
    </RouterContextProvider>,
  );
}

test("Portuguese footer wording and existing RSS URL remain unchanged", () => {
  const html = footer("/artigo/o-que-e-potencia");
  expect(html).toContain('<footer lang="pt-BR"');
  expect(html).toContain('<p lang="pt-BR">Publicado em português brasileiro.</p>');
  expect(html).toContain('href="/rss.xml"');
  expect(html).not.toContain("English edition.");
  expect(html).not.toContain("Edición en español.");
});
for (const [locale, path, label, rss] of [
  ["en", "/en/article/o-que-e-potencia", "English edition.", "RSS (Portuguese)"],
  ["es", "/es/articulo/o-que-e-potencia", "Edición en español.", "RSS (portugués)"],
]) {
  test(`${locale}: SSR identifies the edition without claiming a draft is published`, () => {
    const html = footer(path);
    expect(html).toContain(`<p lang="${locale}">${label}</p>`);
    expect(html).not.toContain("Publicado em português brasileiro.");
    expect(html).not.toContain("Published in English");
    expect(html).not.toContain("Publicado en español");
    expect(html).toContain(rss);
    expect(html).toContain('href="/rss.xml"');
    expect(html).toContain('<footer lang="pt-BR"');
    expect(html).toContain("Jornalismo editorial brasileiro");
    expect(html).toContain('href="/privacidade"');
  });
}
