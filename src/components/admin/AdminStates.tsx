export function AdminLoading() {
  return (
    <div role="status" className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
      Carregando dados operacionais…
    </div>
  );
}

export function AdminError({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-md border border-destructive bg-card p-6">
      <h2 className="font-semibold">Não foi possível carregar</h2>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function AdminEmpty({ message = "Nenhum registro disponível." }: { message?: string }) {
  return (
    <div className="rounded-md border border-dashed bg-card p-8 text-center text-muted-foreground">
      {message}
    </div>
  );
}
