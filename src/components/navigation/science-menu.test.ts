import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { articleRecords } from "@/content/generated/articles";

test("Ciência e Políticas Públicas compartilham somente o dropdown, com URLs independentes", () => {
  const menu = readFileSync("src/components/navigation/ScienceMenu.tsx", "utf8");
  expect(menu).toContain("DropdownMenuTrigger");
  expect(menu).toContain('slug: "ciencia"');
  expect(menu).toContain('slug: "politicas-publicas"');
  expect(menu).toContain("DropdownMenuItem asChild");
  for (const file of [
    "src/components/layout/SiteHeader.tsx",
    "src/components/navigation/MobileMenu.tsx",
  ])
    expect(readFileSync(file, "utf8")).toContain("<ScienceMenu");
});

test("bibliografia manual do ART-031 conserva os 22 números e não desativa outros artigos", () => {
  const source = readFileSync("content/articles/a-pandemia-salvou-o-sus.mdx", "utf8");
  expect(
    [...source.split("## Referências Bibliográficas")[1].matchAll(/^\[(\d+)\]/gm)].map((m) =>
      Number(m[1]),
    ),
  ).toEqual(Array.from({ length: 22 }, (_, i) => i + 1));
  expect(
    articleRecords
      .filter((article) => "referencesInBody" in article && article.referencesInBody)
      .map((article) => article.slug)
      .sort(),
  ).toEqual([
    "a-pandemia-salvou-o-sus",
    "agrivoltaica-e-possivel-colher-alimentos-e-eletricidade-na-mesma-terra",
  ]);
  expect(readFileSync("src/routes/artigo.$slug.tsx", "utf8")).toMatch(
    /!article\.referencesInBody\s*&&\s*\(?\s*<SourceList/,
  );
});
