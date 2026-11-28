import type { TopicEntry } from "@/content/topic-entries";

const focus =
  "rounded-sm underline underline-offset-4 decoration-primary/40 hover:decoration-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary";

function Citations({ entry, sourceIds }: { entry: TopicEntry; sourceIds: string[] }) {
  return (
    <p className="mt-3 text-sm text-muted-foreground">
      Fontes:{" "}
      {sourceIds.map((id, index) => (
        <span key={id}>
          {index > 0 && ", "}
          <a
            className={focus}
            href={"#fonte-" + id}
            aria-label={
              "Consultar referência " + (entry.sources.findIndex((source) => source.id === id) + 1)
            }
          >
            [{entry.sources.findIndex((source) => source.id === id) + 1}]
          </a>
        </span>
      ))}
    </p>
  );
}
function EntryNavigation({ entry }: { entry: TopicEntry }) {
  return (
    <nav aria-label="Seções do verbete">
      <ol className="space-y-3 text-sm">
        <li>
          <a className={focus} href="#definicao">
            {entry.definition.title}
          </a>
        </li>

        {entry.sections.map((section) => (
          <li key={section.id}>
            <a className={focus} href={"#" + section.id}>
              {section.title}
            </a>
          </li>
        ))}
        <li>
          <a className={focus} href="#fontes">
            Fontes e referências
          </a>
        </li>
        <li>
          <a className={focus} href="#artigos-relacionados">
            Artigos relacionados
          </a>
        </li>
      </ol>
    </nav>
  );
}
export function TopicEntryContent({ entry }: { entry: TopicEntry }) {
  const checkedAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(entry.sourceCheckedAt + "T00:00:00Z"),
  );
  return (
    <div className="grid gap-8 border-b border-border pb-10 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-x-14">
      <aside
        aria-label="Guia de leitura"
        className="hidden min-w-0 lg:col-start-2 lg:row-start-1 lg:block"
      >
        <div className="hidden rounded-lg border border-border bg-muted/30 p-5 lg:sticky lg:top-32 lg:block">
          <p className="overline mb-4 text-primary">Neste verbete</p>
          <EntryNavigation entry={entry} />
          <p className="mt-5 border-t border-border pt-4 text-sm leading-relaxed text-muted-foreground">
            {entry.readingNote ??
              "Rota de produção, emissões e viabilidade econômica são avaliações diferentes."}
          </p>
        </div>
      </aside>
      <div className="min-w-0 space-y-9 lg:col-start-1 lg:row-start-1">
        <section
          id="definicao"
          aria-labelledby="definicao-title"
          className="scroll-mt-32 border-l-4 border-primary bg-primary/5 py-5 pl-5 pr-4 md:pl-6"
        >
          <p className="overline mb-2 text-primary">Definição científica</p>
          <h2
            id="definicao-title"
            className="font-serif text-3xl font-semibold leading-tight md:text-4xl"
          >
            {entry.definition.title}
          </h2>
          <div className="mt-4 max-w-[65ch] space-y-4 text-lg leading-relaxed">
            {entry.definition.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <Citations entry={entry} sourceIds={entry.definition.sourceIds} />
        </section>
        <details className="rounded-lg border border-border bg-muted/30 p-4 lg:hidden">
          <summary className="cursor-pointer rounded-sm text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
            Neste verbete — navegar pelas seções
          </summary>
          <div className="pt-4">
            <EntryNavigation entry={entry} />
          </div>
        </details>
        {entry.sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            aria-labelledby={section.id + "-title"}
            className={
              section.kind === "example"
                ? "scroll-mt-32 rounded-lg border border-border bg-muted/25 p-5 md:p-6"
                : "scroll-mt-32"
            }
          >
            <h2
              id={section.id + "-title"}
              className="font-serif text-2xl font-semibold tracking-tight md:text-3xl"
            >
              {section.title}
            </h2>
            <div className="mt-3 max-w-[68ch] space-y-4 text-base leading-relaxed text-foreground/90 md:text-lg">
              {section.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
            <Citations entry={entry} sourceIds={section.sourceIds} />
          </section>
        ))}
        <section id="fontes" aria-labelledby="fontes-title" className="scroll-mt-32">
          <h2 id="fontes-title" className="font-serif text-2xl font-semibold">
            Fontes e referências
          </h2>
          <ol className="mt-4 list-decimal space-y-4 pl-5 text-sm leading-relaxed text-muted-foreground">
            {entry.sources.map((source) => (
              <li key={source.id} id={"fonte-" + source.id} className="scroll-mt-32 pl-1">
                <a className={focus} href={source.url}>
                  {source.citation}
                </a>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Fontes consultadas em {checkedAt}.{" "}
            {entry.editorialReviewedAt
              ? "Revisão editorial aprovada em " +
                new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "UTC" }).format(
                  new Date(entry.editorialReviewedAt + "T00:00:00Z"),
                ) +
                "."
              : "Revisão editorial formal pendente; nenhuma aprovação científica humana foi registrada."}
          </p>
        </section>
      </div>
    </div>
  );
}
