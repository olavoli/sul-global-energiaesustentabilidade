import { Link } from "@tanstack/react-router";

const items = [
  { label: "Transição energética", to: "/categoria/$slug", params: { slug: "transicao-energetica" as const } },
  { label: "Hidrogênio", to: "/busca", search: { q: "hidrogênio" } },
  { label: "Energia solar", to: "/busca", search: { q: "solar" } },
  { label: "Política energética", to: "/categoria/$slug", params: { slug: "energia" as const } },
  { label: "Sul Global", to: "/busca", search: { q: "sul global" } },
];

export function InPauta() {
  return (
    <section
      aria-label="Em pauta"
      className="border-b border-border py-8"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="overline text-muted-foreground">Em pauta</span>
        <div className="flex flex-wrap gap-2">
          {items.map((item) => {
            if ("params" in item && item.params) {
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  params={item.params}
                  className="rounded-full border border-border px-3 py-1 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {item.label}
                </Link>
              );
            }
            return (
              <Link
                key={item.label}
                to="/busca"
                search={item.search}
                className="rounded-full border border-border px-3 py-1 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}