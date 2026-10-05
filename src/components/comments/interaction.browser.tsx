// Local browser regression harness: actual mounted React components, no new test framework.
import { act } from "react";
import { createRoot } from "react-dom/client";
import { createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { CommentsSection } from "./CommentsSection";
import type { PublicComment } from "@/lib/comments/repository";

const host = document.getElementById("comments-fixture")!;
const results = document.getElementById("results")!;
const root = createRoot(host);
const base = "/api/articles/o-que-e-energia/comments";
const comment = (
  id: string,
  parent: string | null = null,
  rootId: string | null = null,
): PublicComment => ({
  id,
  publicName: `Autor ${id}`,
  bodyText: `Texto ${id}`,
  approvedAt: "2026-01-01T00:00:00.000Z",
  publishedAt: "2026-01-01T00:00:00.000Z",
  parentCommentId: parent,
  rootCommentId: rootId,
  replyingTo: parent ? `Autor ${parent}` : null,
  likes: 0,
  dislikes: 0,
  viewerReaction: null,
});
const A = comment("A"),
  B = comment("B", "A", "A"),
  C = comment("C", "B", "A"),
  D = comment("D", "C", "A");
type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;
const response = (items: PublicComment[], extra: object = {}) =>
  Response.json({ items, turnstileSiteKey: "local-test", ...extra });
let requestHandler: Handler;
window.fetch = (async (url, init) => requestHandler(String(url), init)) as typeof fetch;
const tokens = new Map<string, (token: string) => void>();
window.turnstile = {
  render: (container, options) => {
    const id = crypto.randomUUID();
    tokens.set(id, options.callback);
    container.textContent = "Verificação de segurança simulada somente nesta fixture";
    queueMicrotask(() => options.callback("local-token"));
    return id;
  },
  reset: (id) => {
    if (id) queueMicrotask(() => tokens.get(id)?.("local-token"));
  },
  remove: (id) => {
    tokens.delete(id);
  },
};
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;
function tree(key: string) {
  const parent = createRootRoute({
    component: () => <CommentsSection key={key} articleSlug="o-que-e-energia" />,
  });
  const index = createRoute({ getParentRoute: () => parent, path: "/", component: () => null });
  return <RouterProvider router={createRouter({ routeTree: parent.addChildren([index]) })} />;
}
async function settle(action?: () => void) {
  await act(async () => {
    action?.();
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}
async function mount(handler: Handler) {
  requestHandler = handler;
  await settle(() => root.render(tree(crypto.randomUUID())));
  await settle();
}
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
function button(text: string, scope: ParentNode = host) {
  const found = [...scope.querySelectorAll<HTMLButtonElement>("button")].find(
    (el) => el.textContent?.trim() === text,
  );
  assert(found, `Botão ausente: ${text}`);
  return found;
}
function entry(id: string) {
  const found = [...host.querySelectorAll<HTMLLIElement>("li")].find(
    (el) => el.querySelector(":scope > div > p")?.textContent === `Autor ${id}`,
  );
  assert(found, `Entrada ausente: ${id}`);
  return found;
}
function fill(form: HTMLFormElement, name: string, value: string) {
  const el = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement;
  const prototype =
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}
async function submit(form: HTMLFormElement) {
  await settle(() => {
    fill(form, "publicName", "Pessoa local");
    fill(form, "email", "local@example.com");
    fill(form, "bodyText", "Contribuição local");
    (form.elements.namedItem("consentAccepted") as HTMLInputElement).click();
  });
  await settle(() => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
}
async function run() {
  const passed: string[] = [];
  const check = async (name: string, test: () => Promise<void>) => {
    await test();
    passed.push(name);
    results.textContent = passed.map((value) => `PASS: ${value}`).join("\n");
  };
  try {
    await check("erro inicial visível e retry real", async () => {
      let fail = true;
      await mount(() =>
        fail ? Response.json({ error: "falha" }, { status: 503 }) : response([A]),
      );
      assert(host.querySelector('[role="alert"]'), "Erro não exibido");
      fail = false;
      await settle(() => button("Tentar novamente").click());
      entry("A");
    });
    await check("publicação imediata na lista montada", async () => {
      await mount((_url, init) =>
        init?.method === "POST"
          ? Response.json({ comment: comment("novo") }, { status: 201 })
          : response([A]),
      );
      await submit(host.querySelector("form")!);
      entry("novo");
      assert(host.textContent?.includes("Comentário publicado."), "Sem confirmação");
    });
    await check("primeira leitura falha, retry específico recupera respostas", async () => {
      let fail = true;
      await mount((url) =>
        url.includes("/A/replies")
          ? fail
            ? Response.json({ error: "falha" }, { status: 503 })
            : response([B])
          : response([A]),
      );
      await settle(() => button("Ver respostas", entry("A")).click());
      assert(entry("A").querySelector('[role="alert"]'), "Erro de tópico não exibido");
      fail = false;
      await settle(() => button("Tentar novamente as respostas", entry("A")).click());
      entry("B");
    });
    await check("tópicos independentes e tópico vazio", async () => {
      let release: () => void = () => undefined;
      await mount((url) =>
        url.includes("/A/replies")
          ? new Promise((resolve) => {
              release = () => resolve(Response.json({ error: "falha" }, { status: 503 }));
            })
          : url.includes("/X/replies")
            ? response([comment("Y", "X", "X")])
            : url.includes("/Z/replies")
              ? response([])
              : response([A, comment("X"), comment("Z")]),
      );
      await settle(() => button("Ver respostas", entry("A")).click());
      await settle(() => button("Ver respostas", entry("X")).click());
      entry("Y");
      await settle(() => button("Ver respostas", entry("Z")).click());
      assert(
        ![...entry("Z").querySelectorAll("button")].some(
          (el) => el.textContent === "Ver respostas",
        ),
        "Vazio não concluído",
      );
      await settle(() => release());
      button("Tentar novamente as respostas", entry("A"));
    });
    await check("resposta imediata não mascara falha da primeira leitura", async () => {
      let fail = true;
      await mount((url, init) =>
        init?.method === "POST"
          ? Response.json({ comment: D }, { status: 201 })
          : url.includes("/A/replies")
            ? fail
              ? Response.json({ error: "falha" }, { status: 503 })
              : response([B, C, D])
            : response([A]),
      );
      await settle(() => button("Responder", entry("A")).click());
      await submit(entry("A").querySelector("form")!);
      entry("D");
      fail = false;
      await settle(() => button("Tentar novamente as respostas", entry("A")).click());
      const list = entry("B").parentElement;
      assert(
        entry("C").parentElement === list && entry("D").parentElement === list,
        "Indentação não plana",
      );
      assert(list?.querySelectorAll("ul").length === 0, "Lista aninhada inesperada");
    });
    await check("troca e remoção de reação atualizam interface", async () => {
      await mount((_url, init) =>
        init?.method === "PUT"
          ? Response.json({
              comment: {
                ...A,
                likes: JSON.parse(String(init.body)).value === "like" ? 1 : 0,
                dislikes: JSON.parse(String(init.body)).value === "dislike" ? 1 : 0,
                viewerReaction: JSON.parse(String(init.body)).value,
              },
            })
          : init?.method === "DELETE"
            ? Response.json({ comment: A })
            : response([A]),
      );
      await settle(() => button("👍 Gostei 0", entry("A")).click());
      button("👍 Gostei 1", entry("A"));
      await settle(() => button("👎 Não gostei 0", entry("A")).click());
      button("👍 Gostei 0", entry("A"));
      await settle(() => button("👎 Não gostei 1", entry("A")).click());
      button("👎 Não gostei 0", entry("A"));
    });
    await check("retry geral reinicializa tópico incompleto", async () => {
      await mount((url) =>
        url.includes("/replies") || url.includes("cursor=")
          ? Response.json({ error: "falha" }, { status: 503 })
          : response([A], { cursor: "next" }),
      );
      await settle(() => button("Ver respostas", entry("A")).click());
      await settle(() => button("Mais comentários").click());
      await settle(() => button("Tentar novamente").click());
      button("Ver respostas", entry("A"));
      assert(!entry("A").querySelector('[role="alert"]'), "Erro antigo mantido");
    });
    results.textContent += `\nTOTAL: ${passed.length} PASS; 0 FAIL`;
    await mount((url) =>
      url.includes("/replies") ? response([B, C, D]) : response([A, comment("X"), comment("Z")]),
    );
    await settle(() => button("Ver respostas", entry("A")).click());
  } catch (error) {
    results.textContent += `\nFAIL: ${error instanceof Error ? error.message : String(error)}`;
  }
}
document.getElementById("run-tests")!.addEventListener("click", () => {
  void run();
});
void mount((url) => (url.includes("/replies") ? response([B, C, D]) : response([A])));
