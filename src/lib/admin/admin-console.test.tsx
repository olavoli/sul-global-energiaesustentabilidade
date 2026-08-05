import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";

import { getAuthor } from "@/data/authors";
import { getArticleBySlug, getPublishedArticles } from "@/content/repository";
import { applyHumanDecision } from "../../../scripts/newsroom/decision-actions";
import { prepareSourceAdd } from "../../../scripts/newsroom/catalog";
import { clusterQueue } from "../../../scripts/newsroom/clustering";
import { loadDecisions } from "../../../scripts/newsroom/decision-store";
import { executeDailyPipeline } from "../../../scripts/newsroom/daily-pipeline";
import { loadInbox, updateInboxEntry } from "../../../scripts/newsroom/review-inbox";
import { updateQuarantine } from "../../../scripts/newsroom/quarantine";
import { loadCatalog } from "../../../scripts/newsroom/catalog";
import { loadQueue } from "../../../scripts/newsroom/queue";
import { reviewTranslation } from "../../../scripts/newsroom/translation";
import { loadTranslations } from "../../../scripts/newsroom/translation";
import { AdminJson } from "@/components/admin/AdminJson";
import { AdminLoading } from "@/components/admin/AdminStates";
import { executeAdminAction } from "./actions";
import { createSessionToken } from "./auth";
import { dashboardData, sectionData } from "./data";
import { handleAdminRequest } from "./handler";

const secret = "segredo-local-forte-para-testes";

