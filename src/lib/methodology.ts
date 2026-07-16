import { resolveCanonical, socialMeta } from "@/lib/seo";

export const methodologyTitle = "Metodologia editorial — Sul Global";
export const methodologyDescription =
  "Como o Sul Global escolhe pautas, diferencia formatos, verifica fontes e registra correções.";

export function methodologyHead() {
  return {
    meta: [
      { title: methodologyTitle },
      { name: "description", content: methodologyDescription },
      ...socialMeta({
        title: methodologyTitle,
        description: methodologyDescription,
        path: "/metodologia",
      }),
    ],
    links: [{ rel: "canonical", href: resolveCanonical("/metodologia") }],
  };
}
