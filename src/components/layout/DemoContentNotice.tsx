import { demoContentEnabled } from "@/config/editorial";

/** Identifies environments where fictional editorial demonstration content is visible. */
export function DemoContentNotice() {
  if (!demoContentEnabled) return null;

  return (
    <aside
      role="status"
      className="border-b border-border bg-muted px-4 py-2 text-center text-sm text-foreground"
    >
      Ambiente de demonstração: o conteúdo editorial exibido é fictício e não deve ser citado como
      notícia.
    </aside>
  );
}
