import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { NewsletterCTA } from "./NewsletterCTA";

describe("CTA real da newsletter", () => {
  test("preserva conteúdo editorial, consentimento, honeypot e acessibilidade", async () => {
    const root = createRootRoute({ component: NewsletterCTA });
    const index = createRoute({ getParentRoute: () => root, path: "/" });
    const router = createRouter({
      routeTree: root.addChildren([index]),
      history: createMemoryHistory(),
    });
    await router.load();
    const html = renderToStaticMarkup(<RouterProvider router={router} />);
    expect(html).toContain("Newsletter Sul Global");
    expect(html).toContain("Energia e sustentabilidade explicadas para todos.");
    expect(html).toContain('id="newsletter-email"');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('name="website"');
    expect(html).toContain("Política de Privacidade");
  });

  test("implementa loading, success e error sem mensagem de simulação", () => {
    const source = readFileSync(new URL("./NewsletterCTA.tsx", import.meta.url), "utf8");
    expect(source).toContain('{ kind: "submitting" }');
    expect(source).toContain('{ kind: "success"; message: string }');
    expect(source).toContain('{ kind: "error"; message: string }');
    expect(source).toContain("Confira sua caixa de entrada para confirmar sua inscrição.");
    expect(source).not.toContain("nenhum e-mail foi cadastrado");
    expect(source).toContain("action: TURNSTILE_ACTION");
  });
});
