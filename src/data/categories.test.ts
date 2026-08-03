import { describe, expect, test } from "bun:test";

import { primaryNav } from "@/components/navigation/nav-items";
import { getCategory, searchCategories } from "./categories";

describe("categoria Funcional", () => {
  test("está disponível na taxonomia editorial", () => {
    expect(getCategory("funcional")).toEqual({
      slug: "funcional",
      name: "Funcional",
      description:
        "Saberes populares, técnicas tradicionais e soluções práticas analisadas com contexto, respeito cultural e olhar técnico.",
    });
  });

  test("mantém as seis categorias na ordem da navegação principal", () => {
    expect(primaryNav.slice(0, 6).map((item) => item.label)).toEqual([
      "Energia",
      "Ciência",
      "Transição Energética",
      "Sustentabilidade",
      "Funcional",
      "Tecnologia",
    ]);
  });

  test("é encontrada por nome e descrição", () => {
    expect(searchCategories("funcional").map(({ slug }) => slug)).toContain("funcional");
    expect(searchCategories("saberes populares").map(({ slug }) => slug)).toContain("funcional");
  });
});
