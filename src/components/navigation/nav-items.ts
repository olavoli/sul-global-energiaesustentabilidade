import type { CategorySlug } from "@/types/content";

export interface NavItem {
  label: string;
  to: string;
  params?: { slug: CategorySlug };
}

export const primaryNav: NavItem[] = [
  { label: "Energia", to: "/categoria/$slug", params: { slug: "energia" } },
  {
    label: "Transição Energética",
    to: "/categoria/$slug",
    params: { slug: "transicao-energetica" },
  },
  {
    label: "Sustentabilidade",
    to: "/categoria/$slug",
    params: { slug: "sustentabilidade" },
  },
  { label: "Funcional", to: "/categoria/$slug", params: { slug: "funcional" } },
  { label: "Tecnologia", to: "/categoria/$slug", params: { slug: "tecnologia" } },
  { label: "Ciência", to: "/categoria/$slug", params: { slug: "ciencia" } },
  {
    label: "Desenvolvimento",
    to: "/categoria/$slug",
    params: { slug: "desenvolvimento" },
  },
];
