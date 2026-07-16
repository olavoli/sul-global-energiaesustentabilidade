import { useCallback, useEffect, useState } from "react";

import { adminRequest, type AdminSessionView } from "./admin-api";

export function useAdminData<T>(path: string): {
  data?: T;
  session?: AdminSessionView;
  loading: boolean;
  error?: string;
  reload: () => void;
} {
  const [data, setData] = useState<T>();
  const [session, setSession] = useState<AdminSessionView>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      adminRequest<AdminSessionView>("/api/admin/session"),
      adminRequest<{ data: T }>(path),
    ])
      .then(([nextSession, payload]) => {
        if (!active) return;
        setSession(nextSession);
        setData(payload.data);
        setError(undefined);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Falha de leitura.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, version]);

  return { data, session, loading, error, reload };
}
