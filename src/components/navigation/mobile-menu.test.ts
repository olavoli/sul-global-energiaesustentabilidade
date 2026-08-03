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
  });
});
