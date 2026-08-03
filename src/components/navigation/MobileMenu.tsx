import { Link } from "@tanstack/react-router";
import { useEffect, useRef, type RefObject } from "react";
import { X } from "lucide-react";
import { primaryNav } from "./nav-items";

export function MobileMenu({
  open,
  onClose,
  returnFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLButtonElement | null>;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    const returnFocusTarget = returnFocusRef?.current;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      returnFocusTarget?.focus();
    };
  }, [open, onClose, returnFocusRef]);

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      id="mobile-navigation-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-navigation-title"
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <span id="mobile-navigation-title" className="font-serif text-xl font-bold">
          Menu
        </span>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Fechar menu"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-4 py-6">
        <ul className="flex flex-col divide-y divide-border">
          {primaryNav.slice(0, 6).map((item) => (
            <li key={item.label}>
              <Link
                to={item.to}
                params={item.params}
                onClick={onClose}
                className="block py-4 font-serif text-2xl font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
