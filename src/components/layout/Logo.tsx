import { Link } from "@tanstack/react-router";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      to="/"
      aria-label="Sul Global — página inicial"
      className="group inline-flex items-baseline gap-2"
    >
      <span className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-[1.7rem]">
        Sul<span className="text-primary">Global</span>
      </span>
      {!compact && (
        <span className="hidden overline text-muted-foreground md:inline">Portal Editorial</span>
      )}
    </Link>
  );
}
