import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { X } from "lucide-react";
import { primaryNav } from "./nav-items";

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu de navegação"
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <span className="font-serif text-xl font-bold">Menu</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-4 py-6">
        <ul className="flex flex-col divide-y divide-border">
          {primaryNav.map((item) => (
            <li key={item.label}>
              <Link
                to={item.to}
                params={item.params}
                onClick={onClose}
                className="block py-4 font-serif text-2xl font-semibold text-foreground"
              >
                {item.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              to="/busca"
              onClick={onClose}
              className="block py-4 font-serif text-2xl font-semibold text-foreground"
            >
              Busca
            </Link>
          </li>
          <li>
            <Link
              to="/sobre"
              onClick={onClose}
              className="block py-4 font-serif text-2xl font-semibold text-foreground"
            >
              Sobre
            </Link>
          </li>
          <li>
            <Link
              to="/contato"
              onClick={onClose}
              className="block py-4 font-serif text-2xl font-semibold text-foreground"
            >
              Contato
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
