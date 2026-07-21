export interface AdminSessionView {
  actor: string;
  csrf: string;
  expiresAt: number;
}

export async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const payload = (await response.json()) as { error?: string } & T;
  if (response.status === 401) {
    window.location.assign("/admin/login");
    throw new Error("Sessão expirada.");
  }
  if (!response.ok) throw new Error(payload.error ?? "Operação indisponível.");
  return payload;
}

export async function adminAction(
  session: AdminSessionView,
  action: string,
  id?: string,
  note = "",
  values: Record<string, string | string[]> = {},
): Promise<unknown> {
  return adminRequest("/api/admin/actions", {
    method: "POST",
    headers: { "x-csrf-token": session.csrf },
    body: JSON.stringify({ action, id, actor: session.actor, note, values }),
  });
}
