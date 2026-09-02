import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { selectRelatedArticles } from "@/content/repository";
import { buildArticleShareUrls, copyArticleLink } from "./article-sharing";
import { ShareBar } from "./ShareBar";

type Candidate = {
  slug: string;
  category: "energia" | "ciencia";
  tags: string[];
  contentType: "analysis" | "explainer";
};

const current: Candidate = {
  slug: "artigo-atual",
  category: "energia",
  tags: ["rede", "solar"],
  contentType: "analysis",
};

const candidates: Candidate[] = [
  current,
  { slug: "z-rede", category: "energia", tags: ["rede"], contentType: "analysis" },
  { slug: "a-rede", category: "energia", tags: ["rede"], contentType: "analysis" },
  { slug: "solar", category: "energia", tags: ["solar"], contentType: "explainer" },
  { slug: "energia", category: "energia", tags: [], contentType: "explainer" },
  { slug: "sem-relacao", category: "ciencia", tags: [], contentType: "explainer" },
];

describe("navegação editorial de artigos", () => {
  test("relacionados não incluem autorreferência e respeitam o máximo de três", () => {
    const related = selectRelatedArticles(current, candidates, 20);
    expect(related).toHaveLength(3);
    expect(related.some(({ slug }) => slug === current.slug)).toBe(false);
  });

  test("seleção é determinística e não usa recência como desempate", () => {
    const first = selectRelatedArticles(current, candidates, 3).map(({ slug }) => slug);
    const second = selectRelatedArticles(current, [...candidates].reverse(), 3).map(
      ({ slug }) => slug,
    );
    expect(first).toEqual(["a-rede", "z-rede", "solar"]);
    expect(second).toEqual(first);
  });

  test("gera URLs nativas para WhatsApp e LinkedIn", () => {
    const urls = buildArticleShareUrls("Título do artigo", "https://example.com/artigo/teste");
    expect(urls.whatsapp).toBe(
      "https://wa.me/?text=T%C3%ADtulo%20do%20artigo%20https%3A%2F%2Fexample.com%2Fartigo%2Fteste",
    );
    expect(urls.linkedin).toBe(
      "https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fexample.com%2Fartigo%2Fteste",
    );
  });

  test("copiar link usa a área de transferência e o controle anuncia feedback", async () => {
    let copied = "";
    await copyArticleLink(
      { writeText: async (value) => void (copied = value) },
      "https://example.com/a",
    );
    expect(copied).toBe("https://example.com/a");

    const html = renderToStaticMarkup(<ShareBar title="Artigo" path="/artigo/artigo" />);
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Copiar link");
    expect(html).toContain("WhatsApp");
    expect(html).toContain("LinkedIn");
  });
});