describe("Sprint 17 — Central Editorial", () => {
  test("14. dashboard não expõe snippets integrais", async () => {
    expect(JSON.stringify(await dashboardData({}))).not.toContain("contentSnippet");
  });

  test("15. inbox lista dados", async () => {
    expect((await sectionData("inbox", {})) as unknown[]).toHaveLength(30);
  });

  test("16. filtro de risco funciona", async () => {
    const inbox = await loadInbox();
    expect(inbox.filter(({ risk }) => risk === "high")).toHaveLength(9);
  });

  test("17. abrir item persiste histórico no modelo", async () => {
    const entry = (await loadInbox())[0];
    const next = updateInboxEntry(entry, "opened", "fundador", "", "2026-07-16T12:00:00Z");
    expect(next.history.at(-1)?.action).toBe("opened");
  });

  test("18. ação sem nota falha", async () => {
    const decision = (await loadDecisions())[0];
    expect(() =>
      applyHumanDecision(decision, "monitor", "fundador", "", "2026-07-16T12:00:00Z"),
    ).toThrow("notes");
  });

  test("19. ação sem ator falha", async () => {
    const decision = (await loadDecisions())[0];
    expect(() =>
      applyHumanDecision(decision, "monitor", "", "nota", "2026-07-16T12:00:00Z"),
    ).toThrow("actor");
  });

  test("20. decisão não publica", async () => {
    const before = getPublishedArticles().map(({ slug }) => slug);
    const decision = (await loadDecisions())[0];
    expect(() =>
      applyHumanDecision(decision, "publish" as never, "fundador", "nota", "2026-07-16T12:00:00Z"),
    ).not.toThrow();
    expect(getPublishedArticles().map(({ slug }) => slug)).toEqual(before);
  });

  test("21. approve-for-pitch não cria artigo", async () => {
    const before = getPublishedArticles().length;
    const decision = { ...(await loadDecisions())[0], blockers: [] };
    applyHumanDecision(
      decision,
      "approve-for-pitch",
      "fundador",
      "aprovação",
      "2026-07-16T12:00:00Z",
    );
    expect(getPublishedArticles()).toHaveLength(before);
  });

  test("22. tradução não sobrescreve original", async () => {
    const entry = (await loadTranslations())[0];
    const reviewed = reviewTranslation(
      entry,
      "reject",
      "fundador",
      "revisar",
      "2026-07-16T12:00:00Z",
    );
    expect(reviewed.sourceText).toBe(entry.sourceText);
  });

  test("23. cluster usa lógica de domínio existente", async () => {
    const [queue, catalog] = await Promise.all([loadQueue(), loadCatalog()]);
    expect(clusterQueue(queue, catalog, "2026-07-16T12:00:00Z")).toHaveLength(30);
  });

  test("24. fonte sem evidência não é ativada", async () => {
    const catalog = await loadCatalog();
    const candidate = { ...catalog[0], id: "fonte-sem-evidencia", evidenceId: undefined };
    expect(() => prepareSourceAdd(candidate, catalog)).toThrow("evidência");
  });

  test("25. quarentena não entra diretamente na fila", () => {
    expect(() => updateQuarantine([], "ausente", "retry")).toThrow();
  });

  test("26. run dry-run pode ser iniciado", async () => {
    const result = await executeDailyPipeline({
      mode: "validate-only",
      actor: "teste-console",
      now: new Date("2026-07-16T12:00:00Z"),
      env: {},
    });
    expect(result.run.dryRun).toBe(true);
  });

  test("27. apply completo está bloqueado", async () => {
    await expect(
      executeAdminAction({ action: "pipeline:apply", actor: "fundador", note: "", values: {} }),
    ).rejects.toThrow("Apply completo");
  });

  test("28. dados operacionais não aparecem em rota pública", async () => {
    const source = await readFile("src/routes/index.tsx", "utf8");
    expect(source).not.toContain("newsroom/");
  });

  test("30. ID inexistente retorna 404 privado", async () => {
    const created = await createSessionToken(secret, "fundador");
    const response = await handleAdminRequest(
      new Request("http://localhost/api/admin/runs/run-0000000000000000", {
        headers: { cookie: `newsroom_admin=${created.token}` },
      }),
      { NEWSROOM_ADMIN_SECRET: secret },
    );
    expect(response?.status).toBe(404);
  });

  test("31. erros não expõem caminho local", async () => {
    const created = await createSessionToken(secret, "fundador");
    const response = await handleAdminRequest(
      new Request("http://localhost/api/admin/actions", {
        method: "POST",
        headers: {
          cookie: `newsroom_admin=${created.token}`,
          "content-type": "application/json",
          "x-csrf-token": created.session.csrf,
        },
        body: JSON.stringify({ action: "ação-inválida", actor: "fundador", note: "" }),
      }),
      { NEWSROOM_ADMIN_SECRET: secret },
    );
    expect(await response?.text()).not.toContain("C:\\");
  });

  test("32. acessibilidade básica passa", () => {
    const html = renderToStaticMarkup(<AdminLoading />);
    expect(html).toContain('role="status"');
  });

  test("33. navegação por teclado possui foco visível", async () => {
    const css = await readFile("src/styles.css", "utf8");
    expect(css).toContain(":focus-visible");
  });

  test("34. menu mobile funciona por diálogo modal", async () => {
    const source = await readFile("src/components/admin/AdminShell.tsx", "utf8");
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain("setOpen(false)");
  });

  test("34.1 seções administrativas são irmãs do dashboard no routeTree", async () => {
    const routeTree = await readFile("src/routeTree.gen.ts", "utf8");
    const sectionRoute = routeTree.slice(
      routeTree.indexOf("const AdminNewsroomSectionRoute ="),
      routeTree.indexOf("const AdminNewsroomSectionIdRoute ="),
    );

    expect(sectionRoute).toContain("path: '/admin/newsroom/$section'");
    expect(sectionRoute).toContain("getParentRoute: () => rootRouteImport");
    expect(sectionRoute).not.toContain("getParentRoute: () => AdminNewsroomRoute");
  });

  test("35. nenhuma publicação é possível", async () => {
    const source = await readFile("src/lib/admin/actions.ts", "utf8");
    expect(source).not.toContain("content:status");
    expect(source).not.toContain("published");
  });

  test("36. Olavo público continua funcionando", () => {
    expect(getAuthor("olavo-oliveira")?.status).toBe("verified");
  });

  test("37. artigo piloto continua invisível", async () => {
    expect(getPublishedArticles().some(({ slug }) => slug.includes("rascunho"))).toBe(false);
    expect(
      await getArticleBySlug("rascunho-como-funciona-matriz-eletrica-brasileira"),
    ).toBeUndefined();
  });

  test("evidências estruturadas são legíveis sem HTML arbitrário", () => {
    const html = renderToStaticMarkup(<AdminJson value={{ risco: "high", fontes: ["NASA"] }} />);
    expect(html).toContain("NASA");
    expect(html).not.toContain("<script");
  });
});
