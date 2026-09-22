import { Link } from "@tanstack/react-router";
import { Instagram, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "./Container";
import { categories } from "@/data/categories";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-border bg-muted/40">
      <Container className="grid gap-10 py-14 md:grid-cols-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-foreground">
            Sul <span className="text-primary">Global</span>
          </h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Energia e Sustentabilidade
          </p>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Jornalismo editorial brasileiro sobre energia, transição, ciência e desenvolvimento —
            para leitores que precisam de rigor técnico, não manchete.
          </p>
        </div>

        <nav aria-label="Categorias">
          <h3 className="overline text-muted-foreground">Categorias</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link
                  to="/categoria/$slug"
                  params={{ slug: c.slug }}
                  className="text-foreground hover:underline"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Institucional">
          <h3 className="overline text-muted-foreground">Institucional</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link to="/sobre" className="text-foreground hover:underline">
                Sobre
              </Link>
            </li>
            <li>
              <Link to="/contato" className="text-foreground hover:underline">
                Contato
              </Link>
            </li>
            <li>
              <Link to="/busca" className="text-foreground hover:underline">
                Busca
              </Link>
            </li>
            <li>
              <Link to="/privacidade" className="text-foreground hover:underline">
                Privacidade
              </Link>
            </li>
            <li>
              <Link to="/termos" className="text-foreground hover:underline">
                Termos
              </Link>
            </li>
            <li>
              <Link to="/politica-editorial" className="text-foreground hover:underline">
                Política editorial
              </Link>
            </li>
            <li>
              <Link to="/metodologia" className="text-foreground hover:underline">
                Metodologia
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <h3 className="overline text-muted-foreground">Acompanhe</h3>
          <ul
            className="mt-4 flex flex-wrap gap-3 text-sm text-foreground"
            aria-label="Redes sociais e RSS"
          >
            <li>
              <Button asChild variant="outline" className="min-h-11 focus-visible:ring-2">
                <a
                  href="https://www.linkedin.com/company/sul-global-energia-e-sustentabilidade"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Linkedin aria-hidden="true" />
                  LinkedIn
                  <span className="sr-only"> (abre em nova aba)</span>
                </a>
              </Button>
            </li>
            <li>
              <Button asChild variant="outline" className="min-h-11 focus-visible:ring-2">
                <a
                  href="https://www.instagram.com/sulglobalenergia"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Instagram aria-hidden="true" />
                  Instagram
                  <span className="sr-only"> (abre em nova aba)</span>
                </a>
              </Button>
            </li>
            <li>
              <a
                href="/rss.xml"
                className="rounded border border-border px-2 py-1 text-foreground hover:underline"
              >
                RSS
              </a>
            </li>
          </ul>
        </div>
      </Container>
      <div className="border-t border-border">
        <Container className="flex flex-col items-start justify-between gap-2 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>© {year} Sul Global Energia e Sustentabilidade. Todos os direitos reservados.</p>
          <p>Publicado em português brasileiro.</p>
        </Container>
      </div>
    </footer>
  );
}
