import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminRequest } from "@/components/admin/admin-api";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Acesso à Central Editorial — Sul Global" },
      { name: "robots", content: "noindex, nofollow, noarchive" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const [actor, setActor] = useState("");
  const [secret, setSecret] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await adminRequest("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ actor, secret }),
      });
      window.location.assign("/admin/newsroom");
    } catch {
      setMessage("Não foi possível autenticar. Verifique os dados e tente novamente.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main id="conteudo-admin" className="grid min-h-dvh place-items-center bg-muted/40 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="overline text-primary">Sul Global</p>
          <CardTitle className="font-serif text-2xl">Acesso à Central Editorial</CardTitle>
          <p className="text-sm text-muted-foreground">
            Área operacional privada. A sessão não é lembrada permanentemente.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="actor">Identificação do operador</Label>
              <Input
                id="actor"
                autoComplete="username"
                required
                value={actor}
                onChange={(event) => setActor(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="secret">Credencial administrativa</Label>
              <Input
                id="secret"
                type="password"
                autoComplete="current-password"
                required
                value={secret}
                onChange={(event) => setSecret(event.target.value)}
              />
            </div>
            {message && (
              <p role="alert" className="text-sm text-destructive">
                {message}
              </p>
            )}
            <Button className="w-full" type="submit" disabled={busy}>
              {busy ? "Verificando…" : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
