import type { Category } from "@/types/content";

export const categories: Category[] = [
  {
    slug: "energia",
    name: "Energia",
    description: "Mercado, infraestrutura e regulação do setor elétrico brasileiro e global.",
  },
  {
    slug: "sustentabilidade",
    name: "Sustentabilidade",
    description: "Clima, biodiversidade e o custo real da economia de baixo carbono.",
  },
  {
    slug: "ciencia",
    name: "Ciência",
    description:
      "Pesquisa aplicada, publicações revisadas por pares e novas fronteiras da física da energia.",
  },
  {
    slug: "tecnologia",
    name: "Tecnologia",
    description: "Hardware, software e engenharia por trás da transição energética.",
  },
  {
    slug: "desenvolvimento",
    name: "Desenvolvimento",
    description: "Políticas públicas, financiamento e crescimento econômico com energia limpa.",
  },
  {
    slug: "transicao-energetica",
    name: "Transição Energética",
    description:
      "A geopolítica, o capital e a engenharia da mudança para uma matriz de baixo carbono.",
  },
];

export function getCategory(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
