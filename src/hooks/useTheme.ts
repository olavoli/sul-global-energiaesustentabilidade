import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "sul-global-theme";

function readInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initial = readInitialTheme();
    setTheme(initial);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, ready]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return { theme, toggle, ready };
}
