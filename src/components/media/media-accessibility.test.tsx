import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";

import { AdSlot } from "@/components/ads/AdSlot";
import { SponsoredDisclosure } from "@/components/editorial/SponsoredDisclosure";
import { SourceList } from "@/components/editorial/SourceList";
import { DemoContentNotice } from "@/components/layout/DemoContentNotice";
import { EditorialImage, EditorialImageFallback } from "@/components/media/EditorialImage";
import { EditorialBreadcrumb } from "@/components/navigation/EditorialBreadcrumb";
import { NewsletterCTA } from "@/components/newsletter/NewsletterCTA";
import { TableHead } from "@/components/ui/table";
import { editorialImageSchema } from "@/content/schema";

const image = editorialImageSchema.parse({
  src: "/images/social/sul-global-editorial-placeholder.svg",
  alt: "Cartão editorial Sul Global",
  width: 1200,
  height: 630,
});

describe("mídia e acessibilidade", () => {
  test("imagem editorial exige alt", () => {
    expect(() => editorialImageSchema.parse({ src: "/imagem.jpg", alt: "" })).toThrow();
  });

  test("imagem decorativa aceita alt vazio", () => {
    expect(
      editorialImageSchema.parse({ src: "/decoracao.svg", alt: "", decorative: true }).alt,
    ).toBe("");
  });

  test("imagem preserva dimensões, sizes e lazy loading", () => {
    const html = renderToStaticMarkup(<EditorialImage image={image} sizes="50vw" />);
    expect(html).toContain('width="1200"');
    expect(html).toContain('height="630"');
    expect(html).toContain('sizes="50vw"');
    expect(html).toContain('loading="lazy"');
  });

  test("breadcrumb usa nav, lista ordenada e página atual", () => {
    const html = renderToStaticMarkup(<EditorialBreadcrumb items={[]} current="Matéria atual" />);
    expect(html).toContain('<nav aria-label="Navegação estrutural"');
    expect(html).toContain("<ol");
    expect(html).toContain('aria-current="page"');
  });

  test("menu móvel declara diálogo modal e gestão de foco", () => {
    const source = readFileSync(new URL("../navigation/MobileMenu.tsx", import.meta.url), "utf8");
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain("closeButtonRef.current?.focus()");
    expect(source).toContain('e.key !== "Tab"');
  });

  test("formulário de newsletter possui label associado", () => {
    const html = renderToStaticMarkup(<NewsletterCTA />);
    expect(html).toContain('for="newsletter-email"');
    expect(html).toContain('id="newsletter-email"');
  });

  test("home possui um único heading principal", () => {
    const source = readFileSync(new URL("../home/HeroStory.tsx", import.meta.url), "utf8");
    expect(source.match(/<h1\b/g)).toHaveLength(1);
  });

  test("célula de cabeçalho editorial usa th", () => {
    expect(renderToStaticMarkup(<TableHead>Energia</TableHead>)).toStartWith("<th");
  });

  test("conteúdo patrocinado possui disclosure perceptível", () => {
    const html = renderToStaticMarkup(<SponsoredDisclosure sponsorName="Empresa identificada" />);
    expect(html).toContain('aria-label="Conteúdo patrocinado"');
    expect(html).toContain("Empresa identificada");
  });

  test("aviso demo é anunciado como status", () => {
    const html = renderToStaticMarkup(<DemoContentNotice visible />);
    expect(html).toContain('role="status"');
    expect(html).toContain("conteúdo editorial exibido é fictício");
  });

  test("fallback de imagem informa a indisponibilidade", () => {
    const html = renderToStaticMarkup(<EditorialImageFallback image={image} />);
    expect(html).toContain('role="img"');
    expect(html).toContain("Imagem indisponível");
  });

  test("links externos usam proteção contra opener", () => {
    const html = renderToStaticMarkup(<SourceList urls={["https://www.gov.br/mme/pt-br"]} />);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  test("slot publicitário desativado não reserva espaço visível", () => {
    const html = renderToStaticMarkup(
      <AdSlot slot={{ name: "article-end", position: "article-end", minHeight: 250 }} />,
    );
    expect(html).toBe("");
  });
});
