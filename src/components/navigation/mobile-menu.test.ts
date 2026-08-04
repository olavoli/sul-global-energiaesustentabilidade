import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { mobileMenuReducer } from "./mobile-menu-state";
import { primaryNav } from "./nav-items";

describe("interação do menu móvel", () => {
  test("abre, fecha e reabre de forma repetível", () => {
    let open = false;
    open = mobileMenuReducer(open, "open");
    expect(open).toBe(true);
    open = mobileMenuReducer(open, "close");
    expect(open).toBe(false);
    open = mobileMenuReducer(open, "toggle");
    expect(open).toBe(true);
    open = mobileMenuReducer(open, "toggle");
    expect(open).toBe(false);
  });

  test("preserva exatamente as seis categorias principais", () => {
    expect(primaryNav.slice(0, 6).map(({ label }) => label)).toEqual([
      "Energia",
      "Ciência",
      "Transição Energética",
      "Sustentabilidade",
      "Funcional",
      "Tecnologia",
    ]);
  });

  test("mantém contratos de clique, escape, foco e bloqueio de scroll", () => {
    const menu = readFileSync(new URL("./MobileMenu.tsx", import.meta.url), "utf8");
    const header = readFileSync(new URL("../layout/SiteHeader.tsx", import.meta.url), "utf8");

    expect(header).toContain('type="button"');
    expect(header).toContain("aria-expanded={menuOpen}");
    expect(header).toContain('aria-controls="mobile-navigation-dialog"');
    expect(header).toContain("lg:hidden");
    expect(header).not.toContain("md:hidden");
    expect(menu).toContain('e.key === "Escape"');
    expect(menu).toContain('document.body.style.overflow = "hidden"');
    expect(menu).toContain("returnFocusTarget?.focus()");
    expect(menu).toContain("onClick={onClose}");
    expect(menu).toContain("closeButtonRef.current?.focus()");
  });

  test("renderiza um drawer modal portaled acima da aplicação", () => {
    const menu = readFileSync(new URL("./MobileMenu.tsx", import.meta.url), "utf8");

    expect(menu).toContain('import { createPortal } from "react-dom"');
    expect(menu).toContain("document.body");
    expect(menu).toContain('role="dialog"');
    expect(menu).toContain('aria-modal="true"');
    expect(menu).toContain('aria-labelledby="mobile-navigation-title"');
    expect(menu).toContain("fixed inset-0 z-[100]");
    expect(menu).toContain("h-dvh w-4/5 max-w-[360px]");
    expect(menu).toContain("slide-in-from-left");
    expect(menu).toContain("motion-reduce:animate-none");
  });

  test("backdrop fecha e seção institucional permanece completa", () => {
    const menu = readFileSync(new URL("./MobileMenu.tsx", import.meta.url), "utf8");

    expect(menu).toContain('aria-label="Fechar menu ao clicar fora"');
    expect(menu).toContain('aria-label="Fechar menu"');
    for (const label of [
      "Sobre",
      "Contato",
      "Busca",
      "Privacidade",
      "Termos",
      "Política editorial",
      "Metodologia",
    ]) {
      expect(menu).toContain(`["${label}",`);
    }
  });
});
