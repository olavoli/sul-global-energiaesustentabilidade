import type { PublicComment } from "@/lib/comments/repository";

export async function commentRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...init.headers },
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Não foi possível concluir a ação.");
  return payload;
}

export function mergeComments(
  current: PublicComment[],
  incoming: PublicComment[],
): PublicComment[] {
  const values = new Map(current.map((comment) => [comment.id, comment]));
  for (const comment of incoming) values.set(comment.id, comment);
  return [...values.values()];
}
