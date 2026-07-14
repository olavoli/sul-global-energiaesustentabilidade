import type { Author } from "@/types/content";

const authorList = [
  {
    slug: "ana-souza",
    name: "Ana Souza",
    role: "Editora de Transição Energética",
    bio: "Cobre políticas públicas de energia e clima. Formada em Engenharia de Energia.",
  },
  {
    slug: "bruno-carvalho",
    name: "Bruno Carvalho",
    role: "Repórter de Ciência",
    bio: "Escreve sobre pesquisa aplicada, materiais e fronteiras da física.",
  },
  {
    slug: "clara-mendes",
    name: "Clara Mendes",
    role: "Repórter de Tecnologia",
    bio: "Acompanha hardware, redes elétricas inteligentes e computação de larga escala.",
  },
  {
    slug: "diego-rocha",
    name: "Diego Rocha",
    role: "Analista de Sustentabilidade",
    bio: "Cobre biodiversidade, mercados de carbono e finanças verdes.",
  },
  {
    slug: "eduarda-lima",
    name: "Eduarda Lima",
    role: "Editora de Desenvolvimento",
    bio: "Escreve sobre economia, políticas públicas e o Sul Global.",
  },
] satisfies Author[];

export const authors: Record<string, Author> = Object.fromEntries(
  authorList.map((author) => [author.slug, author]),
);

export function getAuthor(slug: string): Author | undefined {
  return authors[slug];
}

export function getAuthors(): Author[] {
  return [...authorList];
}
